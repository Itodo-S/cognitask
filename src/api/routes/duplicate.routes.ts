import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function duplicateRoutes(app: FastifyInstance) {
  
  app.post<{ Params: { id: string } }>("/api/todos/:id/duplicate", async (request, reply) => {
    const body = z
      .object({
        titleSuffix: z.string().optional().default(" (copy)"),
        includeSubtasks: z.boolean().optional().default(true),
      })
      .parse(request.body);

    const original = await todoService.findById(request.params.id);
    if (!original) return reply.code(404).send(error("Original todo not found"));

    
    const duplicate = await todoService.create({
      title: `${original.title}${body.titleSuffix}`,
      description: original.description ?? undefined,
      priority: original.priority,
      category: original.category as any,
      tags: original.tags?.map((t) => t.name),
    });

    
    if (body.includeSubtasks && original.subtasks?.length) {
      for (const subtask of original.subtasks) {
        await todoService.create({
          title: `${subtask.title}${body.titleSuffix}`,
          description: subtask.description ?? undefined,
          priority: subtask.priority,
          category: subtask.category as any,
          parentId: duplicate.id,
        });
      }
    }

    return reply.code(201).send(success(duplicate, "Todo duplicated"));
  });

  
  app.post<{ Params: { id: string } }>("/api/todos/:id/move", async (request, reply) => {
    const body = z
      .object({
        newParentId: z.string().nullable(),
      })
      .parse(request.body);

    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const updated = await todoService.update(request.params.id, {
      parentId: body.newParentId as any,
    });

    return reply.send(success(updated, "Todo moved"));
  });
}
