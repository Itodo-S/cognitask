import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { aiService } from "../../services/ai.service.js";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function smartRoutes(app: FastifyInstance) {
  // POST /api/smart/quick-add — natural language task creation
  app.post("/api/smart/quick-add", async (request, reply) => {
    const body = z.object({ text: z.string().min(1).max(1000) }).parse(request.body);

    // AI categorize and prioritize the natural language input
    const [category, priority] = await Promise.all([
      aiService.categorize({ title: body.text }),
      aiService.prioritize({ title: body.text }),
    ]);

    const estimate = await aiService.estimate({ title: body.text });

    const todo = await todoService.create({
      title: body.text,
      priority: priority.priority,
      category: category.category as any,
      aiMetadata: JSON.stringify({
        aiCategoryConfidence: category.confidence,
        aiPriorityReasoning: priority.reasoning,
        estimatedMinutes: estimate.estimatedMinutes,
        complexity: estimate.complexity,
      }),
    });

    return reply.code(201).send(
      success({
        todo,
        ai: { category, priority, estimate },
      }, "Task created with AI analysis")
    );
  });

  // POST /api/smart/daily-plan — generate today's plan
  app.post("/api/smart/daily-plan", async (_request, reply) => {
    const { todos } = await todoService.findMany({ status: "pending", limit: 50 });

    if (todos.length === 0) {
      return reply.send(success({ plan: [], message: "No pending tasks to plan" }));
    }

    const suggestions = await aiService.suggest({
      currentTodos: todos.map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
    });

    // Sort by priority weight
    const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    const sorted = [...todos].sort(
      (a, b) => (priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0)
    );

    return reply.send(
      success({
        plan: sorted.slice(0, 10),
        suggestions,
        totalPending: todos.length,
      })
    );
  });

  // POST /api/smart/review — generate review of completed work
  app.post("/api/smart/review", async (_request, reply) => {
    const { todos: completed } = await todoService.findMany({
      status: "completed",
      limit: 20,
    });

    return reply.send(
      success({
        completed,
        count: completed.length,
        summary: `You've completed ${completed.length} tasks. Great work!`,
      })
    );
  });

  // POST /api/smart/suggest-next — suggest what to work on next
  app.post("/api/smart/suggest-next", async (_request, reply) => {
    const { todos } = await todoService.findMany({ limit: 50 });
    const pending = todos.filter((t) => t.status === "pending" || t.status === "in_progress");

    const suggestions = await aiService.suggest({
      currentTodos: pending.map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
    });

    return reply.send(success({ suggestions, pendingCount: pending.length }));
  });
}
