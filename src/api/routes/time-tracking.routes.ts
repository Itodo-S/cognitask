import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql } from "drizzle-orm";
import { success } from "../../utils/helpers.js";

export async function timeTrackingRoutes(app: FastifyInstance) {
  

  
  app.post<{ Params: { id: string } }>("/api/todos/:id/time", async (request, reply) => {
    const { todoService } = await import("../../services/todo.service.js");
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send({ success: false, error: "Todo not found" });

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    const timeEntries: Array<{ start: string; end?: string; duration?: number }> =
      meta.timeEntries ?? [];
    timeEntries.push({ start: new Date().toISOString() });
    meta.timeEntries = timeEntries;
    meta.isTimerRunning = true;

    await todoService.update(request.params.id, {
      aiMetadata: JSON.stringify(meta),
    } as any);

    return reply.send(
      success({ todoId: request.params.id, timerStarted: timeEntries[timeEntries.length - 1] }, "Timer started")
    );
  });

  
  app.post<{ Params: { id: string } }>("/api/todos/:id/time/stop", async (request, reply) => {
    const { todoService } = await import("../../services/todo.service.js");
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send({ success: false, error: "Todo not found" });

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    const timeEntries: Array<{ start: string; end?: string; duration?: number }> =
      meta.timeEntries ?? [];

    const running = timeEntries.find((e) => !e.end);
    if (!running) return reply.code(400).send({ success: false, error: "No timer running" });

    running.end = new Date().toISOString();
    running.duration =
      Math.round((new Date(running.end).getTime() - new Date(running.start).getTime()) / 1000 / 60 * 10) / 10;
    meta.isTimerRunning = false;

    
    const totalTime = timeEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0);
    meta.totalTimeMinutes = Math.round(totalTime * 10) / 10;

    await todoService.update(request.params.id, {
      aiMetadata: JSON.stringify(meta),
    } as any);

    return reply.send(
      success({ todoId: request.params.id, entry: running, totalMinutes: meta.totalTimeMinutes }, "Timer stopped")
    );
  });

  
  app.get<{ Params: { id: string } }>("/api/todos/:id/time", async (request, reply) => {
    const { todoService } = await import("../../services/todo.service.js");
    const todo = await todoService.findById(request.params.id);
    if (!todo) return reply.code(404).send({ success: false, error: "Todo not found" });

    const meta = todo.aiMetadata ? JSON.parse(todo.aiMetadata) : {};
    return reply.send(
      success({
        todoId: request.params.id,
        entries: meta.timeEntries ?? [],
        totalMinutes: meta.totalTimeMinutes ?? 0,
        isRunning: meta.isTimerRunning ?? false,
      })
    );
  });
}
