import { query, type Options } from "@anthropic-ai/claude-agent-sdk";
import { env } from "../config/env.js";
import { cognitaskMcpServer } from "../agents/sdk-tools.js";
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
  EstimateRequest,
  EstimateResult,
  AgentEvent,
} from "../types/ai.js";
import type { AIService } from "./ai.service.js";
import { MockAIService } from "./ai.service.js";
import { logger } from "../utils/logger.js";

// ── Shared SDK options ──────────────────────────────────────
export const SDK_OPTIONS: Options = {
  mcpServers: { cognitask: cognitaskMcpServer },
  allowedTools: ["mcp__cognitask__*"],
  permissionMode: (env.CLAUDE_PERMISSION_MODE ?? "bypassPermissions") as Options["permissionMode"],
  allowDangerouslySkipPermissions: true,
  maxTurns: env.CLAUDE_MAX_TURNS,
  model: env.CLAUDE_MODEL,
  cwd: env.CLAUDE_CWD,
};

export { query as sdkQuery };

// ── Shared JSON parser ──────────────────────────────────────
function parseJSON(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
  }
  try { return JSON.parse(text); } catch { return {}; }
}

function parseDecomposedTodos(text: string, goal: string): DecomposedTodo[] {
  const parsed = parseJSON(text);
  if (Array.isArray(parsed)) {
    return parsed.map((t: any) => ({
      title: t.title ?? `Task for: ${goal}`,
      description: t.description ?? `Step in achieving: ${goal}`,
      priority: t.priority ?? "medium",
      category: t.category ?? "work",
      estimatedMinutes: t.estimatedMinutes,
    }));
  }
  return [{
    title: `Task: ${goal}`,
    description: `Step in achieving: ${goal}`,
    priority: "medium",
    category: "work",
  }];
}

// ── Collect SDK query result ─────────────────────────────────
async function sdkQueryCollect(
  prompt: string,
  system: string,
  maxTurns: number,
): Promise<string> {
  let result = "";
  const messages = query({
    prompt: `${system}\n\n${prompt}`,
    options: {
      ...SDK_OPTIONS,
      maxTurns,
    },
  });
  for await (const msg of messages) {
    if (msg.type === "result" && msg.subtype === "success") {
      result = msg.result ?? "";
    }
  }
  return result;
}

// ── ClaudeAIService ─────────────────────────────────────────
export class ClaudeAIService implements AIService {
  async *decompose(request: DecomposeRequest): AsyncGenerator<AgentEvent, DecomposeResult> {
    yield { type: "thinking", data: { message: "Analyzing goal..." } };

    const maxTasks = request.maxTasks ?? 5;
    const contextBlock = request.context ? `\nAdditional context: ${request.context}` : "";

    const prompt = `Break this goal into exactly ${maxTasks} actionable tasks. Reply with ONLY a JSON array, no other text.

Goal: "${request.goal}"
${contextBlock}

Each task object must have: title (string), description (string), priority ("low"|"medium"|"high"|"urgent"), category ("work"|"personal"|"health"|"finance"|"learning"|"creative"|"errands"|"social"|"other").

Example: [{"title":"...","description":"...","priority":"medium","category":"work"}]

Create tasks in logical order. Make each task specific and actionable.`;

    let resultText = "";
    try {
      resultText = await sdkQueryCollect(
        prompt,
        "You are a task decomposition expert. Return only valid JSON.",
        1,
      );
    } catch (err) {
      logger.error("Claude decompose error", { error: String(err) });
      yield { type: "error", data: { message: String(err) } };
    }

    yield { type: "complete", data: { message: "Decomposition complete" } };

    const todos = parseDecomposedTodos(resultText, request.goal);
    return {
      sessionId: crypto.randomUUID(),
      todos,
      summary: resultText || `Decomposed "${request.goal}" into ${todos.length} tasks.`,
    };
  }

  async categorize(request: CategorizeRequest): Promise<CategorizeResult> {
    try {
      const result = await sdkQueryCollect(
        `Categorize this task. Reply with ONLY valid JSON.

Task: "${request.title}"
${request.description ? `Description: "${request.description}"` : ""}

Categories: work, personal, health, finance, learning, creative, errands, social, other

Format: {"category": "<category>", "confidence": <0.0-1.0>, "reasoning": "<brief>"}`,
        "Return only valid JSON.",
        1,
      );
      const parsed = parseJSON(result);
      return {
        category: parsed.category ?? "other",
        confidence: parsed.confidence ?? 0.7,
        reasoning: parsed.reasoning ?? "Claude categorization.",
      };
    } catch (err) {
      logger.error("Claude categorize error", { error: String(err) });
      return { category: "other", confidence: 0.5, reasoning: "Error during categorization." };
    }
  }

  async prioritize(request: PrioritizeRequest): Promise<PrioritizeResult> {
    try {
      const result = await sdkQueryCollect(
        `Prioritize this task. Reply with ONLY valid JSON.

Task: "${request.title}"
${request.description ? `Description: "${request.description}"` : ""}
${request.dueDate ? `Due: ${request.dueDate}` : ""}
${request.existingTodos?.length ? `Existing: ${JSON.stringify(request.existingTodos)}` : ""}

Format: {"priority": "<low|medium|high|urgent>", "reasoning": "<brief>"}`,
        "Return only valid JSON.",
        1,
      );
      const parsed = parseJSON(result);
      return {
        priority: parsed.priority ?? "medium",
        reasoning: parsed.reasoning ?? "Claude prioritization.",
      };
    } catch (err) {
      logger.error("Claude prioritize error", { error: String(err) });
      return { priority: "medium", reasoning: "Error during prioritization." };
    }
  }

  async suggest(request: SuggestRequest): Promise<SuggestionResult[]> {
    const todosContext = request.currentTodos?.length
      ? `\nCurrent tasks:\n${request.currentTodos.map((t) => `- [${t.status}] [${t.priority}] ${t.title}`).join("\n")}`
      : "\nNo current tasks.";

    try {
      const result = await sdkQueryCollect(
        `Based on current tasks, suggest 2-3 actionable next steps.
${todosContext}
${request.context ? `\nContext: ${request.context}` : ""}

Reply with ONLY a valid JSON array.
Each: {"title":"...","description":"...","priority":"low|medium|high","category":"...","reason":"..."}`,
        "Return only a valid JSON array.",
        1,
      );
      const parsed = parseJSON(result);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err) {
      logger.error("Claude suggest error", { error: String(err) });
      return [];
    }
  }

  async estimate(request: EstimateRequest): Promise<EstimateResult> {
    try {
      const result = await sdkQueryCollect(
        `Estimate time and complexity. Reply with ONLY valid JSON.

Task: "${request.title}"
${request.description ? `Description: "${request.description}"` : ""}

Format: {"estimatedMinutes": <number>, "complexity": "<simple|moderate|complex>", "reasoning": "<brief>"}`,
        "Return only valid JSON.",
        1,
      );
      const parsed = parseJSON(result);
      return {
        estimatedMinutes: parsed.estimatedMinutes ?? 60,
        complexity: parsed.complexity ?? "moderate",
        reasoning: parsed.reasoning ?? "Claude estimate.",
      };
    } catch (err) {
      logger.error("Claude estimate error", { error: String(err) });
      return { estimatedMinutes: 60, complexity: "moderate", reasoning: "Error during estimation." };
    }
  }
}

export function createAIService(): AIService {
  if (env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN) {
    logger.info("Using ClaudeAIService (Anthropic SDK)");
    return new ClaudeAIService();
  }
  logger.info("Using MockAIService (no ANTHROPIC_API_KEY set)");
  return new MockAIService();
}
