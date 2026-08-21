import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql, eq, and } from "drizzle-orm";
import { success } from "../../utils/helpers.js";

export async function analyticsRoutes(app: FastifyInstance) {
  
  app.get("/api/analytics/overview", async (_request, reply) => {
    const allTodos = await db.select().from(schema.todos);

    const now = new Date();
    const today = now.toISOString().split("T")[0] ?? "";
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    const completedToday = allTodos.filter(
      (t) => t.status === "completed" && t.completedAt?.startsWith(today)
    ).length;

    const completedThisWeek = allTodos.filter(
      (t) => t.status === "completed" && t.completedAt && t.completedAt > weekAgo
    ).length;

    const completedThisMonth = allTodos.filter(
      (t) => t.status === "completed" && t.completedAt && t.completedAt > monthAgo
    ).length;

    const overdue = allTodos.filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "archived" &&
        t.dueDate &&
        t.dueDate < now.toISOString()
    ).length;

    const activeTasks = allTodos.filter(
      (t) => t.status === "pending" || t.status === "in_progress"
    ).length;

    return reply.send(
      success({
        total: allTodos.length,
        active: activeTasks,
        completedToday,
        completedThisWeek,
        completedThisMonth,
        overdue,
        completionRate:
          allTodos.length > 0
            ? Math.round(
                (allTodos.filter((t) => t.status === "completed").length / allTodos.length) * 100
              )
            : 0,
      })
    );
  });

  
  app.get("/api/analytics/productivity", async (_request, reply) => {
    const allTodos = await db.select().from(schema.todos);

    const completed = allTodos.filter((t) => t.status === "completed").length;
    const total = allTodos.length;
    const urgentCompleted = allTodos.filter(
      (t) => t.status === "completed" && t.priority === "urgent"
    ).length;
    const urgentTotal = allTodos.filter((t) => t.priority === "urgent").length;

    const score = Math.min(
      100,
      Math.round(
        (completed / Math.max(total, 1)) * 60 +
          (urgentTotal > 0 ? (urgentCompleted / urgentTotal) * 40 : 20)
      )
    );

    let level = "beginner";
    if (score >= 80) level = "expert";
    else if (score >= 60) level = "productive";
    else if (score >= 40) level = "steady";
    else if (score >= 20) level = "building";

    return reply.send(
      success({
        score,
        level,
        completed,
        total,
        urgentCompleted,
        urgentTotal,
      })
    );
  });

  
  app.get("/api/analytics/timeline", async (request, reply) => {
    const query = request.query as { days?: string };
    const days = Number(query.days) || 30;

    const since = new Date(Date.now() - days * 86400000).toISOString();

    const created = await db
      .select({
        date: sql<string>`date(${schema.todos.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(schema.todos)
      .where(sql`${schema.todos.createdAt} > ${since}`)
      .groupBy(sql`date(${schema.todos.createdAt})`)
      .orderBy(sql`date(${schema.todos.createdAt}) ASC`);

    const completed = await db
      .select({
        date: sql<string>`date(${schema.todos.completedAt})`,
        count: sql<number>`count(*)`,
      })
      .from(schema.todos)
      .where(
        and(sql`${schema.todos.completedAt} > ${since}`, sql`${schema.todos.status} = 'completed'`)
      )
      .groupBy(sql`date(${schema.todos.completedAt})`)
      .orderBy(sql`date(${schema.todos.completedAt}) ASC`);

    return reply.send(success({ created, completed }));
  });
}
