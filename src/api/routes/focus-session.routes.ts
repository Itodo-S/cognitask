import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql, eq } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function focusSessionRoutes(app: FastifyInstance) {
  // Focus sessions stored in user_preferences

  // POST /api/focus-sessions — create session
  app.post("/api/focus-sessions", async (request, reply) => {
    const body = z
      .object({
        todoId: z.string().optional(),
        duration: z.number().min(1).max(480).optional().default(25),
        type: z.enum(["pomodoro", "deep_work", "break"]).optional().default("pomodoro"),
      })
      .parse(request.body);

    const id = crypto.randomUUID();
    const key = `focus:${id}`;
    const value = JSON.stringify({
      ...body,
      status: "active",
      startedAt: new Date().toISOString(),
      endedAt: null,
      completed: false,
    });

    await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value });

    return reply.code(201).send(success({ id, ...JSON.parse(value) }, "Focus session started"));
  });

  // POST /api/focus-sessions/:id/complete — complete session
  app.post<{ Params: { id: string } }>("/api/focus-sessions/:id/complete", async (request, reply) => {
    const key = `focus:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Focus session not found"));

    const data = JSON.parse(pref.value);
    data.status = "completed";
    data.endedAt = new Date().toISOString();
    data.completed = true;

    await db.update(schema.userPreferences).set({ value: JSON.stringify(data) }).where(eq(schema.userPreferences.key, key));

    return reply.send(success(data, "Focus session completed!"));
  });

  // GET /api/focus-sessions/stats — get stats
  app.get("/api/focus-sessions/stats", async (_request, reply) => {
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(sql`${schema.userPreferences.key} LIKE 'focus:%'`);

    const sessions = prefs.map((p) => JSON.parse(p.value));
    const completed = sessions.filter((s: any) => s.completed);
    const totalMinutes = completed.reduce((sum: number, s: any) => sum + (s.duration ?? 0), 0);

    return reply.send(
      success({
        totalSessions: sessions.length,
        completedSessions: completed.length,
        totalMinutes,
        avgDuration:
          completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0,
      })
    );
  });
}
