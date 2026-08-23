import { desc, sql, and } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { TodoStats } from "../types/todo.js";

export class StatsService {
  async getDashboard(): Promise<{
    stats: TodoStats;
    recentCompletions: { id: string; title: string; completedAt: string }[];
    upcomingDue: { id: string; title: string; dueDate: string; priority: string }[];
  }> {
    const allTodos = await db.select().from(schema.todos);

    const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    const byCategory: Record<string, number> = {};
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let archived = 0;

    for (const todo of allTodos) {
      switch (todo.status) {
        case "pending":
          pending++;
          break;
        case "in_progress":
          inProgress++;
          break;
        case "completed":
          completed++;
          break;
        case "archived":
          archived++;
          break;
      }
      byPriority[todo.priority] = (byPriority[todo.priority] ?? 0) + 1;
      const cat = todo.category ?? "uncategorized";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    }

    const recentCompletions = await db
      .select({ id: schema.todos.id, title: schema.todos.title, completedAt: schema.todos.completedAt })
      .from(schema.todos)
      .where(sql`${schema.todos.status} = 'completed'`)
      .orderBy(desc(schema.todos.completedAt))
      .limit(5);

    const now = new Date().toISOString();
    const upcomingDue = await db
      .select({
        id: schema.todos.id,
        title: schema.todos.title,
        dueDate: schema.todos.dueDate,
        priority: schema.todos.priority,
      })
      .from(schema.todos)
      .where(
        and(
          sql`${schema.todos.status} != 'completed'`,
          sql`${schema.todos.status} != 'archived'`,
          sql`${schema.todos.dueDate} > ${now}`
        )
      )
      .orderBy(sql`${schema.todos.dueDate} ASC`)
      .limit(5);

    return {
      stats: {
        total: allTodos.length,
        pending,
        inProgress,
        completed,
        archived,
        byPriority,
        byCategory,
      },
      recentCompletions: recentCompletions as { id: string; title: string; completedAt: string }[],
      upcomingDue: upcomingDue as { id: string; title: string; dueDate: string; priority: string }[],
    };
  }

  async getCompletionRate(days = 7): Promise<{ date: string; count: number }[]> {
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const rows = await db
      .select({
        date: sql<string>`CAST(${schema.todos.completedAt} AS DATE)`,
        count: sql<number>`count(*)`,
      })
      .from(schema.todos)
      .where(
        and(
          sql`${schema.todos.status} = 'completed'`,
          sql`${schema.todos.completedAt} > ${since}`
        )
      )
      .groupBy(sql`CAST(${schema.todos.completedAt} AS DATE)`)
      .orderBy(sql`CAST(${schema.todos.completedAt} AS DATE) ASC`);

    return rows as { date: string; count: number }[];
  }
}

export const statsService = new StatsService();
