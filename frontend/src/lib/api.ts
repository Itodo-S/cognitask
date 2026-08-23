import type {
  Todo, TodoFilter, TodoStats, DashboardData, Session, CreateTodoInput,
  ChecklistResponse, AiChatResponse, AiSession, AiSuggestionsResponse,
  AiDecomposeResponse, AiCategorizeResponse, AiPrioritizeResponse,
  AiEstimateResponse, AiRefineResponse, AiChecklistResponse, AiStatus,
} from "@/types";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "") + "/api";

function stripEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (init?.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }

  const json = await res.json();
  return (json.data ?? json) as T;
}

export const todosApi = {
  list: (filter?: TodoFilter) => {
    const params = new URLSearchParams();
    if (filter) {
      for (const [k, v] of Object.entries(filter)) {
        if (v === undefined) continue;
        params.set(k, v === null ? "null" : String(v));
      }
    }
    const qs = params.toString();
    return request<Todo[]>(`/todos${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => request<Todo>(`/todos/${id}`),

  create: (data: CreateTodoInput) =>
    request<Todo>("/todos", {
      method: "POST",
      body: JSON.stringify(stripEmpty(data as unknown as Record<string, unknown>)),
    }),

  update: (id: string, data: Partial<Todo>) =>
    request<Todo>(`/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(stripEmpty(data as Record<string, unknown>)),
    }),

  updateStatus: (id: string, status: string) =>
    request<Todo>(`/todos/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  delete: (id: string) => request<null>(`/todos/${id}`, { method: "DELETE" }),

  restore: (id: string) => request<Todo>(`/todos/${id}/restore`, { method: "POST" }),

  addSubtask: (parentId: string, data: CreateTodoInput) =>
    request<Todo>(`/todos/${parentId}/subtasks`, {
      method: "POST",
      body: JSON.stringify(stripEmpty(data as unknown as Record<string, unknown>)),
    }),

  tree: () => request<Todo[]>("/todos/tree"),

  stats: () => request<TodoStats>("/todos/stats"),
};

export const checklistApi = {
  list: (todoId: string) => request<ChecklistResponse>(`/todos/${todoId}/checklist`),

  add: (todoId: string, text: string) =>
    request<ChecklistResponse>(`/todos/${todoId}/checklist`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  addMany: (todoId: string, items: string[]) =>
    request<ChecklistResponse>(`/todos/${todoId}/checklist/bulk`, {
      method: "POST",
      body: JSON.stringify({ items }),
    }),

  replace: (todoId: string, items: Array<string | { text: string; done?: boolean }>) =>
    request<ChecklistResponse>(`/todos/${todoId}/checklist`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    }),

  reorder: (todoId: string, orderedIds: string[]) =>
    request<ChecklistResponse>(`/todos/${todoId}/checklist/reorder`, {
      method: "POST",
      body: JSON.stringify({ orderedIds }),
    }),

  clearCompleted: (todoId: string) =>
    request<ChecklistResponse>(`/todos/${todoId}/checklist/completed`, { method: "DELETE" }),

  toggle: (itemId: string) =>
    request<ChecklistResponse>(`/checklist/${itemId}/toggle`, { method: "POST" }),

  update: (itemId: string, data: { text?: string; done?: boolean }) =>
    request<ChecklistResponse>(`/checklist/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  remove: (itemId: string) =>
    request<ChecklistResponse>(`/checklist/${itemId}`, { method: "DELETE" }),
};

export const aiApi = {
  status: () => request<AiStatus>("/ai/status"),

  chat: (message: string, sessionId?: string, history?: { role: "user" | "assistant"; content: string }[]) =>
    request<AiChatResponse>("/ai/chat", {
      method: "POST",
      body: JSON.stringify(stripEmpty({ message, sessionId, history })),
    }),

  decompose: (goal: string, context?: string, saveTasks = false, maxTasks?: number) =>
    request<AiDecomposeResponse>("/ai/decompose", {
      method: "POST",
      body: JSON.stringify(stripEmpty({ goal, context, saveTasks, maxTasks })),
    }),

  suggest: (context?: string) =>
    request<AiSuggestionsResponse>("/ai/suggest", {
      method: "POST",
      body: JSON.stringify(stripEmpty({ context })),
    }),

  refine: (todoId: string) =>
    request<AiRefineResponse>("/ai/refine", { method: "POST", body: JSON.stringify({ todoId }) }),

  /** Ask the model for checklist lines; `apply` writes them straight onto the task. */
  checklist: (todoId: string, options: { hint?: string; apply?: boolean } = {}) =>
    request<AiChecklistResponse>("/ai/checklist", {
      method: "POST",
      body: JSON.stringify(stripEmpty({ todoId, ...options })),
    }),

  categorize: (title: string, description?: string) =>
    request<AiCategorizeResponse>("/ai/categorize", {
      method: "POST",
      body: JSON.stringify(stripEmpty({ title, description })),
    }),

  prioritize: (title: string, description?: string) =>
    request<AiPrioritizeResponse>("/ai/prioritize", {
      method: "POST",
      body: JSON.stringify(stripEmpty({ title, description })),
    }),

  estimate: (title: string, description?: string) =>
    request<AiEstimateResponse>("/ai/estimate", {
      method: "POST",
      body: JSON.stringify(stripEmpty({ title, description })),
    }),

  autoCategorize: (todoIds: string[]) =>
    request<{ id: string; category: string; confidence: number; reasoning: string }[]>(
      "/ai/auto-categorize",
      { method: "POST", body: JSON.stringify({ todoIds }) }
    ),

  sessions: () => request<AiSession[]>("/ai/sessions"),
};

export const dashboardApi = {
  get: () => request<DashboardData>("/dashboard"),
};

export const sessionsApi = {
  list: () => request<Session[]>("/sessions"),
  get: (id: string) => request<Session>(`/sessions/${id}`),
};
