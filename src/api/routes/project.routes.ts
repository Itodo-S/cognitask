import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { eq, sql, and } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function projectRoutes(app: FastifyInstance) {
  // Projects are stored in user_preferences with a "project:" prefix

  // GET /api/projects — list all projects
  app.get("/api/projects", async (_request, reply) => {
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(sql`${schema.userPreferences.key} LIKE 'project:%'`);

    const projects = prefs.map((p) => {
      const data = JSON.parse(p.value);
      return { id: p.key.replace("project:", ""), ...data };
    });

    return reply.send(success(projects));
  });

  // POST /api/projects — create project
  app.post("/api/projects", async (request, reply) => {
    const body = z
      .object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
      })
      .parse(request.body);

    const id = crypto.randomUUID();
    const key = `project:${id}`;
    const value = JSON.stringify({
      name: body.name,
      description: body.description,
      color: body.color,
      todoIds: [],
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value });

    return reply.code(201).send(success({ id, ...JSON.parse(value) }, "Project created"));
  });

  // POST /api/projects/:id/todos — add todos to project
  app.post<{ Params: { id: string } }>("/api/projects/:id/todos", async (request, reply) => {
    const body = z.object({ todoIds: z.array(z.string()).min(1) }).parse(request.body);
    const key = `project:${request.params.id}`;

    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Project not found"));

    const data = JSON.parse(pref.value);
    const existingIds: string[] = data.todoIds ?? [];
    data.todoIds = [...new Set([...existingIds, ...body.todoIds])];

    await db.update(schema.userPreferences).set({ value: JSON.stringify(data) }).where(eq(schema.userPreferences.key, key));

    return reply.send(success(data, "Todos added to project"));
  });

  // GET /api/projects/:id/todos — get project todos
  app.get<{ Params: { id: string } }>("/api/projects/:id/todos", async (request, reply) => {
    const key = `project:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Project not found"));

    const data = JSON.parse(pref.value);
    const todoIds: string[] = data.todoIds ?? [];

    const todos = [];
    for (const id of todoIds) {
      const [todo] = await db.select().from(schema.todos).where(eq(schema.todos.id, id));
      if (todo) todos.push(todo);
    }

    return reply.send(success({ project: { id: request.params.id, ...data }, todos }));
  });

  // DELETE /api/projects/:id — delete project
  app.delete<{ Params: { id: string } }>("/api/projects/:id", async (request, reply) => {
    const key = `project:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Project not found"));

    await db.delete(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    return reply.send(success(null, "Project deleted"));
  });
}
