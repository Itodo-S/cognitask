import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { eq } from "drizzle-orm";
import { success } from "../../utils/helpers.js";
import { z } from "zod";

export async function preferencesRoutes(app: FastifyInstance) {
  
  app.get("/api/preferences", async (_request, reply) => {
    const prefs = await db.select().from(schema.userPreferences);
    const result: Record<string, unknown> = {};
    for (const p of prefs) {
      try {
        result[p.key] = JSON.parse(p.value);
      } catch {
        result[p.key] = p.value;
      }
    }
    return reply.send(success(result));
  });

  
  app.get<{ Params: { key: string } }>("/api/preferences/:key", async (request, reply) => {
    const [pref] = await db
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.key, request.params.key));
    if (!pref) return reply.code(404).send(success(null, "Preference not found"));

    let value: unknown;
    try {
      value = JSON.parse(pref.value);
    } catch {
      value = pref.value;
    }
    return reply.send(success({ key: pref.key, value }));
  });

  
  app.put<{ Params: { key: string } }>("/api/preferences/:key", async (request, reply) => {
    const body = z.object({ value: z.unknown() }).parse(request.body);
    const key = request.params.key;
    const stringValue = JSON.stringify(body.value);

    const [existing] = await db
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.key, key));

    if (existing) {
      await db.update(schema.userPreferences).set({ value: stringValue }).where(eq(schema.userPreferences.key, key));
    } else {
      await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value: stringValue });
    }

    return reply.send(success({ key, value: body.value }, "Preference saved"));
  });

  
  app.delete<{ Params: { key: string } }>("/api/preferences/:key", async (request, reply) => {
    await db.delete(schema.userPreferences).where(eq(schema.userPreferences.key, request.params.key));
    return reply.send(success(null, "Preference deleted"));
  });

  
  app.put("/api/preferences", async (request, reply) => {
    const body = z.record(z.string(), z.unknown()).parse(request.body);

    for (const [key, value] of Object.entries(body)) {
      const stringValue = JSON.stringify(value);
      const [existing] = await db
        .select()
        .from(schema.userPreferences)
        .where(eq(schema.userPreferences.key, key));

      if (existing) {
        await db.update(schema.userPreferences).set({ value: stringValue }).where(eq(schema.userPreferences.key, key));
      } else {
        await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value: stringValue });
      }
    }

    return reply.send(success(null, "Preferences saved"));
  });
}
