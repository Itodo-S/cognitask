import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { eq } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function tagRoutes(app: FastifyInstance) {
  
  app.get("/api/tags", async (_request, reply) => {
    const allTags = await db.select().from(schema.tags);
    return reply.send(success(allTags));
  });

  
  app.post("/api/tags", async (request, reply) => {
    const body = z.object({ name: z.string().min(1).max(100) }).parse(request.body);
    const [existing] = await db.select().from(schema.tags).where(eq(schema.tags.name, body.name));
    if (existing) return reply.code(409).send(error("Tag already exists"));

    const [tag] = await db.insert(schema.tags).values({ id: crypto.randomUUID(), name: body.name }).returning();
    return reply.code(201).send(success(tag, "Tag created"));
  });

  
  app.delete<{ Params: { id: string } }>("/api/tags/:id", async (request, reply) => {
    const [tag] = await db.select().from(schema.tags).where(eq(schema.tags.id, request.params.id));
    if (!tag) return reply.code(404).send(error("Tag not found"));

    await db.delete(schema.tags).where(eq(schema.tags.id, request.params.id));
    return reply.send(success(null, "Tag deleted"));
  });

  
  app.post<{ Params: { id: string } }>("/api/tags/:id/rename", async (request, reply) => {
    const body = z.object({ name: z.string().min(1).max(100) }).parse(request.body);
    const [tag] = await db.select().from(schema.tags).where(eq(schema.tags.id, request.params.id));
    if (!tag) return reply.code(404).send(error("Tag not found"));

    await db.update(schema.tags).set({ name: body.name }).where(eq(schema.tags.id, request.params.id));
    return reply.send(success({ id: request.params.id, name: body.name }, "Tag renamed"));
  });
}
