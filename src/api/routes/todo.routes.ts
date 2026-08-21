import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import {
  createTodoSchema,
  updateTodoSchema,
  todoFilterSchema,
  batchCreateTodoSchema,
  updateTodoStatusSchema,
} from "../schemas/todo.schema.js";
import { success, error } from "../../utils/helpers.js";
import { ZodError } from "zod";

export async function todoRoutes(app: FastifyInstance) {
  
  app.get("/api/todos", async (request, reply) => {
    const query = todoFilterSchema.parse(request.query);
    const { todos, total } = await todoService.findMany(query);
    return reply.send(success(todos));
  });

  
  app.get("/api/todos/tree", async (_request, reply) => {
    const tree = await todoService.getTree();
    return reply.send(success(tree));
  });

  
  app.get<{ Params: { id: string } }>("/api/todos/:id", async (request, reply) => {
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));
    return reply.send(success(todo));
  });

  
  app.post("/api/todos", async (request, reply) => {
    const body = createTodoSchema.parse(request.body);
    const todo = await todoService.create(body);
    return reply.code(201).send(success(todo, "Todo created"));
  });

  
  app.post("/api/todos/batch", async (request, reply) => {
    const body = batchCreateTodoSchema.parse(request.body);
    const todos = await todoService.batchCreate(body.todos);
    return reply.code(201).send(success(todos, `${todos.length} todos created`));
  });

  
  app.patch<{ Params: { id: string } }>("/api/todos/:id", async (request, reply) => {
    const body = updateTodoSchema.parse(request.body);
    const todo = await todoService.update(request.params.id, body);
    if (!todo) return reply.code(404).send(error("Todo not found"));
    return reply.send(success(todo, "Todo updated"));
  });

  
  app.patch<{ Params: { id: string } }>("/api/todos/:id/status", async (request, reply) => {
    const body = updateTodoStatusSchema.parse(request.body);
    const todo = await todoService.updateStatus(request.params.id, body.status);
    if (!todo) return reply.code(404).send(error("Todo not found"));
    return reply.send(success(todo, "Status updated"));
  });

  
  app.delete<{ Params: { id: string } }>("/api/todos/:id", async (request, reply) => {
    const deleted = await todoService.delete(request.params.id);
    if (!deleted) return reply.code(404).send(error("Todo not found"));
    return reply.send(success(null, "Todo archived"));
  });

  
  app.post<{ Params: { id: string } }>("/api/todos/:id/subtasks", async (request, reply) => {
    const parent = await todoService.findById(request.params.id);
    if (!parent) return reply.code(404).send(error("Parent todo not found"));

    const body = createTodoSchema.parse(request.body);
    const subtask = await todoService.create({ ...body, parentId: request.params.id });
    return reply.code(201).send(success(subtask, "Subtask created"));
  });

  
  app.get("/api/todos/stats", async (_request, reply) => {
    const stats = await todoService.getStats();
    return reply.send(success(stats));
  });
}
