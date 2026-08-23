import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { success } from "../../utils/helpers.js";

export async function insightsRoutes(app: FastifyInstance) {
  
  app.get("/api/insights/weekly", async (_request, reply) => {
    const { todos: allTodos } = await todoService.findMany({ limit: 200 });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    const completedThisWeek = allTodos.filter(
      (t) => t.status === "completed" && t.completedAt && new Date(t.completedAt) > weekAgo
    );

    const createdThisWeek = allTodos.filter(
      (t) => new Date(t.createdAt) > weekAgo
    );

    const categoryBreakdown: Record<string, { created: number; completed: number }> = {};
    for (const t of createdThisWeek) {
      const cat = t.category ?? "uncategorized";
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { created: 0, completed: 0 };
      categoryBreakdown[cat].created++;
    }
    for (const t of completedThisWeek) {
      const cat = t.category ?? "uncategorized";
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { created: 0, completed: 0 };
      categoryBreakdown[cat].completed++;
    }

    const overdue = allTodos.filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "archived" &&
        t.dueDate &&
        new Date(t.dueDate) < now
    );

    return reply.send(
      success({
        summary: {
          created: createdThisWeek.length,
          completed: completedThisWeek.length,
          overdue: overdue.length,
          netProgress: createdThisWeek.length - completedThisWeek.length,
        },
        categoryBreakdown,
        topCompleted: completedThisWeek.slice(0, 5).map((t) => ({
          title: t.title,
          completedAt: t.completedAt,
        })),
        insights: [
          completedThisWeek.length > createdThisWeek.length
            ? "You're completing more tasks than you're creating — great momentum!"
            : "Consider reviewing your task creation rate vs completion.",
          overdue.length > 3
            ? `You have ${overdue.length} overdue tasks. Consider reprioritizing.`
            : "Your overdue count is manageable.",
        ],
      })
    );
  });

  
  app.get("/api/insights/productivity", async (_request, reply) => {
    const { todos } = await todoService.findMany({ limit: 500 });

    
    const completedByDay: Record<string, number> = {};
    const completedByHour: Record<number, number> = {};

    for (const todo of todos) {
      if (todo.status === "completed" && todo.completedAt) {
        const date = todo.completedAt.split("T")[0] ?? "";
        const hour = new Date(todo.completedAt).getHours();
        completedByDay[date] = (completedByDay[date] ?? 0) + 1;
        completedByHour[hour] = (completedByHour[hour] ?? 0) + 1;
      }
    }

    
    let peakHour = 9;
    let peakCount = 0;
    for (const [hour, count] of Object.entries(completedByHour)) {
      if (count > peakCount) {
        peakHour = Number(hour);
        peakCount = count;
      }
    }

    
    const uniqueDays = Object.keys(completedByDay).length;
    const totalCompleted = Object.values(completedByDay).reduce((a, b) => a + b, 0);
    const avgPerDay = uniqueDays > 0 ? Math.round((totalCompleted / uniqueDays) * 10) / 10 : 0;

    return reply.send(
      success({
        peakHour,
        avgTasksPerDay: avgPerDay,
        mostProductiveDay: Object.entries(completedByDay).sort((a, b) => b[1] - a[1])[0]?.[0],
        completedByDay,
        completedByHour,
      })
    );
  });
}
