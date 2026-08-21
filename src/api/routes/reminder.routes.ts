import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function reminderRoutes(app: FastifyInstance) {
  

  
  app.post<{ Params: { id: string } }>("/api/todos/:id/remind", async (request, reply) => {
    const body = z
      .object({
        remindAt: z.string().datetime(),
        message: z.string().max(500).optional(),
      })
      .parse(request.body);

    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    const reminders: Array<{ remindAt: string; message?: string; triggered: boolean }> =
      meta.reminders ?? [];
    reminders.push({ remindAt: body.remindAt, message: body.message, triggered: false });

    await todoService.update(request.params.id, {
      aiMetadata: JSON.stringify({ ...meta, reminders }),
    } as any);

    return reply.send(success({ todoId: request.params.id, reminders }, "Reminder set"));
  });

  
  app.get<{ Params: { id: string } }>("/api/todos/:id/remind", async (request, reply) => {
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    const reminders = meta.reminders ?? [];

    return reply.send(success({ todoId: request.params.id, reminders }));
  });

  
  app.delete<{ Params: { id: string; index: string } }>(
    "/api/todos/:id/remind/:index",
    async (request, reply) => {
      const todo = await todoService.findById(request.params.id);
      if (!todo) return reply.code(404).send(error("Todo not found"));

      const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
      const reminders = meta.reminders ?? [];
      const idx = Number(request.params.index);

      if (idx < 0 || idx >= reminders.length) {
        return reply.code(404).send(error("Reminder not found"));
      }

      reminders.splice(idx, 1);
      await todoService.update(request.params.id, {
        aiMetadata: JSON.stringify({ ...meta, reminders }),
      } as any);

      return reply.send(success(null, "Reminder removed"));
    }
  );
}
