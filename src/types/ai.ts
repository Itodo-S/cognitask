export interface DecomposeRequest {
  goal: string;
  context?: string;
  maxTasks?: number;
}

export interface DecomposedTodo {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  estimatedMinutes?: number;
  /** Tickable sub-steps; empty when the task is atomic. */
  checklist?: string[];
  /** Zero-based indexes into the same task array. */
  dependsOn?: number[];
  dueOffsetDays?: number | null;
  tags?: string[];
}

export interface PlanRisk {
  risk: string;
  mitigation: string;
}

export interface DecomposeResult {
  sessionId: string;
  todos: DecomposedTodo[];
  summary: string;
  firstAction?: string;
  assumptions?: string[];
  risks?: PlanRisk[];
  totalEstimatedMinutes?: number;
}

export interface CategorizeRequest {
  title: string;
  description?: string;
}

export interface CategorizeResult {
  category: string;
  confidence: number;
  reasoning: string;
}

export interface PrioritizeRequest {
  title: string;
  description?: string;
  dueDate?: string;
  existingTodos?: { title: string; priority: string }[];
}

export interface PrioritizeResult {
  priority: "low" | "medium" | "high" | "urgent";
  reasoning: string;
}

export interface SuggestRequest {
  currentTodos?: { title: string; status: string; priority: string }[];
  context?: string;
}

export type SuggestionKind =
  | "next_action"
  | "unblock"
  | "break_down"
  | "new_task"
  | "defer"
  | "cleanup";

export interface SuggestionResult {
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

export interface SuggestionsPayload {
  briefing: string;
  focusTodoId?: string | null;
  focusReason?: string | null;
  suggestions: SuggestionResult[];
}

export interface EstimateRequest {
  title: string;
  description?: string;
  complexity?: "simple" | "moderate" | "complex";
}

export interface EstimateResult {
  estimatedMinutes: number;
  complexity: "simple" | "moderate" | "complex";
  reasoning: string;
}

export interface RefineResult {
  improvedTitle: string;
  titleChanged?: boolean;
  suggestedDescription: string;
  suggestedPriority: string;
  suggestedCategory: string;
  estimatedMinutes?: number;
  checklist: string[];
  clarifyingQuestion?: string | null;
  rationale: string;
}

export interface ChecklistSuggestion {
  items: string[];
  note?: string;
}

export interface AgentEvent {
  type: "thinking" | "task_generated" | "complete" | "error";
  data: unknown;
}

export interface SessionInfo {
  id: string;
  claudeSessionId: string | null;
  title: string | null;
  summary: string | null;
  createdAt: string;
  lastModified: string;
}
