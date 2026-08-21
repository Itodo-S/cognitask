import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql } from "drizzle-orm";
import { success } from "../../utils/helpers.js";

export async function dailyDigestRoutes(app: FastifyInstance) {
  
  app.get("/api/digest/today", async (_request, reply) => {
    const today = new Date().toISOString().split("T")[0] ?? "";
    const allTodos = await db.select().from(schema.todos);

    const todayCreated = allTodos.filter((t) => t.createdAt.startsWith(today));
    const todayCompleted = allTodos.filter(
      (t) => t.status === "completed" && t.completedAt?.startsWith(today)
    );
    const overdue = allTodos.filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "archived" &&
        t.dueDate &&
        t.dueDate < new Date().toISOString()
    );
    const active = allTodos.filter(
      (t) => t.status === "pending" || t.status === "in_progress"
    );

    const priorityBreakdown: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    for (const t of active) {
      if (t.priority in priorityBreakdown) priorityBreakdown[t.priority]++;
    }

    return reply.send(
      success({
        date: today,
        summary: {
          created: todayCreated.length,
          completed: todayCompleted.length,
          overdue: overdue.length,
          active: active.length,
        },
        priorityBreakdown,
        overdueTasks: overdue.slice(0, 5).map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate,
          priority: t.priority,
        })),
        todayCreated: todayCreated.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
        })),
      })
    );
  });
}
