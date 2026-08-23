import { create } from "zustand";
import type { Todo, TodoFilter, TodoStats, CreateTodoInput, ChecklistItem } from "@/types";
import { todosApi, checklistApi } from "@/lib/api";

interface TodoStore {
  todos: Todo[];
  stats: TodoStats | null;
  filter: TodoFilter;
  loading: boolean;
  error: string | null;

  setFilter: (filter: Partial<TodoFilter>) => void;
  fetchTodos: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createTodo: (data: CreateTodoInput) => Promise<Todo>;
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  upsertTodo: (todo: Todo) => void;

  addChecklistItem: (todoId: string, text: string) => Promise<void>;
  addChecklistItems: (todoId: string, items: string[]) => Promise<void>;
  toggleChecklistItem: (todoId: string, itemId: string) => Promise<void>;
  updateChecklistItem: (todoId: string, itemId: string, text: string) => Promise<void>;
  removeChecklistItem: (todoId: string, itemId: string) => Promise<void>;
  clearCompletedChecklist: (todoId: string) => Promise<void>;
}

function progressOf(items: ChecklistItem[]) {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Apply a change to one todo wherever it sits in the tree. */
function mapTodo(todos: Todo[], id: string, fn: (t: Todo) => Todo): Todo[] {
  return todos.map((t) => {
    if (t.id === id) return fn(t);
    if (t.subtasks?.length) return { ...t, subtasks: mapTodo(t.subtasks, id, fn) };
    return t;
  });
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  stats: null,
  filter: { limit: 100, offset: 0, parentId: null },
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
      set({ stats: await todosApi.stats() });
    } catch {
      /* stats are decorative; a failure shouldn't surface an error state */
    }
  },

  upsertTodo: (todo) =>
    set((s) => ({
      todos: s.todos.some((t) => t.id === todo.id)
        ? mapTodo(s.todos, todo.id, () => todo)
        : [todo, ...s.todos],
    })),

  createTodo: async (data) => {
    const todo = await todosApi.create(data);
    // Subtasks belong under their parent, not at the top of the page.
    if (todo.parentId) {
      set((s) => ({
        todos: mapTodo(s.todos, todo.parentId!, (p) => ({
          ...p,
          subtasks: [...(p.subtasks ?? []), todo],
        })),
      }));
    } else {
      set((s) => ({ todos: [todo, ...s.todos] }));
    }
    return todo;
  },

  updateTodo: async (id, data) => {
    const updated = await todosApi.update(id, data);
    set((s) => ({ todos: mapTodo(s.todos, id, () => updated) }));
  },

  updateStatus: async (id, status) => {
    // Flip it locally first so the ink lands the moment you click.
    set((s) => ({
      todos: mapTodo(s.todos, id, (t) => ({ ...t, status: status as Todo["status"] })),
    }));
    try {
      const updated = await todosApi.updateStatus(id, status);
      set((s) => ({ todos: mapTodo(s.todos, id, () => updated) }));
    } catch (e) {
      set({ error: (e as Error).message });
      get().fetchTodos();
    }
  },

  deleteTodo: async (id) => {
    const previous = get().todos;
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
    try {
      await todosApi.delete(id);
    } catch (e) {
      set({ todos: previous, error: (e as Error).message });
    }
  },

  addChecklistItem: async (todoId, text) => {
    const res = await checklistApi.add(todoId, text);
    set((s) => ({
      todos: mapTodo(s.todos, todoId, (t) => ({
        ...t,
        ...(res.todo ?? {}),
        checklist: res.items,
        checklistProgress: res.progress,
      })),
    }));
  },

  addChecklistItems: async (todoId, items) => {
    const res = await checklistApi.addMany(todoId, items);
    set((s) => ({
      todos: mapTodo(s.todos, todoId, (t) => ({
        ...t,
        ...(res.todo ?? {}),
        checklist: res.items,
        checklistProgress: res.progress,
      })),
    }));
  },

  toggleChecklistItem: async (todoId, itemId) => {
    const previous = get().todos;

    // Optimistic tick, including the parent status the server would derive.
    set((s) => ({
      todos: mapTodo(s.todos, todoId, (t) => {
        const items = (t.checklist ?? []).map((i) =>
          i.id === itemId ? { ...i, done: !i.done } : i
        );
        const progress = progressOf(items);
        const allDone = progress.total > 0 && progress.done === progress.total;
        return {
          ...t,
          checklist: items,
          checklistProgress: progress,
          status: allDone
            ? "completed"
            : t.status === "completed"
            ? "in_progress"
            : t.status,
        };
      }),
    }));

    try {
      const res = await checklistApi.toggle(itemId);
      set((s) => ({
        todos: mapTodo(s.todos, todoId, (t) => ({
          ...t,
          ...(res.todo ?? {}),
          checklist: res.items,
          checklistProgress: res.progress,
        })),
      }));
    } catch (e) {
      set({ todos: previous, error: (e as Error).message });
    }
  },

  updateChecklistItem: async (todoId, itemId, text) => {
    set((s) => ({
      todos: mapTodo(s.todos, todoId, (t) => ({
        ...t,
        checklist: (t.checklist ?? []).map((i) => (i.id === itemId ? { ...i, text } : i)),
      })),
    }));
    try {
      const res = await checklistApi.update(itemId, { text });
      set((s) => ({
        todos: mapTodo(s.todos, todoId, (t) => ({
          ...t,
          checklist: res.items,
          checklistProgress: res.progress,
        })),
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  removeChecklistItem: async (todoId, itemId) => {
    const previous = get().todos;
    set((s) => ({
      todos: mapTodo(s.todos, todoId, (t) => {
        const items = (t.checklist ?? []).filter((i) => i.id !== itemId);
        return { ...t, checklist: items, checklistProgress: progressOf(items) };
      }),
    }));
    try {
      const res = await checklistApi.remove(itemId);
      set((s) => ({
        todos: mapTodo(s.todos, todoId, (t) => ({
          ...t,
          ...(res.todo ?? {}),
          checklist: res.items,
          checklistProgress: res.progress,
        })),
      }));
    } catch (e) {
      set({ todos: previous, error: (e as Error).message });
    }
  },

  clearCompletedChecklist: async (todoId) => {
    const res = await checklistApi.clearCompleted(todoId);
    set((s) => ({
      todos: mapTodo(s.todos, todoId, (t) => ({
        ...t,
        ...(res.todo ?? {}),
        checklist: res.items,
        checklistProgress: res.progress,
      })),
    }));
  },
}));
