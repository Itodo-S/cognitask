import type { AIService } from "../services/ai.service.js";
import type { DecomposeRequest, DecomposeResult, SuggestRequest } from "../types/ai.js";
import { todoService } from "../services/todo.service.js";
import { aiService } from "../services/ai.service.js";

/**
 * AgentOrchestrator — routes requests to the correct AI service methods
 * and integrates with todo data.
 *
 * ──────────────────────────────────────────────────────────────────────
 *  WHEN YOU ADD THE CLAUDE AGENT SDK:
 *
 *  The orchestrator becomes the main entry point for AI operations:
 *
 *  1. Import { query } from "@anthropic-ai/claude-agent-sdk"
 *  2. Replace this.ai.decompose() with query() calls
 *  3. Pass MCP tools from mcp-server.ts to the query options
 *  4. Stream results back via WebSocket events
 * ──────────────────────────────────────────────────────────────────────
 */
export class AgentOrchestrator {
  constructor(private ai: AIService) {}

  /**
   * Decompose a high-level goal into actionable tasks.
   * Optionally saves the generated tasks to the database.
   */
  async decomposeGoal(
    request: DecomposeRequest,
    autoSave = false
  ): Promise<{
    todos: Array<{
      title: string;
      description: string;
      priority: string;
      category: string;
    }>;
    summary: string;
    savedIds?: string[];
  }> {
    const generator = this.ai.decompose(request);
    let result = null;

    for await (const event of generator) {
      if (event.type === "complete") {
        result = event.data as DecomposeResult;
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
    }

    return { todos: result.todos, summary: result.summary, savedIds };
  }

  /**
   * Get smart suggestions based on current todo state.
   */
  async getSmartSuggestions(context?: string) {
    const { todos } = await todoService.findMany({ limit: 50 });
    const currentTodos = todos.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
    }));

    return this.ai.suggest({ currentTodos, context });
  }

  /**
   * Auto-categorize a set of todos.
   */
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
}

export const agentOrchestrator = new AgentOrchestrator(aiService);
