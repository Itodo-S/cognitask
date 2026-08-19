import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { success } from "../../utils/helpers.js";

export async function aiRoutes_v2(app: FastifyInstance) {
  // POST /api/v2/ai/plan — full AI planning session
  app.post("/api/v2/ai/plan", async (request, reply) => {
    const { z } = await import("zod");
    const body = z
      .object({
        goal: z.string().min(1).max(2000),
        context: z.string().max(2000).optional(),
        saveTasks: z.boolean().optional().default(false),
      })
      .parse(request.body);

    // Mock AI planning response
    const tasks = [
      { title: `Research: ${body.goal}`, priority: "high", category: "learning", order: 1 },
      { title: `Plan: ${body.goal}`, priority: "high", category: "work", order: 2 },
      { title: `Execute: ${body.goal}`, priority: "urgent", category: "work", order: 3 },
      { title: `Review: ${body.goal}`, priority: "medium", category: "work", order: 4 },
      { title: `Document: ${body.goal}`, priority: "low", category: "work", order: 5 },
    ];

    let savedIds: string[] = [];
    if (body.saveTasks) {
      for (const task of tasks) {
        const todo = await todoService.create({
          title: task.title,
          priority: task.priority as any,
          category: task.category as any,
        });
        savedIds.push(todo.id);
      }
    }

    return reply.send(
      success({
        goal: body.goal,
        tasks,
        savedIds,
        summary: `Plan created with ${tasks.length} tasks for: ${body.goal}`,
      })
    );
  });

  // POST /api/v2/ai/refine — refine a todo with AI suggestions
  app.post("/api/v2/ai/refine", async (request, reply) => {
    const { z } = await import("zod");
    const body = z.object({ todoId: z.string() }).parse(request.body);

    const todo = await todoService.findById(body.todoId);
    if (!todo) return reply.code(404).send({ success: false, error: "Todo not found" });

    return reply.send(
      success({
        original: {
          title: todo.title,
          description: todo.description,
          priority: todo.priority,
          category: todo.category,
        },
        suggestions: {
          improvedTitle: `${todo.title} — refined`,
          suggestedDescription: `Enhanced description for: ${todo.title}`,
          suggestedPriority: "high",
          suggestedCategory: todo.category ?? "work",
          subtasks: [
            { title: `Step 1: ${todo.title}` },
            { title: `Step 2: ${todo.title}` },
            { title: `Step 3: ${todo.title}` },
          ],
        },
      })
    );
  });
}
