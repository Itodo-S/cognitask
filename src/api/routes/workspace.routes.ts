import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql, eq } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function workspaceRoutes(app: FastifyInstance) {
  

  
  app.get("/api/workspaces", async (_request, reply) => {
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(sql`${schema.userPreferences.key} LIKE 'workspace:%'`);

    const workspaces = prefs.map((p) => {
      const data = JSON.parse(p.value);
      return { id: p.key.replace("workspace:", ""), ...data };
    });

    return reply.send(success(workspaces));
  });

  
  app.post("/api/workspaces", async (request, reply) => {
    const body = z
      .object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#6366f1"),
        icon: z.string().optional(),
      })
      .parse(request.body);

    const id = crypto.randomUUID();
    const key = `workspace:${id}`;
    const value = JSON.stringify({
      ...body,
      todoIds: [],
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value });

    return reply.code(201).send(success({ id, ...JSON.parse(value) }, "Workspace created"));
  });

  
  app.post<{ Params: { id: string } }>("/api/workspaces/:id/todos", async (request, reply) => {
    const body = z.object({ todoIds: z.array(z.string()).min(1) }).parse(request.body);
    const key = `workspace:${request.params.id}`;

    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Workspace not found"));

    const data = JSON.parse(pref.value);
    const existingIds: string[] = data.todoIds ?? [];
    data.todoIds = [...new Set([...existingIds, ...body.todoIds])];

    await db.update(schema.userPreferences).set({ value: JSON.stringify(data) }).where(eq(schema.userPreferences.key, key));

    return reply.send(success(data, "Todos added to workspace"));
  });

  
  app.delete<{ Params: { id: string } }>("/api/workspaces/:id", async (request, reply) => {
    const key = `workspace:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Workspace not found"));

    await db.delete(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    return reply.send(success(null, "Workspace deleted"));
  });
}
