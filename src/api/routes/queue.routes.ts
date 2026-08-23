import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { eq, sql } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function queueRoutes(app: FastifyInstance) {
  

  
  app.get("/api/queue", async (_request, reply) => {
    const todos = await db.select().from(schema.todos).where(
      sql`${schema.todos.status} = 'pending' OR ${schema.todos.status} = 'in_progress'`
    );

    
    const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    todos.sort((a, b) => {
      const metaA = a.aiMetadata ? JSON.parse(a.aiMetadata) : {};
      const metaB = b.aiMetadata ? JSON.parse(b.aiMetadata) : {};
      const orderA = metaA.queueOrder ?? 999;
      const orderB = metaB.queueOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0);
    });

    return reply.send(success({ queue: todos, count: todos.length }));
  });

  
  app.post("/api/queue/set", async (request, reply) => {
    const body = z.object({ orderedIds: z.array(z.string()).min(1) }).parse(request.body);

    for (const [i, todoId] of body.orderedIds.entries()) {
      const [todo] = await db.select().from(schema.todos).where(eq(schema.todos.id, todoId));
      if (!todo) continue;

      const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
      await db
        .update(schema.todos)
        .set({
          aiMetadata: JSON.stringify({ ...meta, queueOrder: i }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.todos.id, todoId));
    }

    return reply.send(success({ count: body.orderedIds.length }, "Queue order updated"));
  });

  
  app.post("/api/queue/prioritize", async (request, reply) => {
    const body = z.object({ todoId: z.string() }).parse(request.body);

    const [todo] = await db.select().from(schema.todos).where(eq(schema.todos.id, body.todoId));
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    await db
      .update(schema.todos)
      .set({
        aiMetadata: JSON.stringify({ ...meta, queueOrder: -1 }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.todos.id, body.todoId));

    return reply.send(success(null, "Todo prioritized to top of queue"));
  });
}
