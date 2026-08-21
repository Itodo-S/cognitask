import { z } from "zod";

export const recurringTodoSchema = z.object({
  parentId: z.string(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  nextDue: z.string().datetime(),
});

export type RecurringTodoInput = z.infer<typeof recurringTodoSchema>;

export const todoCommentSchema = z.object({
  todoId: z.string(),
  content: z.string().min(1).max(2000),
});

export type TodoCommentInput = z.infer<typeof todoCommentSchema>;

export const todoAttachmentSchema = z.object({
  todoId: z.string(),
  filename: z.string().min(1).max(255),
  url: z.string().url(),
});

export type TodoAttachmentInput = z.infer<typeof todoAttachmentSchema>;

export const todoSharingSchema = z.object({
  todoId: z.string(),
  sharedWith: z.array(z.string()).min(1),
  permission: z.enum(["view", "edit"]).optional().default("view"),
});

export type TodoSharingInput = z.infer<typeof todoSharingSchema>;

export const activityLogSchema = z.object({
  todoId: z.string(),
  limit: z.number().min(1).max(100).optional().default(20),
});

export type ActivityLogInput = z.infer<typeof activityLogSchema>;
