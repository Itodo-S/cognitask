"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { aiApi } from "@/lib/api";
import { useTodoStore } from "@/stores/todoStore";
import type { AiSuggestion } from "@/types";

export function AiSuggestions() {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const { toast } = useToast();
  const createTodo = useTodoStore((s) => s.createTodo);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const data = await aiApi.suggest(context || undefined);
      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      toast("Failed to get suggestions", "error");
    } finally {
      setLoading(false);
    }
  };

  const acceptSuggestion = async (s: AiSuggestion) => {
    try {
      await createTodo({
        title: s.title,
        description: s.description,
        priority: s.priority,
        category: s.category,
      });
      toast(`Added: ${s.title}`);
      setSuggestions((prev) => prev.filter((x) => x !== s));
    } catch {
      toast("Failed to create task", "error");
    }
  };

  const acceptAll = async () => {
    let added = 0;
    for (const s of suggestions) {
      try {
        await createTodo({
          title: s.title,
          description: s.description,
          priority: s.priority,
          category: s.category,
        });
        added++;
      } catch {  }
    }
    toast(`Added ${added} suggestions`);
    setSuggestions([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchSuggestions()}
          placeholder="Optional context for suggestions..."
          className="paper-input flex-1"
        />
        <Button onClick={fetchSuggestions} disabled={loading}>
          {loading ? "Thinking..." : "Get Suggestions"}
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {suggestions.map((s, i) => (
          <motion.div
            key={`${s.title}-${i}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="group">
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-sm font-medium text-ink-900">{s.title}</h3>
                    <p className="font-sans text-xs text-ink-500 mt-1">{s.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="paper-badge bg-ink-100 text-ink-600 border-ink-300">{s.priority}</span>
                      {s.category && (
                        <span className="paper-badge bg-paper-100 text-ink-500 border-ink-200">{s.category}</span>
                      )}
                    </div>
                    {s.reason && (
                      <p className="font-sans text-[11px] text-ink-400 mt-2 italic">&quot;{s.reason}&quot;</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => acceptSuggestion(s)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M2 7l3.5 3.5L12 4" />
                    </svg>
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-end"
        >
          <Button onClick={acceptAll}>Accept All {suggestions.length}</Button>
        </motion.div>
      )}

      {suggestions.length === 0 && !loading && (
        <p className="font-sans text-sm text-ink-400 text-center py-8">
          Click &quot;Get Suggestions&quot; to have AI suggest tasks for you
        </p>
      )}
    </div>
  );
}
