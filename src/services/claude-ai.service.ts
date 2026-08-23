import { TODO_CATEGORIES, TODO_PRIORITIES } from "../config/constants.js";
import type {
  DecomposeRequest,
  DecomposeResult,
  DecomposedTodo,
  CategorizeRequest,
  CategorizeResult,
  PrioritizeRequest,
  PrioritizeResult,
  SuggestRequest,
  SuggestionResult,
  SuggestionsPayload,
  EstimateRequest,
  EstimateResult,
  RefineResult,
  ChecklistSuggestion,
  PlanRisk,
  AgentEvent,
} from "../types/ai.js";
import type { TodoWithSubtasks } from "../types/todo.js";
import type { AIService } from "./ai.service.js";
import { MockAIService } from "./ai.service.js";
import { anthropic, aiConfigured, structured, message } from "./ai/anthropic.client.js";
import { buildSnapshot, renderSnapshot } from "./ai/context.builder.js";
import {
  DECOMPOSE_SYSTEM,
  decomposeSchema,
  decomposePrompt,
  SUGGEST_SYSTEM,
  suggestSchema,
  suggestPrompt,
  REFINE_SYSTEM,
  refineSchema,
  CHECKLIST_SYSTEM,
  checklistSchema,
} from "./ai/prompts.js";
import { logger } from "../utils/logger.js";
import { describeError } from "../utils/helpers.js";

const VALID_PRIORITIES = new Set<string>(TODO_PRIORITIES);
const VALID_CATEGORIES = new Set<string>(TODO_CATEGORIES);

function coercePriority(value: unknown): DecomposedTodo["priority"] {
  const v = String(value ?? "").toLowerCase();
  return (VALID_PRIORITIES.has(v) ? v : "medium") as DecomposedTodo["priority"];
}

function coerceCategory(value: unknown): string {
  const v = String(value ?? "").toLowerCase();
  return VALID_CATEGORIES.has(v) ? v : "other";
}

function coerceStrings(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0 && v.length <= 500)
    .slice(0, max);
}

function coerceMinutes(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.round(n), 60 * 24 * 14);
}

/** Trust nothing the model returns — normalise every field before it reaches the DB. */
function normalizeTasks(raw: unknown, goal: string, maxTasks: number): DecomposedTodo[] {
  const list = Array.isArray(raw) ? raw : [];

  const tasks = list
    .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === "object")
    .map((t, index) => {
      const title = String(t.title ?? "").trim();
      const checklist = coerceStrings(t.checklist, 8);

      // A one-line checklist that just echoes the title is noise, not structure.
      const meaningfulChecklist =
        checklist.length >= 2 &&
        !(checklist.length === 1 && checklist[0]?.toLowerCase() === title.toLowerCase())
          ? checklist
          : [];

      const dependsOn = Array.isArray(t.dependsOn)
        ? t.dependsOn
            .map((d) => Number(d))
            .filter((d) => Number.isInteger(d) && d >= 0 && d < list.length && d !== index)
        : [];

      const dueOffsetRaw = Number(t.dueOffsetDays);
      const dueOffsetDays =
        t.dueOffsetDays === null || !Number.isFinite(dueOffsetRaw)
          ? null
          : Math.max(0, Math.round(dueOffsetRaw));

      return {
        title: title.slice(0, 200),
        description: String(t.description ?? "").trim().slice(0, 2000),
        priority: coercePriority(t.priority),
        category: coerceCategory(t.category),
        estimatedMinutes: coerceMinutes(t.estimatedMinutes),
        checklist: meaningfulChecklist,
        dependsOn,
        dueOffsetDays,
        tags: coerceStrings(t.tags, 3).map((s) => s.toLowerCase()),
      } satisfies DecomposedTodo;
    })
    .filter((t) => t.title.length > 0)
    .slice(0, maxTasks);

  if (tasks.length > 0) return tasks;

  return [
    {
      title: goal.slice(0, 200),
      description: "The planner returned nothing usable — this is the raw goal, ready to break down by hand.",
      priority: "medium",
      category: "other",
      checklist: [],
      dependsOn: [],
      dueOffsetDays: null,
      tags: [],
    },
  ];
}

