import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function focusRoutes(app: FastifyInstance) {
  
  app.post("/api/focus/start", async (request, reply) => {
    const body = z
      .object({
        todoId: z.string(),
        duration: z.number().min(5).max(480).optional().default(25),
      })
      .parse(request.body);

    const todo = await todoService.findById(body.todoId);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    
    await todoService.updateStatus(body.todoId, "in_progress");

    
    const now = new Date();
    const endTime = new Date(now.getTime() + body.duration * 60 * 1000);

    return reply.send(
      success({
        todo,
        focus: {
          startedAt: now.toISOString(),
          endsAt: endTime.toISOString(),
          durationMinutes: body.duration,
          todoId: body.todoId,
        },
      }, "Focus mode started")
    );
  });

  
  app.post("/api/focus/complete", async (request, reply) => {
    const body = z
      .object({
        todoId: z.string(),
        completed: z.boolean().optional().default(true),
        notes: z.string().max(2000).optional(),
      })
      .parse(request.body);

    if (body.completed) {
      const todo = await todoService.updateStatus(body.todoId, "completed");
      return reply.send(success({ todo, focusCompleted: true }, "Focus session completed — task done!"));
    }

    const todo = await todoService.findById(body.todoId);
    return reply.send(success({ todo, focusCompleted: false, notes: body.notes }, "Focus session ended"));
  });
}
