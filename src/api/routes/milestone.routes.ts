import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql } from "drizzle-orm";
import { success } from "../../utils/helpers.js";

export async function milestoneRoutes(app: FastifyInstance) {
  
  app.get("/api/milestones", async (_request, reply) => {
    const todos = await db.select().from(schema.todos);
    const milestones: Array<{
      todoId: string;
      title: string;
      status: string;
      progress: number;
      createdAt: string;
    }> = [];

    for (const todo of todos) {
      const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
      if (meta.isMilestone) {
        milestones.push({
          todoId: todo.id,
          title: todo.title,
          status: todo.status,
          progress: meta.progress ?? 0,
          createdAt: todo.createdAt,
        });
      }
    }

    return reply.send(success(milestones));
  });

  
  app.post<{ Params: { id: string } }>("/api/todos/:id/milestone", async (request, reply) => {
    const { todoService } = await import("../../services/todo.service.js");
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send({ success: false, error: "Todo not found" });

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    meta.isMilestone = true;
    meta.progress = todo.status === "completed" ? 100 : 0;

    await todoService.update(request.params.id, {
      aiMetadata: JSON.stringify(meta),
    } as any);

    return reply.send(success({ todoId: request.params.id, isMilestone: true }, "Todo marked as milestone"));
  });
}
