"use client";

import { clsx } from "clsx";
import { useTodoStore } from "@/stores/todoStore";
import type { TodoStatus, TodoPriority } from "@/types";

const statusTabs: { value: TodoStatus | "all"; label: string }[] = [
  { value: "all", label: "everything" },
  { value: "pending", label: "to do" },
  { value: "in_progress", label: "doing" },
  { value: "completed", label: "done" },
];

const priorityOptions: { value: TodoPriority | "all"; label: string }[] = [
  { value: "all", label: "any urgency" },
  { value: "urgent", label: "urgent" },
  { value: "high", label: "high" },
  { value: "medium", label: "normal" },
  { value: "low", label: "low" },
];

/** Index tabs along the top of the page. */
export function TodoFilters() {
  const { filter, setFilter } = useTodoStore();
  const active = filter.status ?? "all";

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="relative flex-1">
        <svg
          className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-pencil-300"
          width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"
        >
          <path d="M7 1.6 C9.9 1.4 12.3 4 12.1 6.8 C11.9 9.5 9.3 11.6 6.6 11.2 C4 10.8 2.1 8.2 2.6 5.6 C3 3.3 4.9 1.7 7 1.6 Z M10.6 10.4 C11.9 11.6 13.2 12.9 14.3 14.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
        <input
          type="search"
          placeholder="look for something…"
          value={filter.search ?? ""}
          onChange={(e) => setFilter({ search: e.target.value || undefined })}
          className="write-line pl-6 font-hand text-[19px]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter({ status: tab.value === "all" ? undefined : tab.value })}
            className={clsx(
              "px-3 py-1 font-hand text-[18px] leading-none transition-all",
              active === tab.value
                ? "border-b-[3px] border-ink-800 text-ink-900"
                : "border-b-[3px] border-transparent text-pencil-400 hover:text-ink-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <select
        value={filter.priority ?? "all"}
        onChange={(e) =>
          setFilter({
            priority: e.target.value === "all" ? undefined : (e.target.value as TodoPriority),
          })
        }
        aria-label="Filter by priority"
        className="write-line w-auto cursor-pointer font-type text-[11px] uppercase tracking-widest text-pencil-400"
      >
        {priorityOptions.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
    </div>
  );
}
