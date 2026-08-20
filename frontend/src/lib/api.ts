import type { Todo, TodoFilter, TodoStats, DashboardData, Session } from "@/types";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001") + "/api";

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

// ── Todos ─────────────────────────────────────────────────────
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
    request<Todo>("/todos", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Todo>) =>
    request<Todo>(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  updateStatus: (id: string, status: string) =>
    request<Todo>(`/todos/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  delete: (id: string) =>
    request<null>(`/todos/${id}`, { method: "DELETE" }),

  tree: () => request<Todo[]>("/todos/tree"),

  stats: () => request<TodoStats>("/todos/stats"),
};

// ── AI ────────────────────────────────────────────────────────
export const aiApi = {
  decompose: (goal: string, context?: string) =>
    request<{ events: unknown[]; result: unknown }>("/ai/decompose", {
      method: "POST",
      body: JSON.stringify({ goal, context }),
    }),

  categorize: (title: string, description?: string) =>
    request<{ category: string; confidence: number; reasoning: string }>("/ai/categorize", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    }),

  prioritize: (title: string, description?: string) =>
    request<{ priority: string; reasoning: string }>("/ai/prioritize", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    }),

  suggest: (context?: string) =>
    request<{ title: string; description: string; priority: string; category: string; reason: string }[]>("/ai/suggest", {
      method: "POST",
      body: JSON.stringify({ context }),
    }),

  estimate: (title: string, description?: string) =>
    request<{ estimatedMinutes: number; complexity: string; reasoning: string }>("/ai/estimate", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    }),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  get: () => request<DashboardData>("/dashboard"),
};

// ── Sessions ──────────────────────────────────────────────────
export const sessionsApi = {
  list: () => request<Session[]>("/sessions"),
  get: (id: string) => request<Session>(`/sessions/${id}`),
  rename: (id: string, title: string) =>
    request<Session>(`/sessions/${id}/rename`, { method: "POST", body: JSON.stringify({ title }) }),
};
