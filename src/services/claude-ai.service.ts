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
import { logger } from "../utils/logger.js";

const SDK_OPTIONS: Options = {
  mcpServers: { cognitask: cognitaskMcpServer },
  allowedTools: ["mcp__cognitask__*"],
  permissionMode: (env.CLAUDE_PERMISSION_MODE ?? "bypassPermissions") as Options["permissionMode"],
  allowDangerouslySkipPermissions: true,
  maxTurns: env.CLAUDE_MAX_TURNS,
  model: env.CLAUDE_MODEL,
  cwd: env.CLAUDE_CWD,
};

async function collectResult(messages: AsyncIterable<any>): Promise<{ result: string; sessionId: string | null }> {
  let result = "";
  let sessionId: string | null = null;

  for await (const msg of messages) {
    if (msg.type === "system" && msg.subtype === "init") {
      sessionId = msg.session_id ?? null;
    }
    if (msg.type === "result" && msg.subtype === "success") {
      result = msg.result ?? "";
    }
  }
  return { result, sessionId };
}

export class ClaudeAIService implements AIService {
  async *decompose(request: DecomposeRequest): AsyncGenerator<AgentEvent, DecomposeResult> {
    yield { type: "thinking", data: { message: "Analyzing goal with Claude..." } };

    const maxTasks = request.maxTasks ?? 5;
    const contextBlock = request.context ? `\nAdditional context: ${request.context}` : "";

    const prompt = `You are a task decomposition expert. Analyze this goal and break it into ${maxTasks} actionable, well-structured tasks.

Goal: "${request.goal}"
${contextBlock}

For each task, use the create_todo tool to create it with:
- A clear, specific title
- A helpful description explaining what needs to be done
- An appropriate priority (urgent/high/medium/low) based on importance and dependencies
- A category (work, personal, health, finance, learning, creative, errands, social, or other)
- An estimated due date if applicable

Create tasks in logical order, starting with research/planning and ending with review/follow-up. Make each task actionable and specific to the goal.`;

    let sessionId: string | null = null;
    let resultText = "";

    try {
      const messages = query({
        prompt,
        options: { ...SDK_OPTIONS },
      });

      for await (const msg of messages) {
        if (msg.type === "system" && msg.subtype === "init") {
          sessionId = msg.session_id ?? null;
          yield { type: "thinking", data: { message: "Claude session started", sessionId } };
        }

        if (msg.type === "assistant" && msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === "tool_use") {
              yield { type: "thinking", data: { message: `Calling tool: ${block.name}` } };
            }
          }
        }

        if (msg.type === "result") {
          if (msg.subtype === "success") {
            resultText = msg.result ?? "";
          } else {
            logger.warn("Claude decompose non-success result", { subtype: msg.subtype });
          }
        }
      }
    } catch (err) {
      logger.error("Claude decompose error", { error: String(err) });
      yield { type: "error", data: { message: String(err) } };
    }

    yield { type: "complete", data: { message: "Decomposition complete" } };

    const todos = this.parseDecomposedTodos(resultText, request.goal);
    return {
      sessionId: sessionId ?? crypto.randomUUID(),
      todos,
      summary: resultText || `Decomposed "${request.goal}" into ${todos.length} tasks using Claude.`,
    };
  }

  async categorize(request: CategorizeRequest): Promise<CategorizeResult> {
    const prompt = `Categorize this task into exactly one category. Reply with ONLY valid JSON, no other text.

Task: "${request.title}"
${request.description ? `Description: "${request.description}"` : ""}

Categories: work, personal, health, finance, learning, creative, errands, social, other

Reply format: {"category": "<category>", "confidence": <0.0-1.0>, "reasoning": "<brief reason>"}`;

    try {
      const { result } = await collectResult(query({ prompt, options: { ...SDK_OPTIONS, maxTurns: 3 } }));
      const parsed = this.parseJSON(result);
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
    const prompt = `Prioritize this task. Reply with ONLY valid JSON, no other text.

Task: "${request.title}"
${request.description ? `Description: "${request.description}"` : ""}
${request.dueDate ? `Due: ${request.dueDate}` : ""}
${request.existingTodos?.length ? `Existing tasks: ${JSON.stringify(request.existingTodos)}` : ""}

Reply format: {"priority": "<low|medium|high|urgent>", "reasoning": "<brief reason>"}`;

    try {
      const { result } = await collectResult(query({ prompt, options: { ...SDK_OPTIONS, maxTurns: 3 } }));
      const parsed = this.parseJSON(result);
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

    const prompt = `You are a productivity assistant. Based on the current tasks, suggest 2-3 actionable next steps or improvements.
${todosContext}
${request.context ? `\nContext: ${request.context}` : ""}

Reply with ONLY a valid JSON array, no other text.
Each suggestion: {"title": "...", "description": "...", "priority": "low|medium|high", "category": "...", "reason": "..."}`;

    try {
      const { result } = await collectResult(query({ prompt, options: { ...SDK_OPTIONS, maxTurns: 3 } }));
      const parsed = this.parseJSON(result);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err) {
      logger.error("Claude suggest error", { error: String(err) });
      return [];
    }
  }

  async estimate(request: EstimateRequest): Promise<EstimateResult> {
    const prompt = `Estimate the time and complexity of this task. Reply with ONLY valid JSON, no other text.

Task: "${request.title}"
${request.description ? `Description: "${request.description}"` : ""}

Reply format: {"estimatedMinutes": <number>, "complexity": "<simple|moderate|complex>", "reasoning": "<brief reason>"}`;

    try {
      const { result } = await collectResult(query({ prompt, options: { ...SDK_OPTIONS, maxTurns: 3 } }));
      const parsed = this.parseJSON(result);
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

  private parseJSON(text: string): any {
    const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
    }
    try { return JSON.parse(text); } catch { return {}; }
  }

  private parseDecomposedTodos(text: string, goal: string): DecomposedTodo[] {
    const parsed = this.parseJSON(text);
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
}

export function createAIService(): AIService {
  if (env.ANTHROPIC_API_KEY) {
    logger.info("Using ClaudeAIService (SDK with real API key)");
    return new ClaudeAIService();
  }
  logger.info("Using MockAIService (no ANTHROPIC_API_KEY set)");
  const { MockAIService } = require("./ai.service.js");
  return new MockAIService();
}
