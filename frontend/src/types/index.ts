export type TodoStatus = "pending" | "in_progress" | "completed" | "archived";
export type TodoPriority = "low" | "medium" | "high" | "urgent";
export type TodoCategory =
  | "work" | "personal" | "health" | "finance"
  | "learning" | "creative" | "errands" | "social" | "other";

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  category: TodoCategory | null;
  dueDate: string | null;
  completedAt: string | null;
  parentId: string | null;
  aiMetadata: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks?: Todo[];
  tags?: { id: string; name: string }[];
}

export interface TodoFilter {
  status?: TodoStatus;
  priority?: TodoPriority;
  category?: TodoCategory;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TodoStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  archived: number;
  byPriority: Record<TodoPriority, number>;
  byCategory: Record<string, number>;
}

export interface Session {
  id: string;
  claudeSessionId: string | null;
  title: string | null;
  summary: string | null;
  createdAt: string;
  lastModified: string;
}

export interface DecomposedTodo {
  title: string;
  description: string;
  priority: TodoPriority;
  category: string;
  estimatedMinutes?: number;
}

export interface DashboardData {
  stats: TodoStats;
  recentCompletions: { id: string; title: string; completedAt: string }[];
  upcomingDue: { id: string; title: string; dueDate: string; priority: string }[];
}

export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
  recentCompletions: { id: string; title: string; completedAt: string | null }[];
  upcomingDeadlines: { id: string; title: string; dueDate: string | null; category?: string }[];
  categoryBreakdown: { category: string; count: number }[];
  priorityBreakdown: { priority: string; count: number }[];
  aiInsights: string[];
}
