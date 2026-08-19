import { z } from "zod";

// ─── priority_sort ────────────────────────────────────────────
export const prioritySortSchema = z.object({
  todoIds: z.array(z.string()).min(1),
  direction: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type PrioritySortInput = z.infer<typeof prioritySortSchema>;

// ─── tag_filter ───────────────────────────────────────────────
export const tagFilterSchema = z.object({
  tagNames: z.array(z.string()).min(1),
  matchAll: z.boolean().optional().default(false),
});

export type TagFilterInput = z.infer<typeof tagFilterSchema>;

// ─── due_date_filter ──────────────────────────────────────────
export const dueDateFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  includeNoDate: z.boolean().optional().default(false),
});

export type DueDateFilterInput = z.infer<typeof dueDateFilterSchema>;

// ─── text_search ──────────────────────────────────────────────
export const textSearchSchema = z.object({
  query: z.string().min(1),
  fields: z.array(z.enum(["title", "description", "category"])).optional().default(["title"]),
});

export type TextSearchInput = z.infer<typeof textSearchSchema>;
