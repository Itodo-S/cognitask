import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql } from "drizzle-orm";
import { success } from "../../utils/helpers.js";

export async function reportRoutes(app: FastifyInstance) {
  
  app.get("/api/reports/weekly", async (request, reply) => {
    const query = request.query as { week?: string };
    const now = new Date();

    let startOfWeek: Date;
    if (query.week) {
      startOfWeek = new Date(query.week);
    } else {
      startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
    }

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const start = startOfWeek.toISOString();
    const end = endOfWeek.toISOString();

    const created = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.todos)
      .where(sql`${schema.todos.createdAt} >= ${start} AND ${schema.todos.createdAt} < ${end}`);

    const completed = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.todos)
      .where(
        sql`${schema.todos.completedAt} >= ${start} AND ${schema.todos.completedAt} < ${end}`
      );

    const byCategory = await db
      .select({
        category: schema.todos.category,
        count: sql<number>`count(*)`,
      })
      .from(schema.todos)
      .where(sql`${schema.todos.createdAt} >= ${start} AND ${schema.todos.createdAt} < ${end}`)
      .groupBy(schema.todos.category);

    const byPriority = await db
      .select({
        priority: schema.todos.priority,
        count: sql<number>`count(*)`,
      })
      .from(schema.todos)
      .where(sql`${schema.todos.createdAt} >= ${start} AND ${schema.todos.createdAt} < ${end}`)
      .groupBy(schema.todos.priority);

    return reply.send(
      success({
        week: { start: startOfWeek.toISOString(), end: endOfWeek.toISOString() },
        created: created[0]?.count ?? 0,
        completed: completed[0]?.count ?? 0,
        byCategory,
        byPriority,
      })
    );
  });

  
  app.get("/api/reports/monthly", async (request, reply) => {
    const query = request.query as { year?: string; month?: string };
    const now = new Date();
    const year = Number(query.year) || now.getFullYear();
    const month = Number(query.month) || now.getMonth() + 1;

    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = `${year}-${String(month).padStart(2, "0")}-32`;

    const created = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.todos)
      .where(sql`${schema.todos.createdAt} >= ${start} AND ${schema.todos.createdAt} < ${end}`);

    const completed = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.todos)
      .where(sql`${schema.todos.completedAt} >= ${start} AND ${schema.todos.completedAt} < ${end}`);

    return reply.send(
      success({
        month: { year, month },
        created: created[0]?.count ?? 0,
        completed: completed[0]?.count ?? 0,
        completionRate:
          (created[0]?.count ?? 0) > 0
            ? Math.round(((completed[0]?.count ?? 0) / (created[0]?.count ?? 1)) * 100)
            : 0,
      })
    );
  });
}
