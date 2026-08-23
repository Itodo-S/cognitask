import type { AIService } from "../services/ai.service.js";
import type {
  DecomposeRequest,
  DecomposedTodo,
  DecomposeResult,
  SuggestionsPayload,
  RefineResult,
  ChecklistSuggestion,
} from "../types/ai.js";
import type { TodoWithSubtasks, TodoCategory, TodoPriority } from "../types/todo.js";
import { todoService } from "../services/todo.service.js";
import { checklistService } from "../services/checklist.service.js";
import { sessionService } from "../services/session.service.js";
import { message } from "../services/ai/anthropic.client.js";
import { CHAT_SYSTEM } from "../services/ai/prompts.js";
import { buildSnapshot, renderSnapshot } from "../services/ai/context.builder.js";
import { wsGateway } from "../ws/gateway.js";
import { logger } from "../utils/logger.js";

const DAY = 86_400_000;

export interface PlanResult extends Omit<DecomposeResult, "sessionId"> {
  sessionId?: string;
  savedIds?: string[];
  savedTodos?: TodoWithSubtasks[];
}

export class ClaudeOrchestrator {
  constructor(private ai: AIService) {}

  async decomposeGoal(request: DecomposeRequest, autoSave = false): Promise<PlanResult> {
    wsGateway.broadcast("ai:thinking", { message: "Planning your goal…" });

    const generator = this.ai.decompose(request);
    let result: DecomposeResult | null = null;

    for await (const event of generator) {
      wsGateway.broadcast("ai:event", event);
      if (event.type === "complete") result = event.data as DecomposeResult;
    }

    if (!result) throw new Error("Decomposition failed — no result produced");

    let savedIds: string[] | undefined;
    let savedTodos: TodoWithSubtasks[] | undefined;

    if (autoSave) {
      const saved = await this.saveTasks(result.todos);
      savedIds = saved.map((t) => t.id);
      savedTodos = saved;
      wsGateway.broadcast("ai:decomposition_complete", {
        todos: result.todos,
        summary: result.summary,
        savedIds,
      });
    }

    if (result.sessionId) {
      await sessionService
        .create(result.sessionId, `Plan: ${request.goal.slice(0, 60)}`)
        .catch((err) => logger.warn("Session create failed", { error: String(err) }));
    }

    return {
      todos: result.todos,
      summary: result.summary,
      firstAction: result.firstAction,
      assumptions: result.assumptions,
      risks: result.risks,
      totalEstimatedMinutes: result.totalEstimatedMinutes,
      sessionId: result.sessionId,
      savedIds,
      savedTodos,
    };
  }

  /**
   * Persist planned tasks, including their checklists and relative due dates.
   * Tasks that depend on earlier ones become subtasks of their first dependency,
   * so the plan keeps its shape on the page.
   */
  async saveTasks(tasks: DecomposedTodo[], parentId?: string): Promise<TodoWithSubtasks[]> {
    const created: TodoWithSubtasks[] = [];
    const idByIndex = new Map<number, string>();
    const now = Date.now();

    for (const [index, task] of tasks.entries()) {
      const dueDate =
        typeof task.dueOffsetDays === "number"
          ? new Date(now + task.dueOffsetDays * DAY).toISOString()
          : undefined;

      // Anchor to the first already-saved dependency, if any.
      const anchor = task.dependsOn?.find((d) => idByIndex.has(d));
      const resolvedParent = parentId ?? (anchor !== undefined ? idByIndex.get(anchor) : undefined);

      try {
        const todo = await todoService.create({
          title: task.title,
          description: task.description || undefined,
          priority: task.priority as TodoPriority,
          category: task.category as TodoCategory,
          dueDate,
          parentId: resolvedParent,
          tags: task.tags?.length ? task.tags : undefined,
          checklist: task.checklist?.length ? task.checklist : undefined,
        });

        idByIndex.set(index, todo.id);
        created.push(todo);
        wsGateway.broadcast("todo:created", todo);
      } catch (err) {
        logger.error("Failed to save planned task", { title: task.title, error: String(err) });
      }
    }

    return created;
  }

