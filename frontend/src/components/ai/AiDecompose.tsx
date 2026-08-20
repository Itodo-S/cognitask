"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface DecomposedTask {
  title: string;
  description: string;
  priority: string;
  category: string;
  estimatedMinutes?: number;
}

export function AiDecompose() {
  const [goal, setGoal] = useState("");
  const [tasks, setTasks] = useState<DecomposedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const decompose = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ai/decompose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim() }),
      });
      const data = await res.json();
      setTasks(data.tasks ?? data.result?.tasks ?? data.data ?? []);
    } catch {
      toast("Failed to decompose goal", "error");
    } finally {
      setLoading(false);
    }
  };

  const addAll = async () => {
    let added = 0;
    for (const t of tasks) {
      try {
        await fetch(`${API}/api/todos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t.title, description: t.description, priority: t.priority, category: t.category }),
        });
        added++;
      } catch { /* skip */ }
    }
    toast(`Added ${added} tasks`);
    setTasks([]);
    setGoal("");
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

      <AnimatePresence mode="popLayout">
        {tasks.map((t, i) => (
          <motion.div
            key={`${t.title}-${i}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
          >
            <Card>
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
          <Button onClick={addAll}>Add All {tasks.length} Tasks</Button>
        </motion.div>
      )}
    </div>
  );
}
