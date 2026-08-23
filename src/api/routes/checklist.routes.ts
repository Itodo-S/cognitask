import type { FastifyInstance } from "fastify";
import { checklistService, ChecklistService } from "../../services/checklist.service.js";
import { todoService } from "../../services/todo.service.js";
import {
  createChecklistItemSchema,
  updateChecklistItemSchema,
  replaceChecklistSchema,
  reorderChecklistSchema,
  bulkAddChecklistSchema,
} from "../schemas/checklist.schema.js";
import { success, error } from "../../utils/helpers.js";
import { wsGateway } from "../../ws/gateway.js";

type IdParams = { id: string };
type ItemParams = { itemId: string };

/**
 * Every response carries the checklist plus the (possibly changed) parent todo,
 * so the client can repaint the card in one go.
 */
export async function checklistRoutes(app: FastifyInstance) {
  const respond = async (todoId: string) => {
    const [items, todo] = await Promise.all([
      checklistService.findByTodo(todoId),
      todoService.findById(todoId),
    ]);
    const payload = {
      todoId,
      items,
      progress: ChecklistService.progressOf(items),
      todo,
    };
    wsGateway.broadcast("checklist:updated", payload);
    return payload;
  };

  app.get<{ Params: IdParams }>("/api/todos/:id/checklist", async (request, reply) => {
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const items = await checklistService.findByTodo(request.params.id);
    return reply.send(
      success({ todoId: request.params.id, items, progress: ChecklistService.progressOf(items) })
    );
  });

  app.post<{ Params: IdParams }>("/api/todos/:id/checklist", async (request, reply) => {
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const body = createChecklistItemSchema.parse(request.body);
    const item = await checklistService.create(request.params.id, body);
    await todoService.syncStatusToChecklist(request.params.id);

    return reply.code(201).send(success({ item, ...(await respond(request.params.id)) }, "Item added"));
  });

  app.post<{ Params: IdParams }>("/api/todos/:id/checklist/bulk", async (request, reply) => {
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const body = bulkAddChecklistSchema.parse(request.body);
    const items = await checklistService.createMany(request.params.id, body.items);
    await todoService.syncStatusToChecklist(request.params.id);

    return reply
      .code(201)
      .send(success(await respond(request.params.id), `${items.length} items added`));
  });

  app.put<{ Params: IdParams }>("/api/todos/:id/checklist", async (request, reply) => {
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const body = replaceChecklistSchema.parse(request.body);
    await checklistService.replaceAll(request.params.id, body.items);
    await todoService.syncStatusToChecklist(request.params.id);

    return reply.send(success(await respond(request.params.id), "Checklist saved"));
  });

  app.post<{ Params: IdParams }>("/api/todos/:id/checklist/reorder", async (request, reply) => {
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const body = reorderChecklistSchema.parse(request.body);
    await checklistService.reorder(request.params.id, body.orderedIds);

    return reply.send(success(await respond(request.params.id), "Checklist reordered"));
  });

  app.delete<{ Params: IdParams }>("/api/todos/:id/checklist/completed", async (request, reply) => {
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send(error("Todo not found"));

    const removed = await checklistService.clearCompleted(request.params.id);
    return reply.send(success(await respond(request.params.id), `${removed} items cleared`));
  });

  app.patch<{ Params: ItemParams }>("/api/checklist/:itemId", async (request, reply) => {
    const body = updateChecklistItemSchema.parse(request.body);
    const item = await checklistService.update(request.params.itemId, body);
    if (!item) return reply.code(404).send(error("Checklist item not found"));

    await todoService.syncStatusToChecklist(item.todoId);
    return reply.send(success({ item, ...(await respond(item.todoId)) }, "Item updated"));
  });

  app.post<{ Params: ItemParams }>("/api/checklist/:itemId/toggle", async (request, reply) => {
    const item = await checklistService.toggle(request.params.itemId);
    if (!item) return reply.code(404).send(error("Checklist item not found"));

    await todoService.syncStatusToChecklist(item.todoId);
    return reply.send(success({ item, ...(await respond(item.todoId)) }));
  });

  app.delete<{ Params: ItemParams }>("/api/checklist/:itemId", async (request, reply) => {
    const item = await checklistService.delete(request.params.itemId);
    if (!item) return reply.code(404).send(error("Checklist item not found"));

    await todoService.syncStatusToChecklist(item.todoId);
    return reply.send(success(await respond(item.todoId), "Item removed"));
  });
}