function normalizeSuggestions(raw: unknown, knownIds: Set<string>): SuggestionResult[] {
  const list = Array.isArray(raw) ? raw : [];
  const validKinds = new Set(["next_action", "unblock", "break_down", "new_task", "defer", "cleanup"]);

  return list
    .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object")
    .map((s) => {
      const relatedTodoId =
        typeof s.relatedTodoId === "string" && knownIds.has(s.relatedTodoId) ? s.relatedTodoId : null;
      const confidence = Number(s.confidence);

      return {
        kind: (validKinds.has(String(s.kind)) ? String(s.kind) : "next_action") as SuggestionResult["kind"],
        title: String(s.title ?? "").trim().slice(0, 200),
        description: String(s.description ?? "").trim().slice(0, 1000),
        reason: String(s.reason ?? "").trim().slice(0, 1000),
        priority: coercePriority(s.priority),
        category: coerceCategory(s.category),
        estimatedMinutes: coerceMinutes(s.estimatedMinutes),
        checklist: coerceStrings(s.checklist, 6),
        relatedTodoId,
        confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0.6,
      } satisfies SuggestionResult;
    })
    .filter((s) => s.title.length > 0)
    .slice(0, 5);
}

export class ClaudeAIService implements AIService {
  async *decompose(request: DecomposeRequest): AsyncGenerator<AgentEvent, DecomposeResult> {
    const maxTasks = Math.min(Math.max(request.maxTasks ?? 6, 1), 20);

    yield { type: "thinking", data: { message: "Reading your current page…" } };

    let workspace = "No workspace data available.";
    try {
      workspace = renderSnapshot(await buildSnapshot(), 25);
    } catch (err) {
      logger.warn("Snapshot failed for decompose", { error: describeError(err) });
    }

    yield { type: "thinking", data: { message: "Working out the order things have to happen in…" } };

    const result = await structured<{
      summary?: string;
      assumptions?: unknown;
      firstAction?: string;
      risks?: unknown;
      tasks?: unknown;
    }>(decomposePrompt({ goal: request.goal, context: request.context, maxTasks, workspace }), {
      system: DECOMPOSE_SYSTEM,
      toolName: "write_plan",
      toolDescription: "Record the finished plan for the user's goal.",
      schema: decomposeSchema,
      maxTokens: 8000,
      temperature: 1,
      fallback: {},
    });

    const todos = normalizeTasks(result.tasks, request.goal, maxTasks);

    yield { type: "task_generated", data: { count: todos.length } };

    const risks: PlanRisk[] = Array.isArray(result.risks)
      ? result.risks
          .filter((r: any) => r && typeof r === "object" && r.risk)
          .map((r: any) => ({
            risk: String(r.risk).slice(0, 500),
            mitigation: String(r.mitigation ?? "").slice(0, 500),
          }))
          .slice(0, 3)
      : [];

    const totalEstimatedMinutes = todos.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0);

    const finalResult: DecomposeResult = {
      sessionId: crypto.randomUUID(),
      todos,
      summary:
        String(result.summary ?? "").trim() ||
        `Broke "${request.goal}" into ${todos.length} task${todos.length === 1 ? "" : "s"}.`,
      firstAction: String(result.firstAction ?? "").trim() || undefined,
      assumptions: coerceStrings(result.assumptions, 4),
      risks,
      totalEstimatedMinutes: totalEstimatedMinutes || undefined,
    };

