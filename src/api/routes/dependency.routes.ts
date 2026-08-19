import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { eq, sql } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function dependencyRoutes(app: FastifyInstance) {
  // POST /api/todos/:id/depends-on — add dependency
  app.post<{ Params: { id: string } }>("/api/todos/:id/depends-on", async (request, reply) => {
    const body = z.object({ dependsOnId: z.string() }).parse(request.body);
    const todo = await db.select().from(schema.todos).where(eq(schema.todos.id, request.params.id));
    if (!todo[0]) return reply.code(404).send(error("Todo not found"));

    const dependency = await db.select().from(schema.todos).where(eq(schema.todos.id, body.dependsOnId));
    if (!dependency[0]) return reply.code(404).send(error("Dependency todo not found"));

    // Store dependency in aiMetadata JSON
    const currentMeta = todo[0].aiMetadata ? JSON.parse(todo[0].aiMetadata) : {};
    const dependencies: string[] = currentMeta.dependencies ?? [];
    if (!dependencies.includes(body.dependsOnId)) {
      dependencies.push(body.dependsOnId);
    }

    await db
      .update(schema.todos)
      .set({
        aiMetadata: JSON.stringify({ ...currentMeta, dependencies }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.todos.id, request.params.id));

    return reply.send(success({ id: request.params.id, dependencies }, "Dependency added"));
  });

  // GET /api/todos/:id/dependencies — get dependencies
  app.get<{ Params: { id: string } }>("/api/todos/:id/dependencies", async (request, reply) => {
    const [todo] = await db.select().from(schema.todos).where(eq(schema.todos.id, request.params.id));
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    const dependencyIds: string[] = meta.dependencies ?? [];

    const deps = [];
    for (const depId of dependencyIds) {
      const [dep] = await db.select().from(schema.todos).where(eq(schema.todos.id, depId));
      if (dep) deps.push(dep);
    }

    return reply.send(success({ id: request.params.id, dependencies: deps }));
  });

  // DELETE /api/todos/:id/depends-on/:depId — remove dependency
  app.delete<{ Params: { id: string; depId: string } }>(
    "/api/todos/:id/depends-on/:depId",
    async (request, reply) => {
      const [todo] = await db.select().from(schema.todos).where(eq(schema.todos.id, request.params.id));
      if (!todo) return reply.code(404).send(error("Todo not found"));

      const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
      const dependencies: string[] = meta.dependencies ?? [];
      const filtered = dependencies.filter((d) => d !== request.params.depId);

      await db
        .update(schema.todos)
        .set({
          aiMetadata: JSON.stringify({ ...meta, dependencies: filtered }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.todos.id, request.params.id));

      return reply.send(success(null, "Dependency removed"));
    }
  );
}
