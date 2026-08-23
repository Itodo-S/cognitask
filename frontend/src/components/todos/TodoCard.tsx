"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { Todo, TodoPriority } from "@/types";
import { useTodoStore } from "@/stores/todoStore";
import { useToast } from "@/components/ui/Toast";
import { InkCheck, InkStrike } from "@/components/ui/InkCheck";
import { Checklist } from "./Checklist";
import { TodoCardActions } from "./TodoCardActions";
import { TodoCardEditForm } from "./TodoCardEditForm";

const priorityMark: Record<TodoPriority, { label: string; className: string }> = {
  urgent: { label: "!!", className: "text-redpen-500" },
  high: { label: "!", className: "text-redpen-400" },
  medium: { label: "", className: "" },
  low: { label: "", className: "" },
};

function dueLabel(iso: string) {
  const due = new Date(iso);
  const today = new Date();
  const days = Math.round(
    (new Date(due.toDateString()).getTime() - new Date(today.toDateString()).getTime()) / 86400000
  );

  if (days < 0) return { text: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { text: "today", overdue: false, soon: true };
  if (days === 1) return { text: "tomorrow", overdue: false, soon: true };
  if (days <= 6) return { text: due.toLocaleDateString(undefined, { weekday: "long" }), overdue: false };
  return { text: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }), overdue: false };
}

interface TodoCardProps {
  todo: Todo;
  depth?: number;
  index?: number;
}

export function TodoCard({ todo, depth = 0, index = 0 }: TodoCardProps) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);

  const { updateStatus } = useTodoStore();
  const { toast } = useToast();

  const completed = todo.status === "completed";
  const urgent = todo.priority === "urgent" && !completed;
  const tone = urgent ? "red" : "ink";

  const checklist = todo.checklist ?? [];
  const doneCount = checklist.filter((i) => i.done).length;
  const checkState = completed
    ? "checked"
    : checklist.length > 0 && doneCount > 0
    ? "half"
    : "empty";

  const due = todo.dueDate ? dueLabel(todo.dueDate) : null;
  const mark = priorityMark[todo.priority] ?? priorityMark.medium;

  const toggle = async () => {
    const next = completed ? "pending" : "completed";
    await updateStatus(todo.id, next);
    toast(next === "completed" ? "Crossed off ✓" : "Back on the list");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -14, transition: { duration: 0.16 } }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={clsx("group relative", depth > 0 && "ml-5 sm:ml-8")}
    >
      {/* Subtasks hang off a bracket drawn from the parent. */}
      {depth > 0 && (
        <span
          aria-hidden="true"
          className="absolute -left-4 top-0 h-full w-4 border-b-2 border-l-2 border-dashed border-pencil-200"
          style={{ height: "1.6rem", borderBottomLeftRadius: "8px" }}
        />
      )}

      <div
        className={clsx(
          "relative rounded-[3px] px-3 py-2 transition-colors duration-200",
          "border-b border-dashed border-rule-soft",
          !completed && "hover:bg-marker-yellow/20",
          completed && "opacity-60",
          urgent && "bg-redpen-100/25"
        )}
      >
        <div className="flex items-start gap-3">
          {/* Red margin marks for urgency, in the left gutter. */}
          {mark.label && !completed && (
            <span
              className={clsx("margin-note absolute -left-5 top-2 text-xl font-bold", mark.className)}
              aria-label={`${todo.priority} priority`}
            >
              {mark.label}
            </span>
          )}

          <InkCheck
            state={checkState}
            tone={tone}
            onClick={toggle}
            label={completed ? `Reopen ${todo.title}` : `Complete ${todo.title}`}
            className="mt-0.5"
          />

          <div className="min-w-0 flex-1">
            {editing ? (
              <TodoCardEditForm todo={todo} onClose={() => setEditing(false)} />
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <button
                    onClick={() => setOpen(!open)}
                    className="relative min-w-0 text-left"
                  >
                    <span
                      className={clsx(
                        "font-hand text-[22px] leading-tight tracking-wide",
                        completed ? "text-pencil-300" : urgent ? "text-redpen-600" : "text-ink-900"
                      )}
                    >
                      {todo.title}
                    </span>
                    {completed && <InkStrike tone={tone} />}
                  </button>

                  {todo.status === "in_progress" && (
                    <span className="stamp stamp-ink">in progress</span>
                  )}

                  {due && !completed && (
                    <span
                      className={clsx(
                        "font-type text-[10px] tracking-wide",
                        due.overdue
                          ? "stamp stamp-red"
                          : due.soon
                          ? "text-redpen-400"
                          : "text-pencil-400"
                      )}
                    >
                      {due.text}
                    </span>
                  )}

                  {checklist.length > 0 && (
                    <span className="font-type text-[10px] tracking-widest text-pencil-300">
                      {doneCount}/{checklist.length}
                    </span>
                  )}

                  {todo.category && (
                    <span className="font-type text-[10px] lowercase tracking-wide text-ink-400">
                      #{todo.category}
                    </span>
                  )}
                </div>

                {todo.description && !open && (
                  <p className="mt-0.5 truncate font-note text-[14px] text-pencil-400">
                    {todo.description}
                  </p>
                )}
              </>
            )}
          </div>

          {!editing && <TodoCardActions todo={todo} onEdit={() => setEditing(true)} />}
        </div>

        {/* Everything written under the line, revealed on click. */}
        <AnimatePresence initial={false}>
          {open && !editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden pl-9"
            >
              {todo.description && (
                <p className="mb-1 mt-1 font-note text-[15px] leading-relaxed text-pencil-500">
                  {todo.description}
                </p>
              )}
              <Checklist todoId={todo.id} items={checklist} tone={tone} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed: still show unfinished lines so nothing hides. */}
        {!open && !editing && checklist.length > 0 && (
          <ul className="mt-1 space-y-0.5 pl-9">
            {checklist
              .filter((i) => !i.done)
              .slice(0, 3)
              .map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <InkCheck
                    size="sm"
                    tone={tone}
                    state="empty"
                    onClick={() => useTodoStore.getState().toggleChecklistItem(todo.id, item.id)}
                    label={`Check ${item.text}`}
                    className="mt-[3px]"
                  />
                  <span className="font-note text-[15px] leading-snug text-ink-600">{item.text}</span>
                </li>
              ))}
            {checklist.filter((i) => !i.done).length > 3 && (
              <li className="pl-6 font-type text-[10px] tracking-widest text-pencil-300">
                +{checklist.filter((i) => !i.done).length - 3} more
              </li>
            )}
          </ul>
        )}
      </div>

      {todo.subtasks && todo.subtasks.length > 0 && (
        <div className="mt-0.5">
          {todo.subtasks.map((sub, i) => (
            <TodoCard key={sub.id} todo={sub} depth={depth + 1} index={i} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
