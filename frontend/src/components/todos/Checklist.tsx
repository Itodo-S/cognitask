"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { ChecklistItem } from "@/types";
import { useTodoStore } from "@/stores/todoStore";
import { useToast } from "@/components/ui/Toast";
import { InkCheck, InkStrike } from "@/components/ui/InkCheck";
import { aiApi } from "@/lib/api";

interface ChecklistProps {
  todoId: string;
  items: ChecklistItem[];
  /** Urgent tasks are worked in red pen. */
  tone?: "ink" | "red";
  compact?: boolean;
}

/**
 * The lines written inside a task. Typing Enter on the last line starts a new
 * one, the way a list on paper grows downward — so adding five items never
 * requires touching the mouse.
 */
export function Checklist({ todoId, items, tone = "ink", compact }: ChecklistProps) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);

  const draftRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const {
    addChecklistItem,
    toggleChecklistItem,
    updateChecklistItem,
    removeChecklistItem,
    clearCompletedChecklist,
    addChecklistItems,
  } = useTodoStore();
  const { toast } = useToast();

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const commitDraft = async (keepFocus: boolean) => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      await addChecklistItem(todoId, text);
      if (keepFocus) requestAnimationFrame(() => draftRef.current?.focus());
    } catch {
      setDraft(text);
      toast("Couldn't add that line", "error");
    }
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const text = editText.trim();
    const original = items.find((i) => i.id === editingId);
    setEditingId(null);
    if (!text || text === original?.text) return;
    try {
      await updateChecklistItem(todoId, editingId, text);
    } catch {
      toast("Couldn't save that line", "error");
    }
  };

  const askAiForLines = async () => {
    setBusy(true);
    try {
      const res = await aiApi.checklist(todoId, { apply: false });
      const fresh = res.suggestion.items.filter(
        (line) => !items.some((i) => i.text.toLowerCase() === line.toLowerCase())
      );
      if (fresh.length === 0) {
        toast(res.suggestion.note ?? "Nothing to add — this one's atomic");
        return;
      }
      await addChecklistItems(todoId, fresh);
      toast(`Added ${fresh.length} line${fresh.length === 1 ? "" : "s"}`);
    } catch {
      toast("Couldn't reach the assistant", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={clsx("mt-2", compact ? "pl-1" : "pl-1")}>
      {total > 0 && (
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-type text-[10px] tracking-widest text-pencil-400">
            {done}/{total}
          </span>

          {/* Progress drawn as a pencil line being filled in with ink. */}
          <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-pencil-100">
            <motion.span
              className={clsx(
                "absolute inset-y-0 left-0 rounded-full",
                tone === "red" ? "bg-redpen-400" : "bg-ink-600"
              )}
              initial={false}
              animate={{ width: `${percent}%` }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            />
          </span>

          {done > 0 && (
            <button
              onClick={() => clearCompletedChecklist(todoId).catch(() => toast("Couldn't clear", "error"))}
              className="font-type text-[9px] uppercase tracking-widest text-pencil-300 transition-colors hover:text-redpen-500"
            >
              tear off done
            </button>
          )}
        </div>
      )}

      <ul className="space-y-0.5">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10, height: 0 }}
              transition={{ duration: 0.18 }}
              className="group/item flex items-start gap-2 py-[3px]"
            >
              <InkCheck
                size="sm"
                tone={tone}
                state={item.done ? "checked" : "empty"}
                onClick={() => toggleChecklistItem(todoId, item.id)}
                label={item.done ? `Uncheck ${item.text}` : `Check ${item.text}`}
                className="mt-[3px]"
              />

              {editingId === item.id ? (
                <input
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitEdit();
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="write-line flex-1 py-0 text-[16px] leading-snug"
                />
              ) : (
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setEditText(item.text);
                  }}
                  className="relative flex-1 text-left"
                >
                  <span
                    className={clsx(
                      "font-note text-[16px] leading-snug transition-colors",
                      item.done ? "text-pencil-300" : "text-ink-700"
                    )}
                  >
                    {item.text}
                  </span>
                  {item.done && <InkStrike tone={tone} />}
                </button>
              )}

              <button
                onClick={() => removeChecklistItem(todoId, item.id)}
                aria-label={`Remove ${item.text}`}
                className="mt-0.5 opacity-0 transition-opacity focus:opacity-100 group-hover/item:opacity-100"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-pencil-300 hover:text-redpen-500" aria-hidden="true">
                  <path d="M2.4 2.6 C4.4 4.6 7 7.2 9.4 9.6 M9.6 2.4 C7.6 4.4 5 7 2.6 9.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* The next blank line, always waiting. */}
      <div className="mt-0.5 flex items-center gap-2">
        <InkCheck size="sm" state="empty" className="mt-[3px] opacity-30" />
        <input
          ref={draftRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft(true);
            }
            if (e.key === "Escape") setDraft("");
          }}
          onBlur={() => commitDraft(false)}
          placeholder={total === 0 ? "add a step…" : "…"}
          className="write-line flex-1 border-b-transparent py-0 text-[16px] leading-snug focus:border-b-ink-300"
        />
        <button
          onClick={askAiForLines}
          disabled={busy}
          title="Ask the assistant to break this into steps"
          className="font-type text-[9px] uppercase tracking-widest text-pencil-300 transition-colors hover:text-ink-700 disabled:opacity-40"
        >
          {busy ? "thinking…" : "✦ break down"}
        </button>
      </div>
    </div>
  );
}
