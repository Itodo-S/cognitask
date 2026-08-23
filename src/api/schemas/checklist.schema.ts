import { z } from "zod";

export const checklistItemInput = z.object({
  text: z.string().min(1).max(500),
  done: z.boolean().optional().default(false),
});

export const createChecklistItemSchema = z.object({
  text: z.string().min(1).max(500),
  done: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const updateChecklistItemSchema = z
  .object({
    text: z.string().min(1).max(500).optional(),
    done: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

export const replaceChecklistSchema = z.object({
  items: z
    .array(z.union([z.string().min(1).max(500), checklistItemInput]))
    .max(100)
    .default([]),
});

export const reorderChecklistSchema = z.object({
  orderedIds: z.array(z.string()).min(1).max(100),
});

export const bulkAddChecklistSchema = z.object({
  items: z.array(z.string().min(1).max(500)).min(1).max(100),
});

export type CreateChecklistItemBody = z.infer<typeof createChecklistItemSchema>;
export type UpdateChecklistItemBody = z.infer<typeof updateChecklistItemSchema>;
export type ReplaceChecklistBody = z.infer<typeof replaceChecklistSchema>;
