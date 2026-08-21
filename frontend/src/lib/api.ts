import type {
  Todo, TodoFilter, TodoStats, DashboardData, Session,
  AiChatResponse, AiSession, AiSuggestion, AiDecomposeResponse,
  AiCategorizeResponse, AiPrioritizeResponse, AiEstimateResponse,
  DecomposedTodo,
} from "@/types";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000") + "/api";

function stripEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== "" && v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

export const todosApi = {
  list: (filter?: TodoFilter) => {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.set(k, String(v));
      });
    }
    const qs = params.toString();
    return request<Todo[]>(`/todos${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => request<Todo>(`/todos/${id}`),

  create: (data: { title: string; description?: string; priority?: string; category?: string; dueDate?: string; parentId?: string; tags?: string[] }) =>
    request<Todo>("/todos", { method: "POST", body: JSON.stringify(stripEmpty(data as Record<string, unknown>)) }),

  update: (id: string, data: Partial<Todo>) =>
    request<Todo>(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(stripEmpty(data as Record<string, unknown>)) }),

  updateStatus: (id: string, status: string) =>
    request<Todo>(`/todos/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  delete: (id: string) =>
    request<null>(`/todos/${id}`, { method: "DELETE" }),

  tree: () => request<Todo[]>("/todos/tree"),

  stats: () => request<TodoStats>("/todos/stats"),
};

export const aiApi = {
  chat: (message: string, sessionId?: string) =>
    request<AiChatResponse>("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, sessionId }),
    }),

  decompose: (goal: string, context?: string, saveTasks = false) =>
    request<AiDecomposeResponse>("/ai/decompose", {
      method: "POST",
      body: JSON.stringify({ goal, context, saveTasks }),
    }),

  suggest: (context?: string) =>
    request<AiSuggestion[]>("/ai/suggest", {
      method: "POST",
      body: JSON.stringify({ context }),
    }),

  categorize: (title: string, description?: string) =>
    request<AiCategorizeResponse>("/ai/categorize", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    }),

  prioritize: (title: string, description?: string) =>
    request<AiPrioritizeResponse>("/ai/prioritize", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    }),

  estimate: (title: string, description?: string) =>
    request<AiEstimateResponse>("/ai/estimate", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    }),

  autoCategorize: (todoIds: string[]) =>
    request<{ id: string; category: string; confidence: number }[]>("/ai/auto-categorize", {
      method: "POST",
      body: JSON.stringify({ todoIds }),
    }),

  sessions: () => request<AiSession[]>("/ai/sessions"),

  sessionMessages: (id: string) =>
    request<AiSession>(`/ai/sessions/${id}`),

  plan: (goal: string, context?: string, saveTasks = false) =>
    request<{ goal: string; tasks: DecomposedTodo[]; savedIds: string[]; sessionId: string; summary: string }>("/v2/ai/plan", {
      method: "POST",
      body: JSON.stringify({ goal, context, saveTasks }),
    }),

  refine: (todoId: string) =>
    request<{ original: Todo; suggestions: { improvedTitle: string; suggestedDescription: string; suggestedPriority: string; suggestedCategory: string; subtasks: string[] } }>("/v2/ai/refine", {
      method: "POST",
      body: JSON.stringify({ todoId }),
    }),
};

export const dashboardApi = {
  get: () => request<DashboardData>("/dashboard"),
};

export const sessionsApi = {
  list: () => request<Session[]>("/sessions"),
  get: (id: string) => request<Session>(`/sessions/${id}`),
  rename: (id: string, title: string) =>
    request<Session>(`/sessions/${id}/rename`, { method: "POST", body: JSON.stringify({ title }) }),
};
