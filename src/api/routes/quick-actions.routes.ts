import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function quickActionsRoutes(app: FastifyInstance) {
  // POST /api/quick/snooze — snooze a todo by days
  app.post("/api/quick/snooze", async (request, reply) => {
    const body = z
      .object({
        todoId: z.string(),
        days: z.number().min(1).max(30).optional().default(1),
      })
      .parse(request.body);

    const todo = await todoService.findById(body.todoId);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + body.days);

    const updated = await todoService.update(body.todoId, {
      dueDate: newDueDate.toISOString(),
    });

    return reply.send(success(updated, `Snoozed for ${body.days} day(s)`));
  });

  // POST /api/quick/defer — defer to tomorrow
  app.post("/api/quick/defer", async (request, reply) => {
    const body = z.object({ todoId: z.string() }).parse(request.body);
    return this.quickActionsRoutes_snooze(app, body.todoId, 1);
  });

  // POST /api/quick/complete-and-next — complete and find next
  app.post("/api/quick/complete-and-next", async (request, reply) => {
    const body = z.object({ todoId: z.string() }).parse(request.body);

    const completed = await todoService.updateStatus(body.todoId, "completed");
    if (!completed) return reply.code(404).send(error("Todo not found"));

    // Find next task by priority
    const { todos: pending } = await todoService.findMany({
      status: "pending",
      limit: 10,
    });

    const next =
      pending.find((t) => t.priority === "urgent") ??
      pending.find((t) => t.priority === "high") ??
      pending[0];

    return reply.send(
      success(
        { completed, next: next ?? null },
        next ? "Completed! Here's your next task." : "All done! No more pending tasks."
      )
    );
  });

  // POST /api/quick/batch-complete — complete multiple at once
  app.post("/api/quick/batch-complete", async (request, reply) => {
    const body = z.object({ todoIds: z.array(z.string()).min(1).max(50) }).parse(request.body);

    const results = [];
    for (const id of body.todoIds) {
      const todo = await todoService.updateStatus(id, "completed");
      if (todo) results.push(todo);
    }

    return reply.send(success({ completed: results.length, todos: results }));
  });
}
