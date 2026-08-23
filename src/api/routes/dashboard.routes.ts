import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { success } from "../../utils/helpers.js";

export async function dashboardRoutes(app: FastifyInstance) {
  
  app.get("/api/dashboard", async (_request, reply) => {
    const allTodos = await db.select().from(schema.todos);
    const now = new Date();
    const today = now.toISOString().split("T")[0] ?? "";
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

    const stats = {
      total: allTodos.length,
      pending: allTodos.filter((t) => t.status === "pending").length,
      inProgress: allTodos.filter((t) => t.status === "in_progress").length,
      completed: allTodos.filter((t) => t.status === "completed").length,
      archived: allTodos.filter((t) => t.status === "archived").length,
      overdue: allTodos.filter(
        (t) =>
          t.status !== "completed" &&
          t.status !== "archived" &&
          t.dueDate &&
          t.dueDate < now.toISOString()
      ).length,
      completedToday: allTodos.filter(
        (t) => t.status === "completed" && t.completedAt?.startsWith(today)
      ).length,
      completedThisWeek: allTodos.filter(
        (t) => t.status === "completed" && t.completedAt && t.completedAt > weekAgo
      ).length,
    };

    const priorityBreakdown: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    const categoryBreakdown: Record<string, number> = {};

    for (const t of allTodos) {
      if (t.status === "pending" || t.status === "in_progress") {
        priorityBreakdown[t.priority] = (priorityBreakdown[t.priority] ?? 0) + 1;
        const cat = t.category ?? "uncategorized";
        categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + 1;
      }
    }

    const upcomingDue = allTodos
      .filter(
        (t) =>
          t.status !== "completed" &&
          t.status !== "archived" &&
          t.dueDate &&
          t.dueDate > now.toISOString()
      )
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
      .slice(0, 5);

    const recentCompleted = allTodos
      .filter((t) => t.status === "completed")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 5);

    const activeInProgress = allTodos
      .filter((t) => t.status === "in_progress")
      .slice(0, 5);

    return reply.send(
      success({
        stats,
        priorityBreakdown,
        categoryBreakdown,
        upcomingDue,
        recentCompleted,
        activeInProgress,
      })
    );
  });
}
