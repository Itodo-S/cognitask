"use client";

import { clsx } from "clsx";
import { useTodoStore } from "@/stores/todoStore";
import type { TodoStatus, TodoPriority } from "@/types";

const statusFilters: { value: TodoStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const priorityFilters: { value: TodoPriority | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function TodoFilters() {
  const { filter, setFilter } = useTodoStore();

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        >
          <circle cx="6" cy="6" r="4.5" />
          <path d="M9.5 9.5L13 13" />
        </svg>
        <input
          type="text"
          placeholder="Search tasks..."
          value={filter.search ?? ""}
          onChange={(e) => setFilter({ search: e.target.value || undefined })}
          className="paper-input pl-9"
        />
      </div>

      {/* Status */}
      <div className="flex gap-1 bg-paper-100 rounded-lg p-1 border border-ink-200/40">
        {statusFilters.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter({ status: s.value === "all" ? undefined : s.value })}
            className={clsx(
              "px-3 py-1.5 rounded-md font-sans text-xs font-medium transition-all",
              (filter.status ?? "all") === s.value
                ? "bg-ink-900 text-paper-50 shadow-paper"
                : "text-ink-500 hover:text-ink-700 hover:bg-paper-50"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Priority */}
      <select
        value={filter.priority ?? "all"}
        onChange={(e) => setFilter({ priority: e.target.value === "all" ? undefined : e.target.value as TodoPriority })}
        className="paper-input w-auto"
      >
        {priorityFilters.map((p) => (
          <option key={p.value} value={p.value}>{p.label} Priority</option>
        ))}
      </select>
    </div>
  );
}
