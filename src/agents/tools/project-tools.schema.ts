import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const addToProjectSchema = z.object({
  projectId: z.string(),
  todoIds: z.array(z.string()).min(1),
});

export const listProjectsSchema = z.object({});
