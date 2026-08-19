import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql, eq } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function tagCloudRoutes(app: FastifyInstance) {
  // GET /api/tags/cloud — get tag usage counts
  app.get("/api/tags/cloud", async (_request, reply) => {
    const allTags = await db.select().from(schema.tags);
    const tagCounts: Array<{ name: string; count: number; id: string }> = [];

    for (const tag of allTags) {
      const [count] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.todoTags)
        .where(eq(schema.todoTags.tagId, tag.id));
      tagCounts.push({ name: tag.name, count: count?.count ?? 0, id: tag.id });
    }

    tagCounts.sort((a, b) => b.count - a.count);

    return reply.send(success(tagCounts));
  });

  // GET /api/tags/popular — get top 10 tags
  app.get("/api/tags/popular", async (_request, reply) => {
    const allTags = await db.select().from(schema.tags);
    const tagCounts: Array<{ name: string; count: number }> = [];

    for (const tag of allTags) {
      const [count] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.todoTags)
        .where(eq(schema.todoTags.tagId, tag.id));
      tagCounts.push({ name: tag.name, count: count?.count ?? 0 });
    }

    tagCounts.sort((a, b) => b.count - a.count);

    return reply.send(success(tagCounts.slice(0, 10)));
  });
}
