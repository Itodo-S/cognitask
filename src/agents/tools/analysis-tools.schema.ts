import { z } from "zod";

// ─── get_completion_trends ────────────────────────────────────
export const completionTrendsSchema = z.object({
  days: z.number().min(1).max(90).optional().default(7),
});

export type CompletionTrendsInput = z.infer<typeof completionTrendsSchema>;

// ─── identify_overdue ─────────────────────────────────────────
export const identifyOverdueSchema = z.object({});

// ─── productivity_score ───────────────────────────────────────
export const productivityScoreSchema = z.object({});
