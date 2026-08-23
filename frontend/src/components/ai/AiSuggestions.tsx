"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { StickyNote } from "@/components/ui/Paper";
import { InkCheck } from "@/components/ui/InkCheck";
import { useToast } from "@/components/ui/Toast";
import { aiApi } from "@/lib/api";
import { useTodoStore } from "@/stores/todoStore";
import type { AiSuggestion, AiSuggestionsResponse, SuggestionKind } from "@/types";

const kindStyle: Record<SuggestionKind, { label: string; note: "yellow" | "green" | "pink" | "blue" | "orange" }> = {
  next_action: { label: "do this next", note: "green" },
  unblock: { label: "stuck", note: "orange" },
  break_down: { label: "too big", note: "blue" },
  new_task: { label: "missing", note: "yellow" },
  defer: { label: "put it down", note: "pink" },
  cleanup: { label: "tidy up", note: "pink" },
};

/** The assistant's read on your list, pinned up as notes. */
export function AiSuggestions() {
  const [data, setData] = useState<AiSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const [taken, setTaken] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const { createTodo, todos } = useTodoStore();

  const fetch = async () => {
    setLoading(true);
    setTaken(new Set());
    try {
      setData(await aiApi.suggest(context.trim() || undefined));
    } catch (e) {
      toast((e as Error).message || "Couldn't get a read on your list", "error");
    } finally {
      setLoading(false);
    }
  };

  const accept = async (s: AiSuggestion, key: string) => {
    try {
      await createTodo({
        title: s.title,
        description: s.description,
        priority: s.priority,
        category: s.category,
        checklist: s.checklist?.length ? s.checklist : undefined,
      });
      setTaken((prev) => new Set(prev).add(key));
      toast(`Added: ${s.title}`);
    } catch {
      toast("Couldn't add that", "error");
    }
  };

  const focusTodo = data?.focusTodoId ? todos.find((t) => t.id === data.focusTodoId) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetch()}
            placeholder="anything on your mind? (optional)"
            className="write-line font-hand text-[19px]"
          />
        </div>
        <Button onClick={fetch} disabled={loading}>
          {loading ? <span className="pen-cursor">Reading your list</span> : "What should I do?"}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2 py-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-4 rounded-full bg-pencil-100"
              style={{ width: `${90 - i * 18}%` }}
              animate={{ opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {data && !loading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* The honest headline. */}
            <div className="border-l-[3px] border-marker-yellow pl-4">
              <p className="font-note text-[16px] leading-relaxed text-ink-700">{data.briefing}</p>
            </div>

            {/* The one thing to do next, circled. */}
            {focusTodo && (
              <div className="relative rounded-sketch border-2 border-redpen-300 px-4 py-3">
                <span className="margin-note absolute -top-2.5 left-3 bg-paper-50 px-1 font-type text-[9px] uppercase tracking-[0.16em]">
                  do this one
                </span>
                <p className="font-hand text-[23px] leading-tight text-ink-900">{focusTodo.title}</p>
                {data.focusReason && (
                  <p className="mt-1 font-note text-[15px] leading-snug text-pencil-500">
                    {data.focusReason}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {data.suggestions.map((s, i) => {
                const key = `${s.title}-${i}`;
                const style = kindStyle[s.kind] ?? kindStyle.next_action;
                const isTaken = taken.has(key);
                const related = s.relatedTodoId
                  ? todos.find((t) => t.id === s.relatedTodoId)
                  : null;

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 12, rotate: i % 2 ? 1.5 : -1.5 }}
                    animate={{ opacity: isTaken ? 0.45 : 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <StickyNote tone={style.note} tilt={i % 2 ? "a" : "b"} className="h-full">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-type text-[9px] uppercase tracking-[0.16em] text-ink-600/70">
                          {style.label}
                        </span>
                        <span className="font-type text-[9px] text-ink-600/40">
                          {Math.round(s.confidence * 100)}%
                        </span>
                      </div>

                      <h3 className="mt-1.5 font-hand text-[21px] leading-tight text-ink-900">
                        {s.title}
                      </h3>

                      <p className="mt-1 font-note text-[14px] leading-snug text-ink-700/85">
                        {s.description}
                      </p>

                      <p className="mt-2 border-t border-ink-800/10 pt-2 font-note text-[13px] italic leading-snug text-ink-700/70">
                        {s.reason}
                      </p>

                      {related && (
                        <p className="mt-1.5 font-type text-[9px] uppercase tracking-wide text-ink-600/50">
                          re: {related.title}
                        </p>
                      )}

                      {s.checklist && s.checklist.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {s.checklist.map((line, j) => (
                            <li key={j} className="flex items-start gap-1.5">
                              <InkCheck size="sm" state="empty" className="mt-[2px] scale-90 opacity-45" />
                              <span className="font-note text-[13px] leading-snug text-ink-700/80">
                                {line}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Advice about an existing task isn't a new task. */}
                      {s.kind !== "defer" && s.kind !== "cleanup" && (
                        <button
                          onClick={() => accept(s, key)}
                          disabled={isTaken}
                          className={clsx(
                            "mt-3 font-hand text-[17px] leading-none underline decoration-dotted underline-offset-4",
                            isTaken ? "text-ink-600/40" : "text-ink-800 hover:text-redpen-500"
                          )}
                        >
                          {isTaken ? "✓ on the list" : "add to my list"}
                        </button>
                      )}
                    </StickyNote>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!data && !loading && (
        <p className="py-10 text-center font-hand text-[20px] text-pencil-300">
          I&apos;ll read your list and tell you what actually matters.
        </p>
      )}
    </div>
  );
}
