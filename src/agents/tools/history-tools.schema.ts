import { z } from "zod";

// ─── undo_action ──────────────────────────────────────────────
export const undoActionSchema = z.object({
  actionId: z.string(),
});

// ─── redo_action ──────────────────────────────────────────────
export const redoActionSchema = z.object({
  actionId: z.string(),
});

// ─── get_history ──────────────────────────────────────────────
export const getHistorySchema = z.object({
  limit: z.number().min(1).max(50).optional().default(10),
});
