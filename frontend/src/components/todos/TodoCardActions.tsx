"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTodoStore } from "@/stores/todoStore";
import { useToast } from "@/components/ui/Toast";
import { aiApi } from "@/lib/api";
import type { Todo } from "@/types";

interface TodoCardActionsProps {
  todo: Todo;
  onEdit: () => void;
}

/** The little marks you'd make beside a line: start it, fix it, cross it out. */
export function TodoCardActions({ todo, onEdit }: TodoCardActionsProps) {
  const [refining, setRefining] = useState(false);
  const { updateStatus, deleteTodo, updateTodo, addChecklistItems } = useTodoStore();
  const { toast } = useToast();

  const refine = async () => {
    setRefining(true);
    try {
      const { suggestions } = await aiApi.refine(todo.id);
      await updateTodo(todo.id, {
        title: suggestions.improvedTitle,
        description: suggestions.suggestedDescription || todo.description,
        priority: suggestions.suggestedPriority as Todo["priority"],
        category: suggestions.suggestedCategory as Todo["category"],
      });
      if (suggestions.checklist.length > 0 && (todo.checklist ?? []).length === 0) {
        await addChecklistItems(todo.id, suggestions.checklist);
      }
      toast(suggestions.rationale);
    } catch {
      toast("Couldn't reach the assistant", "error");
    } finally {
      setRefining(false);
    }
  };

  return (
    <div
      className={clsx(
        "flex flex-shrink-0 items-center gap-0.5 transition-opacity",
        todo.status === "in_progress"
          ? "opacity-100"
          : "opacity-0 focus-within:opacity-100 group-hover:opacity-100"
      )}
    >
      {todo.status !== "completed" && (
        <Tooltip content={todo.status === "in_progress" ? "Put it down" : "Pick it up"}>
          <button
            onClick={() => {
              const next = todo.status === "in_progress" ? "pending" : "in_progress";
              updateStatus(todo.id, next);
              toast(next === "in_progress" ? "Started" : "Paused");
            }}
            aria-label={todo.status === "in_progress" ? "Pause task" : "Start task"}
            className="grid h-7 w-7 place-items-center rounded-full text-pencil-300 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            {todo.status === "in_progress" ? (
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M4.6 2.8 C4.4 5.6 4.5 8.6 4.7 11.2 M9.4 2.8 C9.2 5.6 9.3 8.6 9.5 11.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M4 2.4 C6.6 4 9.4 5.6 11.6 7 C9.2 8.4 6.4 10 4.1 11.5 C3.8 8.6 3.8 5.4 4 2.4 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
              </svg>
            )}
          </button>
        </Tooltip>
      )}

      <Tooltip content="Sharpen with AI">
        <button
          onClick={refine}
          disabled={refining}
          aria-label="Refine task with AI"
          className="grid h-7 w-7 place-items-center rounded-full text-pencil-300 transition-colors hover:bg-marker-yellow/50 hover:text-ink-800 disabled:opacity-40"
        >
          <span className={clsx("text-[13px] leading-none", refining && "animate-wiggle")}>✦</span>
        </button>
      </Tooltip>

      <Tooltip content="Rewrite">
        <button
          onClick={onEdit}
          aria-label="Edit task"
          className="grid h-7 w-7 place-items-center rounded-full text-pencil-300 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M8.6 2.4 C9.6 3.2 10.6 4.2 11.4 5.2 M1.6 9.6 C3.8 7.2 5.9 5.1 8.2 2.8 C9.2 3.6 10.2 4.6 11 5.6 C8.7 7.9 6.6 10 4.3 12.3 L1.4 12.5 C1.3 11.5 1.4 10.5 1.6 9.6 Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip content="Tear out">
        <button
          onClick={async () => {
            await deleteTodo(todo.id);
            toast("Torn out of the notebook");
          }}
          aria-label="Archive task"
          className="grid h-7 w-7 place-items-center rounded-full text-pencil-300 transition-colors hover:bg-redpen-100 hover:text-redpen-500"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 3.8 C5.4 3.4 8.8 3.4 12.2 3.7 M5.2 3.6 C5.1 3 5.2 2.5 5.4 2.2 C6.5 2.1 7.6 2.1 8.7 2.2 C8.9 2.6 8.9 3.1 8.9 3.7 M3.2 4.2 C3.2 7 3.3 9.6 3.6 11.8 C5.8 12.1 8.3 12.1 10.4 11.8 C10.7 9.6 10.8 7 10.8 4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}