  async chat(
    userMessage: string,
    sessionId?: string,
    history?: Array<{ role: "user" | "assistant"; content: string }>
  ): Promise<{ response: string; sessionId: string }> {
    wsGateway.broadcast("ai:thinking", { message: "Reading your list…" });

    let response: string;

    try {
      const workspace = renderSnapshot(await buildSnapshot(), 30);
      response = await message(
        `THE USER'S CURRENT LIST:\n${workspace}\n\nTHEIR MESSAGE:\n${userMessage}`,
        {
          system: CHAT_SYSTEM,
          maxTokens: 1200,
          temperature: 1,
          history: history?.slice(-8),
        }
      );
      if (!response.trim()) response = "I didn't get a reply from the model — try asking again.";
    } catch (err) {
      logger.error("Claude chat error", { error: String(err) });
      response = "I couldn't reach the model just now. Check the API key and try again.";
    }

    const resolvedSessionId = sessionId ?? crypto.randomUUID();
    if (!sessionId) {
      await sessionService
        .create(resolvedSessionId, `Chat: ${userMessage.slice(0, 50)}`)
        .catch((err) => logger.warn("Session create failed", { error: String(err) }));
    }

    wsGateway.broadcast("ai:response", { response: response.slice(0, 200) });
    return { response, sessionId: resolvedSessionId };
  }

  async getSmartSuggestions(context?: string): Promise<SuggestionsPayload> {
    wsGateway.broadcast("ai:thinking", { message: "Looking over your page…" });
    const payload = await this.ai.suggest({ context });
    wsGateway.broadcast("ai:suggestions", { count: payload.suggestions.length });
    return payload;
  }

  async refineTodo(todoId: string): Promise<{ original: TodoWithSubtasks; suggestions: RefineResult } | null> {
    const todo = await todoService.findById(todoId);
    if (!todo) return null;
    return { original: todo, suggestions: await this.ai.refine(todo) };
  }

  /** Generate checklist lines for a task, optionally writing them straight onto it. */
  async suggestChecklist(
    todoId: string,
    options: { hint?: string; apply?: boolean } = {}
  ): Promise<{ todo: TodoWithSubtasks; suggestion: ChecklistSuggestion } | null> {
    const todo = await todoService.findById(todoId);
    if (!todo) return null;

    const suggestion = await this.ai.generateChecklist(todo, options.hint);

    if (options.apply && suggestion.items.length > 0) {
      await checklistService.createMany(todoId, suggestion.items);
      const updated = await todoService.findById(todoId);
      if (updated) {
        wsGateway.broadcast("checklist:updated", {
          todoId,
          items: updated.checklist ?? [],
          progress: updated.checklistProgress,
          todo: updated,
        });
        return { todo: updated, suggestion };
      }
    }

    return { todo, suggestion };
  }

  async autoCategorize(todoIds: string[]) {
    const results: Array<{ id: string; category: string; confidence: number; reasoning: string }> = [];

    for (const id of todoIds) {
      const todo = await todoService.findById(id);
      if (!todo) continue;

      try {
        const result = await this.ai.categorize({
          title: todo.title,
          description: todo.description ?? undefined,
        });

        const updated = await todoService.update(id, { category: result.category as TodoCategory });
        if (updated) wsGateway.broadcast("todo:updated", updated);

        results.push({
          id,
          category: result.category,
          confidence: result.confidence,
          reasoning: result.reasoning,
        });
      } catch (err) {
        logger.error("Auto-categorize failed", { id, error: String(err) });
      }
    }

    return results;
  }

  async listSessions() {
    return sessionService.findMany();
  }

  async getSessionMessages(sessionId: string) {
    return sessionService.findById(sessionId);
  }
}
