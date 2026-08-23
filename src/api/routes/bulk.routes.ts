import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { success } from "../../utils/helpers.js";
import { z } from "zod";
import type { CreateTodoInput } from "../../types/todo.js";

export async function bulkRoutes(app: FastifyInstance) {
  
  app.post("/api/bulk/status", async (request, reply) => {
    const body = z
      .object({
        ids: z.array(z.string()).min(1).max(100),
        status: z.enum(["pending", "in_progress", "completed", "archived"]),
      })
      .parse(request.body);

    const results = [];
    for (const id of body.ids) {
      const todo = await todoService.updateStatus(id, body.status);
      if (todo) results.push(todo);
    }

    return reply.send(success(results, `${results.length} todos updated`));
  });

  
  app.post("/api/bulk/priority", async (request, reply) => {
    const body = z
      .object({
        ids: z.array(z.string()).min(1).max(100),
        priority: z.enum(["low", "medium", "high", "urgent"]),
      })
      .parse(request.body);

    const results = [];
    for (const id of body.ids) {
      const todo = await todoService.update(id, { priority: body.priority });
      if (todo) results.push(todo);
    }

    return reply.send(success(results, `${results.length} todos priority updated`));
  });

  
  app.post("/api/bulk/delete", async (request, reply) => {
    const body = z.object({ ids: z.array(z.string()).min(1).max(100) }).parse(request.body);

    let count = 0;
    for (const id of body.ids) {
      const deleted = await todoService.delete(id);
      if (deleted) count++;
    }

    return reply.send(success({ deleted: count }, `${count} todos archived`));
  });

  
  app.post("/api/bulk/category", async (request, reply) => {
    const body = z
      .object({
        ids: z.array(z.string()).min(1).max(100),
        category: z.string(),
      })
      .parse(request.body);

    const results = [];
    for (const id of body.ids) {
      const todo = await todoService.update(id, { category: body.category as any });
      if (todo) results.push(todo);
    }

    return reply.send(success(results, `${results.length} todos categorized`));
  });

  
  app.post("/api/bulk/import", async (request, reply) => {
    const body = z
      .object({
        todos: z.array(
          z.object({
            title: z.string().min(1),
            description: z.string().optional(),
            priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
            category: z.string().optional(),
            status: z.enum(["pending", "in_progress", "completed", "archived"]).optional(),
          })
        ),
      })
      .parse(request.body);

    const inputs: CreateTodoInput[] = body.todos.map((t) => ({
      title: t.title,
      description: t.description,
      priority: t.priority ?? "medium",
      category: t.category as any,
      status: t.status ?? "pending",
    }));

    const created = await todoService.batchCreate(inputs);
    return reply.code(201).send(success(created, `${created.length} todos imported`));
  });

  
  app.get("/api/bulk/export", async (_request, reply) => {
    const { todos } = await todoService.findMany({ limit: 10000 });
    return reply.send(success({ todos, exportedAt: new Date().toISOString() }));
  });
}
