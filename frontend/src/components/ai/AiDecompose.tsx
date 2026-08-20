"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { aiApi } from "@/lib/api";
import { useTodoStore } from "@/stores/todoStore";
import type { DecomposedTodo } from "@/types";

export function AiDecompose() {
  const [goal, setGoal] = useState("");
  const [tasks, setTasks] = useState<DecomposedTodo[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();
  const createTodo = useTodoStore((s) => s.createTodo);

  const decompose = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    try {
      const data = await aiApi.decompose(goal.trim());
      setTasks(data.todos ?? []);
      setSummary(data.summary ?? "");
    } catch {
      toast("Failed to decompose goal", "error");
    } finally {
      setLoading(false);
    }
  };

  const addAll = async () => {
    setAdding(true);
    let added = 0;
    for (const t of tasks) {
      try {
        await createTodo({
          title: t.title,
          description: t.description,
          priority: t.priority,
          category: t.category,
        });
        added++;
      } catch { /* skip */ }
    }
    toast(`Added ${added} tasks`);
    setTasks([]);
    setGoal("");
    setSummary("");
    setAdding(false);
  };

  const addSingle = async (t: DecomposedTodo) => {
    try {
      await createTodo({
        title: t.title,
        description: t.description,
        priority: t.priority,
        category: t.category,
      });
      toast(`Added: ${t.title}`);
      setTasks((prev) => prev.filter((x) => x !== t));
    } catch {
      toast("Failed to add task", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Textarea
          label="Describe your goal"
          placeholder="e.g. Launch a personal blog by next month..."
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={decompose} disabled={loading || !goal.trim()}>
            {loading ? "Decomposing..." : "Break Down Goal"}
          </Button>
        </div>
      </div>

      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-paper-100 border border-ink-200/60 rounded-xl px-4 py-3"
        >
          <p className="font-sans text-xs text-ink-500 italic">{summary}</p>
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {tasks.map((t, i) => (
          <motion.div
            key={`${t.title}-${i}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
          >
            <Card className="group">
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-xs text-ink-400 font-mono">#{i + 1}</span>
                      <h3 className="font-serif text-sm font-medium text-ink-900">{t.title}</h3>
                    </div>
                    <p className="font-sans text-xs text-ink-500 mt-1">{t.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="paper-badge bg-ink-100 text-ink-600 border-ink-300">{t.priority}</span>
                      {t.category && (
                        <span className="paper-badge bg-paper-100 text-ink-500 border-ink-200">{t.category}</span>
                      )}
                      {t.estimatedMinutes && (
                        <span className="font-sans text-[11px] text-ink-400">~{t.estimatedMinutes}min</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => addSingle(t)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M7 2v10M2 7h10" />
                    </svg>
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-end"
        >
          <Button onClick={addAll} disabled={adding}>
            {adding ? "Adding..." : `Add All ${tasks.length} Tasks`}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
