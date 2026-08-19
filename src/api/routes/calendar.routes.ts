import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql } from "drizzle-orm";
import { success } from "../../utils/helpers.js";

export async function calendarRoutes(app: FastifyInstance) {
  // GET /api/calendar/today — today's tasks
  app.get("/api/calendar/today", async (_request, reply) => {
    const today = new Date().toISOString().split("T")[0];

    const todos = await db
      .select()
      .from(schema.todos)
      .where(
        sql`(${schema.todos.dueDate} LIKE ${today + "%"}) OR (${schema.todos.status} = 'in_progress')`
      )
      .orderBy(sql`${schema.todos.priority} DESC`);

    return reply.send(success({ date: today, todos }));
  });

  // GET /api/calendar/week — this week's tasks
  app.get("/api/calendar/week", async (_request, reply) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const start = startOfWeek.toISOString().split("T")[0] ?? "";
    const end = endOfWeek.toISOString().split("T")[0] ?? "";

    const todos = await db
      .select()
      .from(schema.todos)
      .where(sql`${schema.todos.dueDate} >= ${start} AND ${schema.todos.dueDate} < ${end}`)
      .orderBy(sql`${schema.todos.dueDate} ASC`);

    return reply.send(success({ week: { start, end }, todos }));
  });

  // GET /api/calendar/overdue — overdue tasks
  app.get("/api/calendar/overdue", async (_request, reply) => {
    const now = new Date().toISOString();

    const todos = await db
      .select()
      .from(schema.todos)
      .where(
        sql`${schema.todos.dueDate} < ${now} AND ${schema.todos.status} != 'completed' AND ${schema.todos.status} != 'archived'`
      )
      .orderBy(sql`${schema.todos.dueDate} ASC`);

    return reply.send(success({ overdue: todos, count: todos.length }));
  });

  // GET /api/calendar/month — month view (grouped by date)
  app.get("/api/calendar/month", async (request, reply) => {
    const query = request.query as { year?: string; month?: string };
    const now = new Date();
    const year = Number(query.year) || now.getFullYear();
    const month = Number(query.month) || now.getMonth() + 1;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-32`;

    const todos = await db
      .select()
      .from(schema.todos)
      .where(sql`${schema.todos.dueDate} >= ${startDate} AND ${schema.todos.dueDate} < ${endDate}`)
      .orderBy(sql`${schema.todos.dueDate} ASC`);

    // Group by date
    const grouped: Record<string, typeof todos> = {};
    for (const todo of todos) {
      const date = todo.dueDate?.split("T")[0] ?? "no-date";
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(todo);
    }

    return reply.send(success({ year, month, grouped }));
  });
}
