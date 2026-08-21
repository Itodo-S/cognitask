"use client";

import { clsx } from "clsx";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTodoStore } from "@/stores/todoStore";
import { useToast } from "@/components/ui/Toast";
import type { Todo } from "@/types";

interface TodoCardActionsProps {
  todo: Todo;
  onEdit: () => void;
}

export function TodoCardActions({ todo, onEdit }: TodoCardActionsProps) {
  const { updateStatus, deleteTodo } = useTodoStore();
  const { toast } = useToast();

  const handleDelete = async () => {
    await deleteTodo(todo.id);
    toast("Task archived");
  };

  return (
    <div
      className={clsx(
        "flex-shrink-0 flex items-center gap-1 transition-opacity",
        todo.status === "in_progress" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}
    >
      {todo.status !== "completed" && (
        <Tooltip content={todo.status === "in_progress" ? "Pause" : "Start"} side="top">
          <button
            onClick={() => {
              const next = todo.status === "in_progress" ? "pending" : "in_progress";
              updateStatus(todo.id, next);
              toast(next === "in_progress" ? "Task started" : "Task paused");
            }}
            className="w-7 h-7 flex items-center justify-center rounded text-ink-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            {todo.status === "in_progress" ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="3" y="3" width="3" height="8" />
                <rect x="8" y="3" width="3" height="8" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M4 2.5v9l7-4.5-7-4.5z" />
              </svg>
            )}
          </button>
        </Tooltip>
      )}
      <Tooltip content="Edit" side="top">
        <button
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center rounded text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8.5 2.5l3 3M1.5 9.5l6-6 3 3-6 6H1.5v-3z" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Archive" side="top">
        <button
          onClick={handleDelete}
          className="w-7 h-7 flex items-center justify-center rounded text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 4h10M5 4V2.5h4V4M3 4v7.5a1 1 0 001 1h6a1 1 0 001-1V4" />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}
