import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql, eq } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function goalRoutes(app: FastifyInstance) {
  // Goals are stored in user_preferences

  // GET /api/goals — list all goals
  app.get("/api/goals", async (_request, reply) => {
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(sql`${schema.userPreferences.key} LIKE 'goal:%'`);

    const goals = prefs.map((p) => {
      const data = JSON.parse(p.value);
      return { id: p.key.replace("goal:", ""), ...data };
    });

    return reply.send(success(goals));
  });

  // POST /api/goals — create goal
  app.post("/api/goals", async (request, reply) => {
    const body = z
      .object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        targetDate: z.string().datetime().optional(),
        category: z.string().optional(),
        milestoneCount: z.number().min(1).max(50).optional().default(5),
      })
      .parse(request.body);

    const id = crypto.randomUUID();
    const key = `goal:${id}`;
    const value = JSON.stringify({
      ...body,
      progress: 0,
      milestoneIds: [],
      status: "active",
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value });

    return reply.code(201).send(success({ id, ...JSON.parse(value) }, "Goal created"));
  });

  // PATCH /api/goals/:id — update goal
  app.patch<{ Params: { id: string } }>("/api/goals/:id", async (request, reply) => {
    const key = `goal:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Goal not found"));

    const body = z
      .object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        targetDate: z.string().datetime().optional(),
        progress: z.number().min(0).max(100).optional(),
        status: z.enum(["active", "completed", "paused", "abandoned"]).optional(),
      })
      .parse(request.body);

    const data = JSON.parse(pref.value);
    Object.assign(data, body);
    if (body.progress !== undefined && body.progress >= 100) {
      data.status = "completed";
      data.completedAt = new Date().toISOString();
    }

    await db.update(schema.userPreferences).set({ value: JSON.stringify(data) }).where(eq(schema.userPreferences.key, key));

    return reply.send(success({ id: request.params.id, ...data }, "Goal updated"));
  });

  // POST /api/goals/:id/milestone — add milestone
  app.post<{ Params: { id: string } }>("/api/goals/:id/milestone", async (request, reply) => {
    const key = `goal:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Goal not found"));

    const body = z
      .object({
        title: z.string().min(1).max(200),
        todoId: z.string().optional(),
      })
      .parse(request.body);

    const data = JSON.parse(pref.value);
    const milestone = {
      id: crypto.randomUUID(),
      title: body.title,
      todoId: body.todoId,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    data.milestoneIds = [...(data.milestoneIds ?? []), milestone];

    // Update progress based on completed milestones
    const completedCount = data.milestoneIds.filter((m: any) => m.completed).length;
    data.progress = Math.round((completedCount / data.milestoneIds.length) * 100);

    await db.update(schema.userPreferences).set({ value: JSON.stringify(data) }).where(eq(schema.userPreferences.key, key));

    return reply.send(success(data, "Milestone added"));
  });

  // DELETE /api/goals/:id — delete goal
  app.delete<{ Params: { id: string } }>("/api/goals/:id", async (request, reply) => {
    const key = `goal:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Goal not found"));

    await db.delete(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    return reply.send(success(null, "Goal deleted"));
  });
}
