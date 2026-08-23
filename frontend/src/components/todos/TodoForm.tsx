"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldLabel } from "@/components/ui/Paper";
import { InkCheck } from "@/components/ui/InkCheck";
import { useTodoStore } from "@/stores/todoStore";
import { useToast } from "@/components/ui/Toast";
import type { TodoPriority, TodoCategory } from "@/types";

const priorities: { value: TodoPriority; label: string }[] = [
  { value: "low", label: "low" },
  { value: "medium", label: "normal" },
  { value: "high", label: "high" },
  { value: "urgent", label: "urgent!" },
];

const categories: TodoCategory[] = [
  "work", "personal", "health", "finance",
  "learning", "creative", "errands", "social", "other",
];

interface TodoFormProps {
  open: boolean;
  onClose: () => void;
  parentId?: string;
}

/**
 * Writing a new entry. The checklist is built the way you'd write one on paper:
 * type a line, press Enter, the next blank line appears.
 */
export function TodoForm({ open, onClose, parentId }: TodoFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [category, setCategory] = useState<TodoCategory | "">("");
  const [dueDate, setDueDate] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [line, setLine] = useState("");
  const [loading, setLoading] = useState(false);

  const lineRef = useRef<HTMLInputElement>(null);
  const { createTodo } = useTodoStore();
  const { toast } = useToast();

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategory("");
    setDueDate("");
    setChecklist([]);
    setLine("");
  };

  const addLine = () => {
    const text = line.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, text]);
    setLine("");
    requestAnimationFrame(() => lineRef.current?.focus());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Don't silently lose a line the user typed but didn't press Enter on.
    const pending = line.trim();
    const items = pending ? [...checklist, pending] : checklist;

    setLoading(true);
    try {
      await createTodo({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category: category || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        parentId,
        checklist: items.length ? items : undefined,
      });
      toast(items.length ? `Written down with ${items.length} steps` : "Written down");
      reset();
      onClose();
    } catch {
      toast("Couldn't write that down", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={parentId ? "A step underneath" : "New entry"}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <FieldLabel htmlFor="todo-title">What needs doing</FieldLabel>
          <input
            id="todo-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="write it here…"
            autoFocus
            required
            className="write-line mt-1 font-hand text-[26px] leading-tight"
          />
        </div>

        <div>
          <FieldLabel htmlFor="todo-desc">Notes (optional)</FieldLabel>
          <textarea
            id="todo-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="anything worth remembering…"
            rows={2}
            className="write-line mt-1 resize-none text-[16px] leading-relaxed"
          />
        </div>

        {/* Checklist — entirely optional, and that's the point. */}
        <div>
          <div className="flex items-baseline justify-between">
            <FieldLabel>Steps (optional)</FieldLabel>
            {checklist.length > 0 && (
              <span className="font-type text-[10px] tracking-widest text-pencil-300">
                {checklist.length} line{checklist.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <ul className="mt-1 space-y-0.5">
            <AnimatePresence initial={false}>
              {checklist.map((text, i) => (
                <motion.li
                  key={`${text}-${i}`}
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  className="group/line flex items-start gap-2"
                >
                  <InkCheck size="sm" state="empty" className="mt-[3px] opacity-60" />
                  <span className="flex-1 font-note text-[16px] leading-snug text-ink-700">{text}</span>
                  <button
                    type="button"
                    onClick={() => setChecklist((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${text}`}
                    className="mt-0.5 font-type text-[11px] text-pencil-300 opacity-0 transition-opacity hover:text-redpen-500 group-hover/line:opacity-100"
                  >
                    ✕
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="mt-0.5 flex items-center gap-2">
            <InkCheck size="sm" state="empty" className="mt-[3px] opacity-25" />
            <input
              ref={lineRef}
              value={line}
              onChange={(e) => setLine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLine();
                }
              }}
              placeholder={checklist.length === 0 ? "a step, then Enter…" : "…"}
              className="write-line flex-1 border-b-transparent py-0 text-[16px] focus:border-b-ink-300"
            />
          </div>
        </div>

        <div className="cut-line" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>How urgent</FieldLabel>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={clsx(
                    "px-2.5 py-1 font-hand text-[17px] leading-none transition-all",
                    "rounded-sketch border-2",
                    priority === p.value
                      ? p.value === "urgent"
                        ? "border-redpen-500 bg-redpen-100 text-redpen-600"
                        : "border-ink-800 bg-ink-800 text-paper-50"
                      : "border-pencil-200 text-pencil-400 hover:border-ink-400 hover:text-ink-700"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="todo-cat">Filed under</FieldLabel>
            <select
              id="todo-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as TodoCategory | "")}
              className="write-line mt-1 cursor-pointer font-note text-[16px]"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="todo-due">By when (optional)</FieldLabel>
          <input
            id="todo-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="write-line mt-1 font-type text-[13px] tracking-wide"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Never mind
          </Button>
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? "Writing…" : parentId ? "Add step" : "Write it down"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
