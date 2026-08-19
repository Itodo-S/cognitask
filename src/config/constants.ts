export const APP_NAME = "CogniTask";
export const APP_VERSION = "0.1.0";

export const TODO_STATUSES = ["pending", "in_progress", "completed", "archived"] as const;
export const TODO_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TODO_CATEGORIES = [
  "work",
  "personal",
  "health",
  "finance",
  "learning",
  "creative",
  "errands",
  "social",
  "other",
] as const;

export type TodoStatus = (typeof TODO_STATUSES)[number];
export type TodoPriority = (typeof TODO_PRIORITIES)[number];
export type TodoCategory = (typeof TODO_CATEGORIES)[number];
