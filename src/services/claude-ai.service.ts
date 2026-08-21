import { env } from "../config/env.js";
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

async function directMessage(prompt: string, system?: string): Promise<string> {
  const model = env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Anthropic API ${res.status}: ${JSON.stringify(err)}`);
  }

  const data: any = await res.json();
  const block = data.content?.find((b: any) => b.type === "text");
  return block?.text ?? "";
}



function parseJSON(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {  }
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
      resultText = await directMessage(prompt, "You are a task decomposition expert. Return only valid JSON.");
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
      const result = await directMessage(
        `Categorize this task. Reply with ONLY valid JSON.

Task: "${request.title}"
${request.description ? `Description: "${request.description}"` : ""}

Categories: work, personal, health, finance, learning, creative, errands, social, other

Format: {"category": "<category>", "confidence": <0.0-1.0>, "reasoning": "<brief>"}`,
        "Return only valid JSON."
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
      const result = await directMessage(
        `Prioritize this task. Reply with ONLY valid JSON.

Task: "${request.title}"
${request.description ? `Description: "${request.description}"` : ""}
${request.dueDate ? `Due: ${request.dueDate}` : ""}
${request.existingTodos?.length ? `Existing: ${JSON.stringify(request.existingTodos)}` : ""}

Format: {"priority": "<low|medium|high|urgent>", "reasoning": "<brief>"}`,
        "Return only valid JSON."
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
      const result = await directMessage(
        `Based on current tasks, suggest 2-3 actionable next steps.
${todosContext}
${request.context ? `\nContext: ${request.context}` : ""}

Reply with ONLY a valid JSON array.
Each: {"title":"...","description":"...","priority":"low|medium|high","category":"...","reason":"..."}`,
        "Return only a valid JSON array."
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
      const result = await directMessage(
        `Estimate time and complexity. Reply with ONLY valid JSON.

Task: "${request.title}"
${request.description ? `Description: "${request.description}"` : ""}

Format: {"estimatedMinutes": <number>, "complexity": "<simple|moderate|complex>", "reasoning": "<brief>"}`,
        "Return only valid JSON."
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
  if (env.ANTHROPIC_API_KEY) {
    logger.info("Using ClaudeAIService (direct Anthropic API)");
    return new ClaudeAIService();
  }
  logger.info("Using MockAIService (no ANTHROPIC_API_KEY set)");
  return new MockAIService();
}
