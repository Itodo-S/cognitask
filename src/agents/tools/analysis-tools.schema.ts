import { z } from "zod";

export const completionTrendsSchema = z.object({
  days: z.number().min(1).max(90).optional().default(7),
});

export type CompletionTrendsInput = z.infer<typeof completionTrendsSchema>;

export const identifyOverdueSchema = z.object({});

export const productivityScoreSchema = z.object({});
