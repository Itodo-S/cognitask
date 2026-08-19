import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function noteRoutes(app: FastifyInstance) {
  // Notes are stored in aiMetadata

  // POST /api/todos/:id/notes — add note
  app.post<{ Params: { id: string } }>("/api/todos/:id/notes", async (request, reply) => {
    const body = z
      .object({
        content: z.string().min(1).max(5000),
        type: z.enum(["general", "blocker", "decision", "link"]).optional().default("general"),
      })
      .parse(request.body);

    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    const notes: Array<{ content: string; type: string; createdAt: string }> = meta.notes ?? [];
    notes.push({ content: body.content, type: body.type ?? "general", createdAt: new Date().toISOString() });

    await todoService.update(request.params.id, {
      aiMetadata: JSON.stringify({ ...meta, notes }),
    } as any);

    return reply.send(success({ todoId: request.params.id, notes }, "Note added"));
  });

  // GET /api/todos/:id/notes — get notes
  app.get<{ Params: { id: string } }>("/api/todos/:id/notes", async (request, reply) => {
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    const notes = meta.notes ?? [];

    return reply.send(success({ todoId: request.params.id, notes }));
  });

  // DELETE /api/todos/:id/notes/:index — delete note
  app.delete<{ Params: { id: string; index: string } }>(
    "/api/todos/:id/notes/:index",
    async (request, reply) => {
      const todo = await todoService.findById(request.params.id);
      if (!todo) return reply.code(404).send(error("Todo not found"));

      const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
      const notes = meta.notes ?? [];
      const idx = Number(request.params.index);

      if (idx < 0 || idx >= notes.length) {
        return reply.code(404).send(error("Note not found"));
      }

      notes.splice(idx, 1);
      await todoService.update(request.params.id, {
        aiMetadata: JSON.stringify({ ...meta, notes }),
      } as any);

      return reply.send(success(null, "Note removed"));
    }
  );
}
