import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { success } from "../../utils/helpers.js";

export async function batchRoutes(app: FastifyInstance) {
  // POST /api/batch/duplicate — batch duplicate
  app.post("/api/batch/duplicate", async (request, reply) => {
    const { z } = await import("zod");
    const body = z
      .object({
        todoIds: z.array(z.string()).min(1).max(20),
        titleSuffix: z.string().optional().default(" (copy)"),
      })
      .parse(request.body);

    const duplicates = [];
    for (const id of body.todoIds) {
      const todo = await todoService.findById(id);
      if (!todo) continue;
      const dup = await todoService.create({
        title: `${todo.title}${body.titleSuffix}`,
        description: todo.description ?? undefined,
        priority: todo.priority,
        category: todo.category as any,
      });
      duplicates.push(dup);
    }

    return reply.code(201).send(success({ duplicates, count: duplicates.length }));
  });

  // POST /api/batch/move — batch move to parent
  app.post("/api/batch/move", async (request, reply) => {
    const { z } = await import("zod");
    const body = z
      .object({
        todoIds: z.array(z.string()).min(1).max(50),
        newParentId: z.string().nullable(),
      })
      .parse(request.body);

    const results = [];
    for (const id of body.todoIds) {
      const todo = await todoService.update(id, { parentId: body.newParentId as any });
      if (todo) results.push(todo);
    }

    return reply.send(success({ moved: results.length }));
  });

  // POST /api/batch/tag — batch add tag
  app.post("/api/batch/tag", async (request, reply) => {
    const { z } = await import("zod");
    const body = z
      .object({
        todoIds: z.array(z.string()).min(1).max(50),
        tagName: z.string().min(1).max(100),
      })
      .parse(request.body);

    const results = [];
    for (const id of body.todoIds) {
      const todo = await todoService.findById(id);
      if (!todo) continue;
      const existingTags = todo.tags?.map((t) => t.name) ?? [];
      if (!existingTags.includes(body.tagName)) {
        const updated = await todoService.update(id, {
          tags: [...existingTags, body.tagName],
        } as any);
        if (updated) results.push(updated);
      }
    }

    return reply.send(success({ tagged: results.length }));
  });
}
