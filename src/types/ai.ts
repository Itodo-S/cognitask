export interface DecomposeRequest {
  goal: string;
  context?: string;
  maxTasks?: number;
}

export interface DecomposeResult {
  sessionId: string;
  todos: DecomposedTodo[];
  summary: string;
}

export interface DecomposedTodo {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  estimatedMinutes?: number;
  dependencies?: number[];
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

export interface SuggestionResult {
  title: string;
  description: string;
  priority: string;
  category: string;
  reason: string;
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