    yield { type: "complete", data: finalResult };
    return finalResult;
  }

  async suggest(request: SuggestRequest): Promise<SuggestionsPayload> {
    let workspace = "";
    let knownIds = new Set<string>();

    try {
      const snapshot = await buildSnapshot();
      workspace = renderSnapshot(snapshot);
      knownIds = new Set(snapshot.todos.map((t) => t.id));
    } catch (err) {
      logger.warn("Snapshot failed for suggest, using request payload", { error: describeError(err) });
      workspace = request.currentTodos?.length
        ? `Tasks:\n${request.currentTodos
            .map((t) => `- [${t.status}] [${t.priority}] ${t.title}`)
            .join("\n")}`
        : "No tasks on the page.";
    }

    const result = await structured<{
      briefing?: string;
      focusTodoId?: string | null;
      focusReason?: string | null;
      suggestions?: unknown;
    }>(suggestPrompt({ workspace, context: request.context }), {
      system: SUGGEST_SYSTEM,
      toolName: "write_suggestions",
      toolDescription: "Record what is actually worth telling the user about their list right now.",
      schema: suggestSchema,
      maxTokens: 4000,
      temperature: 1,
      fallback: {},
    });

    const suggestions = normalizeSuggestions(result.suggestions, knownIds);
    const focusTodoId =
      typeof result.focusTodoId === "string" && knownIds.has(result.focusTodoId)
        ? result.focusTodoId
        : null;

    return {
      briefing: String(result.briefing ?? "").trim() || "Here's what stands out on your page.",
      focusTodoId,
      focusReason: focusTodoId ? String(result.focusReason ?? "").trim() || null : null,
      suggestions,
    };
  }

  async refine(todo: TodoWithSubtasks): Promise<RefineResult> {
    const existing = todo.checklist?.length
      ? `\nExisting checklist:\n${todo.checklist.map((i) => `- [${i.done ? "x" : " "}] ${i.text}`).join("\n")}`
      : "\nNo checklist yet.";

    const result = await structured<Record<string, unknown>>(
      `Sharpen this task.

Title: "${todo.title}"
Description: ${todo.description ? `"${todo.description}"` : "(none)"}
Priority: ${todo.priority}
Category: ${todo.category ?? "none"}
Due: ${todo.dueDate ?? "not set"}
Status: ${todo.status}${existing}

Keep what already works. Change only what genuinely makes it easier to start.`,
      {
        system: REFINE_SYSTEM,
        toolName: "write_refinement",
        toolDescription: "Record the sharpened version of this task.",
        schema: refineSchema,
        maxTokens: 2000,
        temperature: 1,
        fallback: {},
      }
    );

    const improvedTitle = String(result.improvedTitle ?? "").trim() || todo.title;

    return {
      improvedTitle: improvedTitle.slice(0, 200),
      titleChanged: improvedTitle !== todo.title,
      suggestedDescription: String(result.suggestedDescription ?? todo.description ?? "").slice(0, 2000),
      suggestedPriority: coercePriority(result.suggestedPriority ?? todo.priority),
      suggestedCategory: coerceCategory(result.suggestedCategory ?? todo.category),
      estimatedMinutes: coerceMinutes(result.estimatedMinutes),
      checklist: coerceStrings(result.checklist, 8),
      clarifyingQuestion:
        typeof result.clarifyingQuestion === "string" && result.clarifyingQuestion.trim()
          ? result.clarifyingQuestion.trim().slice(0, 500)
          : null,
      rationale: String(result.rationale ?? "").trim().slice(0, 500) || "Tightened wording and scope.",
    };
  }

  async generateChecklist(todo: TodoWithSubtasks, hint?: string): Promise<ChecklistSuggestion> {
    const result = await structured<{ items?: unknown; note?: string }>(
      `Break this task into tickable lines.

Title: "${todo.title}"
Description: ${todo.description ? `"${todo.description}"` : "(none)"}
Category: ${todo.category ?? "none"}
Priority: ${todo.priority}
${todo.checklist?.length ? `\nAlready has these lines (do not repeat them, add what's missing):\n${todo.checklist.map((i) => `- ${i.text}`).join("\n")}` : ""}
${hint ? `\nThe user added: "${hint}"` : ""}`,
      {
        system: CHECKLIST_SYSTEM,
        toolName: "write_checklist",
        toolDescription: "Record the tickable steps for this task.",
        schema: checklistSchema,
        maxTokens: 1500,
        temperature: 1,
        fallback: { items: [] },
      }
    );

    return {
      items: coerceStrings(result.items, 8),
      note: typeof result.note === "string" ? result.note.trim().slice(0, 300) : undefined,
    };
  }

  async categorize(request: CategorizeRequest): Promise<CategorizeResult> {
    try {
      const result = await structured<Record<string, unknown>>(
        `Task: "${request.title}"\n${request.description ? `Description: "${request.description}"` : ""}`,
        {
          system:
            "You sort tasks into categories by what the task actually involves, not by surface wording. Pick the single best fit and say honestly how sure you are.",
          toolName: "write_category",
          toolDescription: "Record the category for this task.",
          schema: {
            type: "object",
            properties: {
              category: { type: "string", enum: [...TODO_CATEGORIES] },
              confidence: { type: "number", description: "0.0-1.0" },
              reasoning: { type: "string", description: "One short sentence." },
            },
            required: ["category", "confidence", "reasoning"],
          },
          maxTokens: 500,
          fallback: {},
        }
      );

      const confidence = Number(result.confidence);
      return {
        category: coerceCategory(result.category),
        confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0.7,
        reasoning: String(result.reasoning ?? "").trim() || "Categorised by task content.",
      };
    } catch (err) {
      logger.error("Claude categorize error", { error: String(err) });
      return { category: "other", confidence: 0.5, reasoning: "Categorisation failed." };
    }
  }

  async prioritize(request: PrioritizeRequest): Promise<PrioritizeResult> {
    try {
      const others = request.existingTodos?.length
        ? `\nOther open tasks for comparison:\n${request.existingTodos
            .map((t) => `- [${t.priority}] ${t.title}`)
            .join("\n")}`
        : "";

      const result = await structured<Record<string, unknown>>(
        `Task: "${request.title}"
${request.description ? `Description: "${request.description}"` : ""}
${request.dueDate ? `Due: ${request.dueDate}` : "No due date."}
Today: ${new Date().toISOString().slice(0, 10)}${others}`,
        {
          system:
            "You set task priority by consequence of delay, not by how the task is worded. Most tasks are medium. Reserve urgent for things that block other work or have a hard deadline within days. Compare against the other open tasks so priorities stay meaningful relative to each other.",
          toolName: "write_priority",
          toolDescription: "Record the priority for this task.",
          schema: {
            type: "object",
            properties: {
              priority: { type: "string", enum: [...TODO_PRIORITIES] },
              reasoning: { type: "string", description: "One sentence naming the consequence of delay." },
            },
            required: ["priority", "reasoning"],
          },
          maxTokens: 500,
          fallback: {},
        }
      );

      return {
        priority: coercePriority(result.priority),
        reasoning: String(result.reasoning ?? "").trim() || "Standard priority.",
      };
    } catch (err) {
      logger.error("Claude prioritize error", { error: String(err) });
      return { priority: "medium", reasoning: "Prioritisation failed." };
    }
  }

  async estimate(request: EstimateRequest): Promise<EstimateResult> {
    try {
      const result = await structured<Record<string, unknown>>(
        `Task: "${request.title}"\n${request.description ? `Description: "${request.description}"` : ""}`,
        {
          system:
            "You estimate how long a task really takes for a competent person doing it for the first time — including setup, the part that always goes wrong, and the context switch. Be honest rather than optimistic.",
          toolName: "write_estimate",
          toolDescription: "Record the time estimate for this task.",
          schema: {
            type: "object",
            properties: {
              estimatedMinutes: { type: "number" },
              complexity: { type: "string", enum: ["simple", "moderate", "complex"] },
              reasoning: { type: "string", description: "One sentence, naming the part that dominates the time." },
            },
            required: ["estimatedMinutes", "complexity", "reasoning"],
          },
          maxTokens: 500,
          fallback: {},
        }
      );

      const complexity = String(result.complexity ?? "moderate");
      return {
        estimatedMinutes: coerceMinutes(result.estimatedMinutes) ?? 60,
        complexity: (["simple", "moderate", "complex"].includes(complexity)
          ? complexity
          : "moderate") as EstimateResult["complexity"],
        reasoning: String(result.reasoning ?? "").trim() || "Standard task.",
      };
    } catch (err) {
      logger.error("Claude estimate error", { error: String(err) });
      return { estimatedMinutes: 60, complexity: "moderate", reasoning: "Estimation failed." };
    }
  }
}

export function createAIService(): AIService {
  if (aiConfigured()) {
    logger.info("Using ClaudeAIService", { model: anthropic.modelName() });
    return new ClaudeAIService();
  }
  logger.info("Using MockAIService (no ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN set)");
  return new MockAIService();
}

export { message as directMessage };
