import type { FastifyInstance } from "fastify";

export async function exportRoutes(app: FastifyInstance) {
  
  app.get("/api/export/markdown", async (_request, reply) => {
    const { todoService } = await import("../../services/todo.service.js");
    const { todos } = await todoService.findMany({ limit: 10000 });

    let md = "# CogniTask Export\n\n";
    md += `Exported at: ${new Date().toISOString()}\n\n`;
    md += `Total tasks: ${todos.length}\n\n`;

    const pending = todos.filter((t) => t.status === "pending");
    const inProgress = todos.filter((t) => t.status === "in_progress");
    const completed = todos.filter((t) => t.status === "completed");

    if (pending.length > 0) {
      md += "## Pending\n\n";
      for (const t of pending) {
        md += `- [ ] **${t.title}** (${t.priority})`;
        if (t.category) md += ` [${t.category}]`;
        if (t.dueDate) md += ` due: ${t.dueDate}`;
        md += "\n";
        if (t.description) md += `  ${t.description}\n`;
      }
      md += "\n";
    }

    if (inProgress.length > 0) {
      md += "## In Progress\n\n";
      for (const t of inProgress) {
        md += `- [ ] **${t.title}** (${t.priority})`;
        if (t.category) md += ` [${t.category}]`;
        md += "\n";
      }
      md += "\n";
    }

    if (completed.length > 0) {
      md += "## Completed\n\n";
      for (const t of completed) {
        md += `- [x] ~~${t.title}~~`;
        if (t.completedAt) md += ` (completed: ${t.completedAt.split("T")[0]})`;
        md += "\n";
      }
    }

    reply.header("Content-Type", "text/markdown");
    reply.header("Content-Disposition", "attachment; filename=cognitask-export.md");
    return reply.send(md);
  });

  
  app.get("/api/export/csv", async (_request, reply) => {
    const { todoService } = await import("../../services/todo.service.js");
    const { todos } = await todoService.findMany({ limit: 10000 });

    const header = "id,title,description,status,priority,category,dueDate,completedAt,createdAt";
    const rows = todos.map((t) =>
      [
        t.id,
        `"${(t.title ?? "").replace(/"/g, '""')}"`,
        `"${(t.description ?? "").replace(/"/g, '""')}"`,
        t.status,
        t.priority,
        t.category ?? "",
        t.dueDate ?? "",
        t.completedAt ?? "",
        t.createdAt,
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");

    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", "attachment; filename=cognitask-export.csv");
    return reply.send(csv);
  });
}
