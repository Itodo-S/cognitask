"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { FieldLabel, StickyNote } from "@/components/ui/Paper";
import { InkCheck } from "@/components/ui/InkCheck";
import { useToast } from "@/components/ui/Toast";
import { aiApi } from "@/lib/api";
import { useTodoStore } from "@/stores/todoStore";
import type { AiDecomposeResponse, DecomposedTodo } from "@/types";

function minutesLabel(m?: number) {
  if (!m) return null;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

/** Planning a goal: you write the goal, the page fills with the plan. */
export function AiDecompose() {
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [plan, setPlan] = useState<AiDecomposeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [taken, setTaken] = useState<Set<number>>(new Set());

  const { toast } = useToast();
  const { createTodo, fetchTodos } = useTodoStore();

  const run = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setPlan(null);
    setTaken(new Set());
    try {
      setPlan(await aiApi.decompose(goal.trim(), context.trim() || undefined));
    } catch (e) {
      toast((e as Error).message || "Couldn't draw up a plan", "error");
    } finally {
      setLoading(false);
    }
  };

  const save = async (task: DecomposedTodo, index: number) => {
    try {
      await createTodo({
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        checklist: task.checklist?.length ? task.checklist : undefined,
        dueDate:
          typeof task.dueOffsetDays === "number"
            ? new Date(Date.now() + task.dueOffsetDays * 86400000).toISOString()
            : undefined,
        tags: task.tags?.length ? task.tags : undefined,
      });
      setTaken((prev) => new Set(prev).add(index));
      toast(`Copied over: ${task.title}`);
    } catch {
      toast("Couldn't copy that one over", "error");
    }
  };

  const saveAll = async () => {
    if (!plan) return;
    setAdding(true);
    try {
      // Re-run server-side so dependencies become real parent/child links.
      const result = await aiApi.decompose(goal.trim(), context.trim() || undefined, true);
      await fetchTodos();
      toast(`Copied ${result.savedIds?.length ?? 0} tasks onto the list`);
      setPlan(null);
      setGoal("");
      setContext("");
    } catch {
      toast("Couldn't copy the plan over", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <FieldLabel htmlFor="goal">What are you trying to get done?</FieldLabel>
          <textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="launch a small paid newsletter about urban gardening…"
            rows={2}
            className="write-line mt-1 resize-none font-hand text-[24px] leading-snug"
          />
        </div>

        <div>
          <FieldLabel htmlFor="ctx">Anything I should know? (optional)</FieldLabel>
          <input
            id="ctx"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="budget, deadline, who else is involved…"
            className="write-line mt-1 text-[16px]"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={run} disabled={loading || !goal.trim()}>
            {loading ? <span className="pen-cursor">Working it out</span> : "Draw up a plan"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-2 py-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-4 rounded-full bg-pencil-100"
              style={{ width: `${88 - i * 16}%` }}
              animate={{ opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* The approach, in the assistant's own hand. */}
            <div className="border-l-[3px] border-marker-yellow pl-4">
              <p className="font-note text-[16px] leading-relaxed text-ink-700">{plan.summary}</p>
            </div>

            {plan.firstAction && (
              <StickyNote tone="green" tilt="a" className="max-w-md">
                <p className="font-type text-[9px] uppercase tracking-[0.16em] text-greenpen">
                  start here
                </p>
                <p className="mt-1 font-hand text-[20px] leading-snug text-ink-900">
                  {plan.firstAction}
                </p>
              </StickyNote>
            )}

            {plan.assumptions && plan.assumptions.length > 0 && (
              <div>
                <p className="font-type text-[9px] uppercase tracking-[0.16em] text-pencil-400">
                  assuming
                </p>
                <ul className="mt-1 space-y-0.5">
                  {plan.assumptions.map((a, i) => (
                    <li key={i} className="font-note text-[15px] leading-snug text-pencil-500">
                      — {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="cut-line" />

            {/* The plan itself. */}
            <ol className="space-y-3">
              {plan.todos.map((task, i) => {
                const isTaken = taken.has(i);
                return (
                  <motion.li
                    key={`${task.title}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={clsx(
                      "group relative border-b border-dashed border-rule-soft pb-3",
                      isTaken && "opacity-45"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 font-hand text-[19px] leading-none text-pencil-300">
                        {i + 1}.
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <h3 className="font-hand text-[21px] leading-tight text-ink-900">
                            {task.title}
                          </h3>
                          {task.priority === "urgent" && (
                            <span className="stamp stamp-red">urgent</span>
                          )}
                          {minutesLabel(task.estimatedMinutes) && (
                            <span className="font-type text-[10px] tracking-wide text-pencil-400">
                              ~{minutesLabel(task.estimatedMinutes)}
                            </span>
                          )}
                          {task.dependsOn && task.dependsOn.length > 0 && (
                            <span className="font-type text-[10px] tracking-wide text-pencil-300">
                              after {task.dependsOn.map((d) => d + 1).join(", ")}
                            </span>
                          )}
                          {task.category && (
                            <span className="font-type text-[10px] lowercase text-ink-400">
                              #{task.category}
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 font-note text-[15px] leading-relaxed text-pencil-500">
                          {task.description}
                        </p>

                        {task.checklist && task.checklist.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {task.checklist.map((line, j) => (
                              <li key={j} className="flex items-start gap-2">
                                <InkCheck size="sm" state="empty" className="mt-[3px] opacity-45" />
                                <span className="font-note text-[15px] leading-snug text-ink-600">
                                  {line}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => save(task, i)}
                        disabled={isTaken}
                        className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                      >
                        {isTaken ? "✓" : "+ copy"}
                      </Button>
                    </div>
                  </motion.li>
                );
              })}
            </ol>

            {plan.risks && plan.risks.length > 0 && (
              <div className="space-y-2">
                <p className="font-type text-[9px] uppercase tracking-[0.16em] text-redpen-400">
                  what usually goes wrong
                </p>
                {plan.risks.map((r, i) => (
                  <div key={i} className="border-l-[3px] border-redpen-200 pl-3">
                    <p className="font-note text-[15px] leading-snug text-ink-700">{r.risk}</p>
                    <p className="mt-0.5 font-note text-[14px] leading-snug text-greenpen">
                      → {r.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              {plan.totalEstimatedMinutes ? (
                <span className="font-type text-[10px] uppercase tracking-widest text-pencil-400">
                  about {minutesLabel(plan.totalEstimatedMinutes)} in total
                </span>
              ) : (
                <span />
              )}
              <Button onClick={saveAll} disabled={adding}>
                {adding ? "Copying…" : `Copy all ${plan.todos.length} onto the list`}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
