import { env } from "../config/env.js";
import type { AIService } from "../services/ai.service.js";
import type { DecomposeRequest } from "../types/ai.js";
import { todoService } from "../services/todo.service.js";
import { sessionService } from "../services/session.service.js";
import { wsGateway } from "../ws/gateway.js";
import { logger } from "../utils/logger.js";

async function directMessage(prompt: string, system?: string): Promise<string> {
  const model = env.ANTHROPIC_MODEL ?? env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514";
  const baseUrl = env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
  const url = baseUrl.endsWith("/") ? `${baseUrl}v1/messages` : `${baseUrl}/v1/messages`;
  const apiKey = env.ANTHROPIC_AUTH_TOKEN ?? env.ANTHROPIC_API_KEY ?? "";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "Authorization": `Bearer ${apiKey}`,
      "anthropic-version": "2023-06-01",
      "User-Agent": "claude-cli/1.0.108 (external, cli)",
      "X-Stainless-Arch": "x64",
      "X-Stainless-Lang": "js",
      "X-Stainless-OS": "Linux",
      "anthropic-beta": "interleaved-thinking-2025-05-14,redact-thinking-2026-02-12,context-management-2025-06-27,prompt-caching-scope-2026-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Anthropic API ${res.status}: ${JSON.stringify(err)}`);
  }

  const data: any = await res.json();
  const block = data.content?.find((b: any) => b.type === "text");
  return block?.text ?? "";
}

export class ClaudeOrchestrator {
  constructor(private ai: AIService) {}

  async decomposeGoal(
    request: DecomposeRequest,
    autoSave = false
  ): Promise<{
    todos: Array<{ title: string; description: string; priority: string; category: string }>;
    summary: string;
    sessionId?: string;
    savedIds?: string[];
  }> {
    wsGateway.broadcast("ai:thinking", { message: "Starting goal decomposition with Claude..." });

    const generator = this.ai.decompose(request);
    let result = null;

    for await (const event of generator) {
      wsGateway.broadcast("ai:event", event);
      if (event.type === "complete") {
        result = event.data as any;
      }
    }

    if (!result) {
      throw new Error("Decomposition failed — no result produced");
    }

    let savedIds: string[] | undefined;
    if (autoSave) {
      savedIds = [];
      for (const t of result.todos) {
        const todo = await todoService.create({
          title: t.title,
          description: t.description,
          priority: t.priority as "low" | "medium" | "high" | "urgent",
          category: t.category as any,
        });
        savedIds.push(todo.id);
      }
      wsGateway.broadcast("ai:decomposition_complete", { todos: result.todos, summary: result.summary });
    }

    if (result.sessionId) {
      await sessionService.create(result.sessionId, `Decompose: ${request.goal}`);
    }

    return {
      todos: result.todos,
      summary: result.summary,
      sessionId: result.sessionId,
      savedIds,
    };
  }

  async chat(message: string, sessionId?: string): Promise<{
    response: string;
    sessionId: string;
  }> {
    wsGateway.broadcast("ai:thinking", { message: "Processing..." });

    let response = "";

    try {
      const { todos, total } = await todoService.findMany({ limit: 50 });
      const todoContext = todos.length > 0
        ? `\n\nCurrent todos (${total} total):\n${todos.map((t) => `- [${t.status}] [${t.priority}] ${t.title}${t.dueDate ? ` (due: ${t.dueDate})` : ""}`).join("\n")}`
        : "\n\nNo todos yet.";

      response = await directMessage(
        `You are a concise AI assistant for a todo app called CogniTask. Answer briefly in 1-3 sentences. Use the todo context provided to answer questions about tasks. If the user asks to create, update, or manage tasks, tell them to use the UI.\n\nUser: ${message}\n\nTodo context:${todoContext}`,
      );
    } catch (err) {
      logger.error("Claude chat error", { error: String(err) });
      response = `Error: ${String(err)}`;
    }

    const resolvedSessionId = sessionId ?? crypto.randomUUID();

    if (!sessionId) {
      await sessionService.create(resolvedSessionId, `Chat: ${message.slice(0, 50)}`);
    }

    wsGateway.broadcast("ai:response", { response: response.slice(0, 200) });

    return { response, sessionId: resolvedSessionId };
  }

  async getSmartSuggestions(context?: string) {
    const { todos } = await todoService.findMany({ limit: 50 });
    const currentTodos = todos.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
    }));
    return this.ai.suggest({ currentTodos, context });
  }

  async autoCategorize(todoIds: string[]) {
    const results: Array<{ id: string; category: string; confidence: number }> = [];

    for (const id of todoIds) {
      const todo = await todoService.findById(id);
      if (!todo) continue;

      try {
        const result = await this.ai.categorize({
          title: todo.title,
          description: todo.description ?? undefined,
        });

        await todoService.update(id, { category: result.category as any });
        results.push({ id, category: result.category, confidence: result.confidence });
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
