import { z } from "zod";

export const decomposeSchema = z.object({
  goal: z.string().min(1).max(2000),
  context: z.string().max(2000).optional(),
  maxTasks: z.number().min(1).max(20).optional().default(6),
  saveTasks: z.boolean().optional().default(false),
});

export const categorizeSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
});

export const prioritizeSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  dueDate: z.string().datetime().optional(),
  existingTodos: z
    .array(
      z.object({
        title: z.string(),
        priority: z.string(),
      })
    )
    .optional(),
});

export const suggestSchema = z.object({
  currentTodos: z
    .array(
      z.object({
        title: z.string(),
        status: z.string(),
        priority: z.string(),
      })
    )
    .optional(),
  context: z.string().max(2000).optional(),
});

export const estimateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  complexity: z.enum(["simple", "moderate", "complex"]).optional(),
});

export type DecomposeBody = z.infer<typeof decomposeSchema>;
export type CategorizeBody = z.infer<typeof categorizeSchema>;
export type PrioritizeBody = z.infer<typeof prioritizeSchema>;
export type SuggestBody = z.infer<typeof suggestSchema>;
export type EstimateBody = z.infer<typeof estimateSchema>;
