import { create } from "zustand";
import type { Todo, TodoFilter, TodoStats } from "@/types";
import { todosApi } from "@/lib/api";

interface TodoStore {
  todos: Todo[];
  stats: TodoStats | null;
  filter: TodoFilter;
  loading: boolean;
  error: string | null;

  setFilter: (filter: Partial<TodoFilter>) => void;
  fetchTodos: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createTodo: (data: { title: string; description?: string; priority?: string; category?: string; dueDate?: string; parentId?: string }) => Promise<Todo>;
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  stats: null,
  filter: { limit: 50, offset: 0 },
  loading: false,
  error: null,

  setFilter: (partial) => {
    set((s) => ({ filter: { ...s.filter, ...partial } }));
    get().fetchTodos();
  },

  fetchTodos: async () => {
    set({ loading: true, error: null });
    try {
      const todos = await todosApi.list(get().filter);
      set({ todos, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await todosApi.stats();
      set({ stats });
    } catch {
      
    }
  },

  createTodo: async (data) => {
    const todo = await todosApi.create(data);
    set((s) => ({ todos: [todo, ...s.todos] }));
    return todo;
  },

  updateTodo: async (id, data) => {
    const updated = await todosApi.update(id, data);
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    }));
  },

  updateStatus: async (id, status) => {
    const updated = await todosApi.updateStatus(id, status);
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    }));
  },

  deleteTodo: async (id) => {
    await todosApi.delete(id);
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
  },
}));
