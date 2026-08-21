import { z } from "zod";

export const undoActionSchema = z.object({
  actionId: z.string(),
});

export const redoActionSchema = z.object({
  actionId: z.string(),
});

export const getHistorySchema = z.object({
  limit: z.number().min(1).max(50).optional().default(10),
});
