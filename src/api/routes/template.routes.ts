import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { success, error } from "../../utils/helpers.js";

export async function templateRoutes(app: FastifyInstance) {
  
  const templates = [
    {
      id: "daily-standup",
      name: "Daily Standup",
      description: "Quick daily standup checklist",
      tasks: [
        { title: "What did I do yesterday?", priority: "medium" as const, category: "work" as const },
        { title: "What am I doing today?", priority: "medium" as const, category: "work" as const },
        { title: "Any blockers?", priority: "medium" as const, category: "work" as const },
      ],
    },
    {
      id: "project kickoff",
      name: "Project Kickoff",
      description: "Standard project kickoff tasks",
      tasks: [
        { title: "Define project scope", priority: "high" as const, category: "work" as const },
        { title: "Identify stakeholders", priority: "high" as const, category: "work" as const },
        { title: "Set up project repo", priority: "medium" as const, category: "work" as const },
        { title: "Create initial timeline", priority: "medium" as const, category: "work" as const },
        { title: "Schedule kickoff meeting", priority: "high" as const, category: "work" as const },
      ],
    },
    {
      id: "weekly-review",
      name: "Weekly Review",
      description: "End-of-week review and planning",
      tasks: [
        { title: "Review completed tasks", priority: "medium" as const, category: "work" as const },
        { title: "Identify wins", priority: "low" as const, category: "personal" as const },
        { title: "Plan next week priorities", priority: "high" as const, category: "work" as const },
        { title: "Update project documentation", priority: "medium" as const, category: "work" as const },
      ],
    },
    {
      id: "habit-builder",
      name: "Habit Builder",
      description: "Daily habit tracking template",
      tasks: [
        { title: "Morning meditation (10 min)", priority: "medium" as const, category: "health" as const },
        { title: "Exercise (30 min)", priority: "high" as const, category: "health" as const },
        { title: "Read (20 min)", priority: "medium" as const, category: "learning" as const },
        { title: "Journal entry", priority: "low" as const, category: "personal" as const },
      ],
    },
  ];

  
  app.get("/api/templates", async (_request, reply) => {
    return reply.send(success(templates));
  });

  
  app.get<{ Params: { id: string } }>("/api/templates/:id", async (request, reply) => {
    const template = templates.find((t) => t.id === request.params.id);
    if (!template) return reply.code(404).send(error("Template not found"));
    return reply.send(success(template));
  });

  
  app.post<{ Params: { id: string } }>("/api/templates/:id/apply", async (request, reply) => {
    const template = templates.find((t) => t.id === request.params.id);
    if (!template) return reply.code(404).send(error("Template not found"));

    const created = [];
    for (const task of template.tasks) {
      const todo = await todoService.create({
        title: task.title,
        priority: task.priority,
        category: task.category,
      });
      created.push(todo);
    }

    return reply.code(201).send(success(created, `Applied template "${template.name}" — ${created.length} todos created`));
  });
}
