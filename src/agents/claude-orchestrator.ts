import { query } from "@anthropic-ai/claude-agent-sdk";
import { env } from "../config/env.js";
import { cognitaskMcpServer } from "./sdk-tools.js";
import type { AIService } from "../services/ai.service.js";
import type { DecomposeRequest, SuggestRequest } from "../types/ai.js";
import { todoService } from "../services/todo.service.js";
import { sessionService } from "../services/session.service.js";
import { wsGateway } from "../ws/gateway.js";
import { logger } from "../utils/logger.js";

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

    let resolvedSessionId = sessionId;

    if (resolvedSessionId) {
      const existing = await sessionService.findByClaudeId(resolvedSessionId);
      if (!existing) {
        await sessionService.create(resolvedSessionId, `Chat: ${message.slice(0, 50)}`);
      }
    }

    let response = "";

    try {
      const messages = query({
        prompt: message,
        options: {
          mcpServers: { cognitask: cognitaskMcpServer },
          allowedTools: ["mcp__cognitask__*"],
          permissionMode: "bypassPermissions",
          allowDangerouslySkipPermissions: true,
          maxTurns: env.CLAUDE_MAX_TURNS,
          model: env.CLAUDE_MODEL,
          continue: !!resolvedSessionId,
          ...(resolvedSessionId ? { sessionId: resolvedSessionId } : {}),
        },
      });

      for await (const msg of messages) {
        if (msg.type === "system" && msg.subtype === "init") {
          resolvedSessionId = msg.session_id ?? resolvedSessionId;
        }

        if (msg.type === "assistant" && msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === "tool_use") {
              wsGateway.broadcast("ai:tool_call", { name: block.name, input: block.input });
            }
          }
        }

        if (msg.type === "result" && msg.subtype === "success") {
          response = msg.result ?? "";
        }
      }
    } catch (err) {
      logger.error("Claude chat error", { error: String(err) });
      response = `Error: ${String(err)}`;
    }

    if (resolvedSessionId && !sessionId) {
      await sessionService.create(resolvedSessionId, `Chat: ${message.slice(0, 50)}`);
    }

    wsGateway.broadcast("ai:response", { response: response.slice(0, 200) });

    return {
      response,
      sessionId: resolvedSessionId ?? crypto.randomUUID(),
    };
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
      const result = await this.ai.categorize({
        title: todo.title,
        description: todo.description ?? undefined,
      });
      await todoService.update(id, { category: result.category as any });
      results.push({ id, category: result.category, confidence: result.confidence });
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
