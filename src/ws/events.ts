import { wsGateway } from "./gateway.js";

export interface WsEvent {
  event: string;
  payload: unknown;
}

export function broadcastTodoCreated(todo: unknown): void {
  wsGateway.broadcast("todo:created", todo);
}

export function broadcastTodoUpdated(todo: unknown): void {
  wsGateway.broadcast("todo:updated", todo);
}

export function broadcastTodoCompleted(todo: unknown): void {
  wsGateway.broadcast("todo:completed", todo);
}

export function broadcastAiThinking(message: string): void {
  wsGateway.broadcast("ai:thinking", { message });
}

export function broadcastAiTaskGenerated(task: unknown): void {
  wsGateway.broadcast("ai:task_generated", task);
}

export function broadcastAiComplete(todos: unknown, summary: string): void {
  wsGateway.broadcast("ai:decomposition_complete", { todos, summary });
}

export function broadcastStatsUpdated(stats: unknown): void {
  wsGateway.broadcast("stats:updated", stats);
}
