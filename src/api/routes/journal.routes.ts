import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql } from "drizzle-orm";
import { success } from "../../utils/helpers.js";

export async function journalRoutes(app: FastifyInstance) {
  

  
  app.get("/api/journal", async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Number(query.limit) || 30;

    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(sql`${schema.userPreferences.key} LIKE 'journal:%'`);

    const entries = prefs
      .map((p) => {
        const data = JSON.parse(p.value);
        return { id: p.key.replace("journal:", ""), ...data };
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);

    return reply.send(success(entries));
  });

  
  app.post("/api/journal", async (request, reply) => {
    const { z } = await import("zod");
    const body = z
      .object({
        content: z.string().min(1).max(10000),
        mood: z.enum(["great", "good", "okay", "bad", "terrible"]).optional(),
        tags: z.array(z.string()).optional(),
        date: z.string().optional().default(new Date().toISOString().split("T")[0] ?? ""),
      })
      .parse(request.body);

    const id = crypto.randomUUID();
    const key = `journal:${id}`;
    const value = JSON.stringify({
      ...body,
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value });

    return reply.code(201).send(success({ id, ...JSON.parse(value) }, "Journal entry created"));
  });

  
  app.get<{ Params: { id: string } }>("/api/journal/:id", async (request, reply) => {
    const key = `journal:${request.params.id}`;
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.key, key));
    if (!prefs[0]) return reply.code(404).send({ success: false, error: "Entry not found" });

    const data = JSON.parse(prefs[0].value);
    return reply.send(success({ id: request.params.id, ...data }));
  });

  
  app.delete<{ Params: { id: string } }>("/api/journal/:id", async (request, reply) => {
    const { eq } = await import("drizzle-orm");
    const key = `journal:${request.params.id}`;
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.key, key));
    if (!prefs[0]) return reply.code(404).send({ success: false, error: "Entry not found" });

    await db.delete(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    return reply.send(success(null, "Journal entry deleted"));
  });
}
