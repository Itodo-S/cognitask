import { z } from "zod";

export const notificationPrefsSchema = z.object({
  enabled: z.boolean().optional().default(true),
  dueDateReminder: z.boolean().optional().default(true),
  reminderMinutesBefore: z.number().min(1).max(1440).optional().default(30),
  dailyDigest: z.boolean().optional().default(false),
  digestTime: z.string().regex(/^\d{2}:\d{2}$/).optional().default("09:00"),
});

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export const themePrefsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional().default("system"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#6366f1"),
  fontSize: z.enum(["small", "medium", "large"]).optional().default("medium"),
  compactMode: z.boolean().optional().default(false),
});

export type ThemePrefs = z.infer<typeof themePrefsSchema>;

export const sortingPrefsSchema = z.object({
  defaultSort: z.enum(["created", "updated", "priority", "dueDate", "title"]).optional().default("created"),
  defaultOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  groupBy: z.enum(["none", "status", "priority", "category"]).optional().default("none"),
});

export type SortingPrefs = z.infer<typeof sortingPrefsSchema>;
