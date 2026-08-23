import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { success } from "../../utils/helpers.js";

export async function statsV2Routes(app: FastifyInstance) {
  
  app.get("/api/v2/stats/comprehensive", async (_request, reply) => {
    const allTodos = await db.select().from(schema.todos);
    const now = new Date();

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byMonth: Record<string, { created: number; completed: number }> = {};

    for (const todo of allTodos) {
      byStatus[todo.status] = (byStatus[todo.status] ?? 0) + 1;
      byPriority[todo.priority] = (byPriority[todo.priority] ?? 0) + 1;
      const cat = todo.category ?? "uncategorized";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;

      const month = (todo.createdAt ?? "").substring(0, 7);
      if (!byMonth[month]) byMonth[month] = { created: 0, completed: 0 };
      byMonth[month].created++;
      if (todo.status === "completed") byMonth[month].completed++;
    }

    const overdue = allTodos.filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "archived" &&
        t.dueDate &&
        new Date(t.dueDate) < now
    ).length;

    const avgCompletionTime = (() => {
      const completed = allTodos.filter((t) => t.status === "completed" && t.completedAt);
      if (completed.length === 0) return 0;
      const total = completed.reduce((sum, t) => {
        const created = new Date(t.createdAt).getTime();
        const done = new Date(t.completedAt!).getTime();
        return sum + (done - created);
      }, 0);
      return Math.round(total / completed.length / 3600000 * 10) / 10;
    })();

    return reply.send(
      success({
        total: allTodos.length,
        byStatus,
        byPriority,
        byCategory,
        byMonth,
        overdue,
        avgCompletionTimeHours: avgCompletionTime,
        completionRate:
          allTodos.length > 0
            ? Math.round(((byStatus["completed"] ?? 0) / allTodos.length) * 100)
            : 0,
      })
    );
  });
}
