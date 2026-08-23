import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function dragDropRoutes(app: FastifyInstance) {
  
  app.post("/api/todos/reorder", async (request, reply) => {
    const body = z
      .object({
        todoIds: z.array(z.string()).min(1),
        parentId: z.string().nullable().optional(),
      })
      .parse(request.body);

    
    for (const [i, todoId] of body.todoIds.entries()) {
      await todoService.update(todoId, {
        aiMetadata: JSON.stringify({ order: i }),
      } as any);
    }

    return reply.send(success({ reordered: body.todoIds.length }, "Todos reordered"));
  });

  
  app.post<{ Params: { id: string } }>("/api/todos/:id/move-to", async (request, reply) => {
    const body = z
      .object({
        newParentId: z.string().nullable(),
        position: z.number().min(0).optional(),
      })
      .parse(request.body);

    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    
    if (body.newParentId) {
      let current = await todoService.findById(body.newParentId);
      while (current?.parentId) {
        if (current.parentId === request.params.id) {
          return reply.code(400).send(error("Cannot move todo to its own subtask"));
        }
        current = await todoService.findById(current.parentId);
      }
    }

    const updated = await todoService.update(request.params.id, {
      parentId: body.newParentId as any,
    });

    return reply.send(success(updated, "Todo moved"));
  });
}
