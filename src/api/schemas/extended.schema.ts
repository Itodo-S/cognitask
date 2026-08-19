import { z } from "zod";

// ─── todo_reminder ────────────────────────────────────────────
export const todoReminderSchema = z.object({
  todoId: z.string(),
  remindAt: z.string().datetime(),
  message: z.string().max(500).optional(),
});

export type TodoReminderInput = z.infer<typeof todoReminderSchema>;

// ─── duplicate_todo ───────────────────────────────────────────
export const duplicateTodoSchema = z.object({
  id: z.string(),
  titleSuffix: z.string().optional().default(" (copy)"),
});

export type DuplicateTodoInput = z.infer<typeof duplicateTodoSchema>;

// ─── move_todo ────────────────────────────────────────────────
export const moveTodoSchema = z.object({
  id: z.string(),
  newParentId: z.string().nullable(),
});

export type MoveTodoInput = z.infer<typeof moveTodoSchema>;

// ─── reorder_todos ────────────────────────────────────────────
export const reorderTodosSchema = z.object({
  todoIds: z.array(z.string()).min(1),
});

export type ReorderTodosInput = z.infer<typeof reorderTodosSchema>;
