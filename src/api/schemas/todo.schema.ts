import { z } from "zod";
import { TODO_STATUSES, TODO_PRIORITIES, TODO_CATEGORIES } from "../../config/constants.js";
import type { TodoPriority, TodoCategory } from "../../config/constants.js";

export const createTodoSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(TODO_STATUSES).optional().default("pending"),
  // The AI (and older clients) send free-form casing, so coerce rather than reject.
  priority: z.any().optional().transform((val): TodoPriority => {
    if (typeof val !== "string") return "medium";
    const lower = val.toLowerCase();
    return (TODO_PRIORITIES as readonly string[]).includes(lower) ? (lower as TodoPriority) : "medium";
  }),
  category: z.any().optional().transform((val): TodoCategory | undefined => {
    if (typeof val !== "string" || !val.trim()) return undefined;
    const lower = val.toLowerCase();
    return (TODO_CATEGORIES as readonly string[]).includes(lower) ? (lower as TodoCategory) : "other";
  }),
  dueDate: z.string().datetime().optional(),
  parentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  checklist: z.array(z.string().min(1).max(500)).max(100).optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(TODO_STATUSES).optional(),
  priority: z.enum(TODO_PRIORITIES).optional(),
  category: z.enum(TODO_CATEGORIES).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

export const todoFilterSchema = z.object({
  status: z.enum(TODO_STATUSES).optional(),
  priority: z.enum(TODO_PRIORITIES).optional(),
  category: z.enum(TODO_CATEGORIES).optional(),
  parentId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === "null" || v === "root" || v === "" ? null : v)),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export const batchCreateTodoSchema = z.object({
  todos: z.array(createTodoSchema).min(1).max(50),
});

export const updateTodoStatusSchema = z.object({
  status: z.enum(TODO_STATUSES),
});

export const todoIdParamSchema = z.object({
  id: z.string(),
});

export type CreateTodoBody = z.infer<typeof createTodoSchema>;
export type UpdateTodoBody = z.infer<typeof updateTodoSchema>;
export type TodoFilterQuery = z.infer<typeof todoFilterSchema>;
export type BatchCreateBody = z.infer<typeof batchCreateTodoSchema>;
export type UpdateTodoStatusBody = z.infer<typeof updateTodoStatusSchema>;
