import { z } from "zod";

// ─── decompose_goal ───────────────────────────────────────────
export const decomposeGoalToolSchema = z.object({
  goal: z.string().min(1).max(2000),
  maxTasks: z.number().min(1).max(50).optional().default(10),
  context: z.string().max(2000).optional(),
});

export type DecomposeGoalToolInput = z.infer<typeof decomposeGoalToolSchema>;

// ─── suggest_tasks ────────────────────────────────────────────
export const suggestTasksToolSchema = z.object({
  context: z.string().max(2000).optional(),
  currentTaskCount: z.number().optional(),
});

export type SuggestTasksToolInput = z.infer<typeof suggestTasksToolSchema>;

// ─── analyze_productivity ─────────────────────────────────────
export const analyzeProductivityToolSchema = z.object({});

// ─── bulk_categorize ──────────────────────────────────────────
export const bulkCategorizeToolSchema = z.object({
  todoIds: z.array(z.string()).min(1).max(50),
});

export type BulkCategorizeToolInput = z.infer<typeof bulkCategorizeToolSchema>;
