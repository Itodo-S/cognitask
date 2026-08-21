import { z } from "zod";

export const quickAddToolSchema = z.object({
  text: z.string().min(1).max(1000),
});

export type QuickAddToolInput = z.infer<typeof quickAddToolSchema>;

export const focusModeSchema = z.object({
  todoId: z.string(),
  duration: z.number().min(5).max(480).optional().default(25),
});

export type FocusModeInput = z.infer<typeof focusModeSchema>;

export const dailySummarySchema = z.object({});

export const smartSortSchema = z.object({
  strategy: z.enum(["priority", "dueDate", "category", "estimated"]).optional().default("priority"),
});

export type SmartSortInput = z.infer<typeof smartSortSchema>;
