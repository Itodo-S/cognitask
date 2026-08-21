import type { AIService } from "../services/ai.service.js";
import type { DecomposeRequest, DecomposeResult } from "../types/ai.js";
import { todoService } from "../services/todo.service.js";
import { aiService } from "../services/ai.service.js";

export class AgentOrchestrator {
  constructor(private ai: AIService) {}

  
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
}

export const agentOrchestrator = new AgentOrchestrator(aiService);
