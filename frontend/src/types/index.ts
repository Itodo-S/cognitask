export type TodoStatus = "pending" | "in_progress" | "completed" | "archived";
export type TodoPriority = "low" | "medium" | "high" | "urgent";
export type TodoCategory =
  | "work" | "personal" | "health" | "finance"
  | "learning" | "creative" | "errands" | "social" | "other";

export interface ChecklistItem {
  id: string;
  todoId: string;
  text: string;
  done: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistProgress {
  total: number;
  done: number;
  percent: number;
}

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
  checklist?: ChecklistItem[];
  checklistProgress?: ChecklistProgress;
}

export interface ChecklistResponse {
  todoId: string;
  items: ChecklistItem[];
  progress: ChecklistProgress;
  todo?: Todo;
  item?: ChecklistItem;
}

export interface TodoFilter {
  status?: TodoStatus;
  priority?: TodoPriority;
  category?: TodoCategory;
  search?: string;
  parentId?: string | null;
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

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: string;
  category?: string;
  dueDate?: string;
  parentId?: string;
  tags?: string[];
  checklist?: string[];
}

/* ------------------------------------------------------------------ *
 * AI
 * ------------------------------------------------------------------ */

export interface DecomposedTodo {
  title: string;
  description: string;
  priority: TodoPriority;
  category: string;
  estimatedMinutes?: number;
  checklist?: string[];
  dependsOn?: number[];
  dueOffsetDays?: number | null;
  tags?: string[];
}

export interface PlanRisk {
  risk: string;
  mitigation: string;
}

export interface AiDecomposeResponse {
  todos: DecomposedTodo[];
  summary: string;
  firstAction?: string;
  assumptions?: string[];
  risks?: PlanRisk[];
  totalEstimatedMinutes?: number;
  sessionId?: string;
  savedIds?: string[];
  savedTodos?: Todo[];
}

export type SuggestionKind =
  | "next_action"
  | "unblock"
  | "break_down"
  | "new_task"
  | "defer"
  | "cleanup";

export interface AiSuggestion {
  kind: SuggestionKind;
  title: string;
  description: string;
  reason: string;
  priority: string;
  category: string;
  estimatedMinutes?: number;
  checklist?: string[];
  relatedTodoId?: string | null;
  confidence: number;
}

export interface AiSuggestionsResponse {
  briefing: string;
  focusTodoId?: string | null;
  focusReason?: string | null;
  suggestions: AiSuggestion[];
}

export interface AiRefineResponse {
  original: Todo;
  suggestions: {
    improvedTitle: string;
    titleChanged?: boolean;
    suggestedDescription: string;
    suggestedPriority: string;
    suggestedCategory: string;
    estimatedMinutes?: number;
    checklist: string[];
    clarifyingQuestion?: string | null;
    rationale: string;
  };
}

export interface AiChecklistResponse {
  todo: Todo;
  suggestion: { items: string[]; note?: string };
}

export interface AiStatus {
  configured: boolean;
  model: string | null;
  mode: "claude" | "offline";
}

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface AiChatResponse {
  response: string;
  sessionId: string;
}

export interface AiSession {
  id: string;
  claudeSessionId: string | null;
  title: string | null;
  summary: string | null;
  createdAt: string;
  lastModified: string;
}

export interface AiCategorizeResponse {
  category: string;
  confidence: number;
  reasoning: string;
}

export interface AiPrioritizeResponse {
  priority: string;
  reasoning: string;
}

export interface AiEstimateResponse {
  estimatedMinutes: number;
  complexity: string;
  reasoning: string;
}

/* ------------------------------------------------------------------ *
 * Dashboard
 * ------------------------------------------------------------------ */

export interface DashboardData {
  stats: TodoStats & { overdue: number; completedToday: number; completedThisWeek: number };
  priorityBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  upcomingDue: Todo[];
  recentCompleted: Todo[];
  activeInProgress: Todo[];
}

export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completedToday: number;
  completionRate: number;
  recentCompletions: Todo[];
  upcomingDeadlines: Todo[];
  activeInProgress: Todo[];
  categoryBreakdown: { category: string; count: number }[];
  priorityBreakdown: { priority: string; count: number }[];
}

export interface AiWsEvent {
  event: string;
  payload: unknown;
}
