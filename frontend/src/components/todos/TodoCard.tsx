"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { Todo, TodoPriority } from "@/types";
import { useTodoStore } from "@/stores/todoStore";
import { useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

const priorityConfig: Record<TodoPriority, { label: string; dot: string; bg: string }> = {
  urgent: { label: "Urgent", dot: "bg-red-500", bg: "bg-red-50 text-red-700 border-red-200" },
  high: { label: "High", dot: "bg-ink-900", bg: "bg-ink-100 text-ink-800 border-ink-300" },
  medium: { label: "Medium", dot: "bg-ink-500", bg: "bg-ink-50 text-ink-600 border-ink-200" },
  low: { label: "Low", dot: "bg-ink-300", bg: "bg-paper-50 text-ink-500 border-ink-200" },
};

interface TodoCardProps {
  todo: Todo;
  depth?: number;
}

export function TodoCard({ todo, depth = 0 }: TodoCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description ?? "");
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { updateStatus, updateTodo, deleteTodo } = useTodoStore();
  const { toast } = useToast();
  const pConfig = priorityConfig[todo.priority] ?? priorityConfig.medium;

  const handleToggle = async () => {
    const next = todo.status === "completed" ? "pending" : "completed";
    await updateStatus(todo.id, next);
    toast(next === "completed" ? "Task completed!" : "Task reopened");
  };

  const handleSave = async () => {
    await updateTodo(todo.id, { title: editTitle, description: editDesc });
    setEditing(false);
    toast("Task updated");
  };

  const handleDelete = async () => {
    await deleteTodo(todo.id);
    toast("Task archived");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={clsx(
        "group",
        depth > 0 && "ml-4 sm:ml-8 pl-4 border-l-2 border-ink-200/40"
      )}
    >
      <div
        className={clsx(
          "paper-card px-4 py-3 transition-all duration-200",
          todo.status === "completed" && "opacity-60",
          todo.priority === "urgent" && "border-l-2 border-l-red-400"
        )}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={handleToggle}
            className={clsx(
              "flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center",
              "transition-all duration-200",
              todo.status === "completed"
                ? "bg-ink-900 border-ink-900"
                : "border-ink-300 hover:border-ink-500"
            )}
          >
            <AnimatePresence mode="wait">
              {todo.status === "completed" && (
                <motion.svg
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                >
                  <path d="M2.5 6l2.5 2.5L9.5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                />
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Add a description..."
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h3
                    className={clsx(
                      "font-serif text-sm font-medium leading-snug",
                      todo.status === "completed" && "line-through text-ink-400"
                    )}
                  >
                    {todo.title}
                  </h3>
                </div>

                <AnimatePresence>
                  {todo.description && expanded && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="font-sans text-xs text-ink-500 mt-1 leading-relaxed overflow-hidden"
                    >
                      {todo.description}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Tooltip content={`Priority: ${pConfig.label}`}>
                    <span className={clsx("paper-badge", pConfig.bg)}>
                      <span className={clsx("w-1.5 h-1.5 rounded-full mr-1", pConfig.dot)} />
                      {pConfig.label}
                    </span>
                  </Tooltip>

                  {todo.category && (
                    <span className="paper-badge bg-paper-100 text-ink-500 border-ink-200">
                      {todo.category}
                    </span>
                  )}

                  {todo.dueDate && (
                    <span className="font-sans text-[11px] text-ink-400">
                      Due {new Date(todo.dueDate).toLocaleDateString()}
                    </span>
                  )}

                  {todo.description && (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="font-sans text-[11px] text-ink-400 hover:text-ink-600 underline"
                    >
                      {expanded ? "less" : "more"}
                    </button>
                  )}

                  {todo.subtasks && todo.subtasks.length > 0 && (
                    <button
                      onClick={() => setShowSubtasks(!showSubtasks)}
                      className="font-sans text-[11px] text-ink-400 hover:text-ink-600 underline"
                    >
                      {showSubtasks ? "hide" : `${todo.subtasks.length} subtasks`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          {!editing && (
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Tooltip content="Edit" side="top">
                <button
                  onClick={() => setEditing(true)}
                  className="w-7 h-7 flex items-center justify-center rounded text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8.5 2.5l3 3M1.5 9.5l6-6 3 3-6 6H1.5v-3z"/></svg>
                </button>
              </Tooltip>
              <Tooltip content="Archive" side="top">
                <button
                  onClick={handleDelete}
                  className="w-7 h-7 flex items-center justify-center rounded text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h10M5 4V2.5h4V4M3 4v7.5a1 1 0 001 1h6a1 1 0 001-1V4"/></svg>
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {/* Subtasks */}
      <AnimatePresence>
        {showSubtasks && todo.subtasks && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1 space-y-1 overflow-hidden"
          >
            {todo.subtasks.map((sub) => (
              <TodoCard key={sub.id} todo={sub} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
