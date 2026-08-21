import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql } from "drizzle-orm";
import { success } from "../../utils/helpers.js";

export async function archiveRoutes(app: FastifyInstance) {
  
  app.get("/api/archive", async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Number(query.limit) || 50;
    const offset = Number(query.offset) || 0;

    const archived = await db
      .select()
      .from(schema.todos)
      .where(sql`${schema.todos.status} = 'archived'`)
      .limit(limit)
      .offset(offset);

    return reply.send(success({ todos: archived, count: archived.length }));
  });

  
  app.post<{ Params: { id: string } }>("/api/archive/:id/restore", async (request, reply) => {
    const { todoService } = await import("../../services/todo.service.js");
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send({ success: false, error: "Todo not found" });

    const updated = await todoService.update(request.params.id, { status: "pending" });
    return reply.send(success(updated, "Todo restored"));
  });

  
  app.delete("/api/archive/empty", async (_request, reply) => {
    const archived = await db
      .select({ id: schema.todos.id })
      .from(schema.todos)
      .where(sql`${schema.todos.status} = 'archived'`);

    let count = 0;
    for (const { id } of archived) {
      await db.delete(schema.todos).where(sql`${schema.todos.id} = ${id}`);
      count++;
    }

    return reply.send(success({ deleted: count }, `${count} archived todos permanently deleted`));
  });
}
