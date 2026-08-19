import { z } from "zod";

// ─── list_todos ───────────────────────────────────────────────
export const listTodosToolSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
});

export type ListTodosToolInput = z.infer<typeof listTodosToolSchema>;

// ─── create_todo ──────────────────────────────────────────────
export const createTodoToolSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  category: z.string().optional(),
  dueDate: z.string().optional(),
  parentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateTodoToolInput = z.infer<typeof createTodoToolSchema>;

// ─── update_todo ──────────────────────────────────────────────
export const updateTodoToolSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["pending", "in_progress", "completed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  category: z.string().optional(),
  dueDate: z.string().optional(),
});

export type UpdateTodoToolInput = z.infer<typeof updateTodoToolSchema>;

// ─── complete_todo ────────────────────────────────────────────
export const completeTodoToolSchema = z.object({
  id: z.string(),
});

export type CompleteTodoToolInput = z.infer<typeof completeTodoToolSchema>;

// ─── add_subtask ──────────────────────────────────────────────
export const addSubtaskToolSchema = z.object({
  parentId: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
});

export type AddSubtaskToolInput = z.infer<typeof addSubtaskToolSchema>;

// ─── get_todo_stats ───────────────────────────────────────────
export const getTodoStatsToolSchema = z.object({});

// ─── search_todos ─────────────────────────────────────────────
export const searchTodosToolSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(50).optional().default(10),
});

export type SearchTodosToolInput = z.infer<typeof searchTodosToolSchema>;

// ─── prioritize_todos ─────────────────────────────────────────
export const prioritizeTodosToolSchema = z.object({
  todoIds: z.array(z.string()).min(1),
});

export type PrioritizeTodosToolInput = z.infer<typeof prioritizeTodosToolSchema>;
