import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql, eq } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function knowledgeBaseRoutes(app: FastifyInstance) {
  

  
  app.get("/api/knowledge", async (request, reply) => {
    const query = request.query as { category?: string; search?: string };
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(sql`${schema.userPreferences.key} LIKE 'kb:%'`);

    let items = prefs.map((p) => {
      const data = JSON.parse(p.value);
      return { id: p.key.replace("kb:", ""), ...data };
    });

    if (query.category) {
      items = items.filter((i) => i.category === query.category);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.title?.toLowerCase().includes(s) ||
          i.content?.toLowerCase().includes(s) ||
          i.tags?.some((t: string) => t.toLowerCase().includes(s))
      );
    }

    return reply.send(success(items));
  });

  
  app.post("/api/knowledge", async (request, reply) => {
    const body = z
      .object({
        title: z.string().min(1).max(200),
        content: z.string().max(10000),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        url: z.string().url().optional(),
        todoId: z.string().optional(),
      })
      .parse(request.body);

    const id = crypto.randomUUID();
    const key = `kb:${id}`;
    const value = JSON.stringify({
      ...body,
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value });

    return reply.code(201).send(success({ id, ...JSON.parse(value) }, "Knowledge item created"));
  });

  
  app.put<{ Params: { id: string } }>("/api/knowledge/:id", async (request, reply) => {
    const key = `kb:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Knowledge item not found"));

    const body = z
      .object({
        title: z.string().min(1).max(200).optional(),
        content: z.string().max(10000).optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
      .parse(request.body);

    const data = JSON.parse(pref.value);
    Object.assign(data, body);
    data.updatedAt = new Date().toISOString();

    await db.update(schema.userPreferences).set({ value: JSON.stringify(data) }).where(eq(schema.userPreferences.key, key));

    return reply.send(success({ id: request.params.id, ...data }, "Knowledge item updated"));
  });

  
  app.delete<{ Params: { id: string } }>("/api/knowledge/:id", async (request, reply) => {
    const key = `kb:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Knowledge item not found"));

    await db.delete(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    return reply.send(success(null, "Knowledge item deleted"));
  });
}
