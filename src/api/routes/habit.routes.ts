import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql, eq } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function habitRoutes(app: FastifyInstance) {
  

  
  app.get("/api/habits", async (_request, reply) => {
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(sql`${schema.userPreferences.key} LIKE 'habit:%'`);

    const habits = prefs.map((p) => {
      const data = JSON.parse(p.value);
      return { id: p.key.replace("habit:", ""), ...data };
    });

    return reply.send(success(habits));
  });

  
  app.post("/api/habits", async (request, reply) => {
    const body = z
      .object({
        name: z.string().min(1).max(200),
        frequency: z.enum(["daily", "weekly", "monthly"]),
        category: z.string().optional(),
        targetCount: z.number().min(1).max(100).optional().default(1),
        reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      })
      .parse(request.body);

    const id = crypto.randomUUID();
    const key = `habit:${id}`;
    const value = JSON.stringify({
      ...body,
      streak: 0,
      bestStreak: 0,
      completions: [],
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value });

    return reply.code(201).send(success({ id, ...JSON.parse(value) }, "Habit created"));
  });

  
  app.post<{ Params: { id: string } }>("/api/habits/:id/complete", async (request, reply) => {
    const key = `habit:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Habit not found"));

    const data = JSON.parse(pref.value);
    const today = new Date().toISOString().split("T")[0] ?? "";
    const completions: string[] = data.completions ?? [];

    if (completions.includes(today)) {
      return reply.send(success(data, "Already completed today"));
    }

    completions.push(today);
    data.completions = completions;

    
    let streak = 0;
    const sortedCompletions = [...completions].sort().reverse();
    const checkDate = new Date();
    for (const completion of sortedCompletions) {
      const expected = checkDate.toISOString().split("T")[0];
      if (completion === expected) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    data.streak = streak;
    data.bestStreak = Math.max(data.bestStreak ?? 0, streak);

    await db.update(schema.userPreferences).set({ value: JSON.stringify(data) }).where(eq(schema.userPreferences.key, key));

    return reply.send(success(data, "Habit completed for today!"));
  });

  
  app.get<{ Params: { id: string } }>("/api/habits/:id/streak", async (request, reply) => {
    const key = `habit:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Habit not found"));

    const data = JSON.parse(pref.value);
    return reply.send(
      success({
        habitId: request.params.id,
        name: data.name,
        streak: data.streak,
        bestStreak: data.bestStreak,
        totalCompletions: (data.completions ?? []).length,
      })
    );
  });

  
  app.delete<{ Params: { id: string } }>("/api/habits/:id", async (request, reply) => {
    const key = `habit:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Habit not found"));

    await db.delete(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    return reply.send(success(null, "Habit deleted"));
  });
}
