import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql } from "drizzle-orm";
import { success } from "../../utils/helpers.js";

export async function changelogRoutes(app: FastifyInstance) {
  // Changelog stored in user_preferences

  // GET /api/changelog — list entries
  app.get("/api/changelog", async (_request, reply) => {
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(sql`${schema.userPreferences.key} LIKE 'changelog:%'`);

    const entries = prefs
      .map((p) => {
        const data = JSON.parse(p.value);
        return { id: p.key.replace("changelog:", ""), ...data };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return reply.send(success(entries));
  });

  // POST /api/changelog — add entry
  app.post("/api/changelog", async (request, reply) => {
    const { z } = await import("zod");
    const body = z
      .object({
        version: z.string().min(1),
        changes: z.array(z.string()).min(1),
        type: z.enum(["added", "changed", "fixed", "removed"]).optional().default("added"),
      })
      .parse(request.body);

    const id = crypto.randomUUID();
    const key = `changelog:${id}`;
    const value = JSON.stringify({
      ...body,
      date: new Date().toISOString(),
    });

    await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value });

    return reply.code(201).send(success({ id, ...JSON.parse(value) }, "Changelog entry added"));
  });
}
