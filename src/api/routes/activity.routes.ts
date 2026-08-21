import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { eq, sql } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function activityRoutes(app: FastifyInstance) {
  
  

  
  app.post<{ Params: { id: string } }>("/api/todos/:id/activity", async (request, reply) => {
    const body = z
      .object({
        action: z.string().min(1).max(100),
        details: z.string().max(2000).optional(),
      })
      .parse(request.body);

    const [todo] = await db.select().from(schema.todos).where(eq(schema.todos.id, request.params.id));
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    const activities: Array<{ action: string; details?: string; timestamp: string }> =
      meta.activities ?? [];
    activities.push({
      action: body.action,
      details: body.details,
      timestamp: new Date().toISOString(),
    });

    
    if (activities.length > 50) {
      activities.splice(0, activities.length - 50);
    }

    await db
      .update(schema.todos)
      .set({ aiMetadata: JSON.stringify({ ...meta, activities }), updatedAt: new Date().toISOString() })
      .where(eq(schema.todos.id, request.params.id));

    return reply.send(success({ activity: activities[activities.length - 1] }, "Activity logged"));
  });

  
  app.get<{ Params: { id: string } }>("/api/todos/:id/activity", async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Number(query.limit) || 20;

    const [todo] = await db.select().from(schema.todos).where(eq(schema.todos.id, request.params.id));
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    const activities: Array<{ action: string; details?: string; timestamp: string }> =
      meta.activities ?? [];

    return reply.send(success(activities.slice(-limit)));
  });

  
  app.get("/api/activity/recent", async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Number(query.limit) || 50;

    const todos = await db.select().from(schema.todos).limit(100);
    const allActivities: Array<{
      todoId: string;
      todoTitle: string;
      action: string;
      details?: string;
      timestamp: string;
    }> = [];

    for (const todo of todos) {
      const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
      const activities = meta.activities ?? [];
      for (const a of activities) {
        allActivities.push({
          todoId: todo.id,
          todoTitle: todo.title,
          action: a.action,
          details: a.details,
          timestamp: a.timestamp,
        });
      }
    }

    allActivities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return reply.send(success(allActivities.slice(0, limit)));
  });
}
