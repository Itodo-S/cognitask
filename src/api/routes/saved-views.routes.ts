import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql, eq } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function savedViewsRoutes(app: FastifyInstance) {
  

  
  app.get("/api/views", async (_request, reply) => {
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(sql`${schema.userPreferences.key} LIKE 'view:%'`);

    const views = prefs.map((p) => {
      const data = JSON.parse(p.value);
      return { id: p.key.replace("view:", ""), ...data };
    });

    return reply.send(success(views));
  });

  
  app.post("/api/views", async (request, reply) => {
    const body = z
      .object({
        name: z.string().min(1).max(200),
        filters: z.record(z.unknown()),
        icon: z.string().optional(),
      })
      .parse(request.body);

    const id = crypto.randomUUID();
    const key = `view:${id}`;
    const value = JSON.stringify({
      ...body,
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value });

    return reply.code(201).send(success({ id, ...JSON.parse(value) }, "View saved"));
  });

  
  app.delete<{ Params: { id: string } }>("/api/views/:id", async (request, reply) => {
    const key = `view:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("View not found"));

    await db.delete(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    return reply.send(success(null, "View deleted"));
  });
}
