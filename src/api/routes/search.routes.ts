import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { eq, sql } from "drizzle-orm";
import { success } from "../../utils/helpers.js";

export async function searchRoutes(app: FastifyInstance) {
  
  app.get("/api/search", async (request, reply) => {
    const query = request.query as {
      q?: string;
      status?: string;
      priority?: string;
      category?: string;
      tag?: string;
      hasDueDate?: string;
      limit?: string;
    };

    const conditions = [];

    if (query.q) {
      conditions.push(
        sql`(${schema.todos.title} LIKE ${`%${query.q}%`} OR ${schema.todos.description} LIKE ${`%${query.q}%`})`
      );
    }
    if (query.status) {
      conditions.push(eq(schema.todos.status, query.status));
    }
    if (query.priority) {
      conditions.push(eq(schema.todos.priority, query.priority));
    }
    if (query.category) {
      conditions.push(eq(schema.todos.category, query.category));
    }
    if (query.hasDueDate === "true") {
      conditions.push(sql`${schema.todos.dueDate} IS NOT NULL`);
    }
    if (query.hasDueDate === "false") {
      conditions.push(sql`${schema.todos.dueDate} IS NULL`);
    }

    const limit = Number(query.limit) || 50;

    let todos;
    if (conditions.length > 0) {
      todos = await db
        .select()
        .from(schema.todos)
        .where(sql.join(conditions, sql` AND `))
        .limit(limit);
    } else {
      todos = await db.select().from(schema.todos).limit(limit);
    }

    
    if (query.tag) {
      const tagTodos = await db
        .select({ todoId: schema.todoTags.todoId })
        .from(schema.todoTags)
        .innerJoin(schema.tags, eq(schema.todoTags.tagId, schema.tags.id))
        .where(eq(schema.tags.name, query.tag));

    const tagIds = new Set(tagTodos.map((t) => t.todoId));
    todos = todos.filter((t) => tagIds.has(t.id));
    }

    return reply.send(success({ results: todos, count: todos.length, query: query.q }));
  });
}
