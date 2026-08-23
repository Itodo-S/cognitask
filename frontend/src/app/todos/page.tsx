"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { TodoCard, TodoForm, TodoFilters } from "@/components/todos";
import { useTodoStore } from "@/stores/todoStore";

export default function TodosPage() {
  const [showForm, setShowForm] = useState(false);
  const { todos, loading, error, fetchTodos } = useTodoStore();

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const open = todos.filter((t) => t.status !== "completed");
  const done = todos.filter((t) => t.status === "completed");

  return (
    <div>
      <Header
        title="The List"
        subtitle={
          loading
            ? "turning the page…"
            : `${open.length} still to do${done.length ? ` · ${done.length} crossed off` : ""}`
        }
        action={<Button onClick={() => setShowForm(true)}>+ Write one down</Button>}
      />

      <TodoFilters />

      {error && (
        <p className="mb-4 font-hand text-[19px] text-redpen-500">
          {error} — is the backend running?
        </p>
      )}

      {loading ? (
        <div className="space-y-3 py-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-6 animate-pulse rounded-full bg-pencil-100"
              style={{ width: `${92 - i * 9}%` }}
            />
          ))}
        </div>
      ) : todos.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-hand text-[30px] leading-tight text-pencil-300">
            A blank page.
          </p>
          <p className="mt-2 font-note text-[16px] text-pencil-400">
            Write the first thing down — you can add steps inside it, or not.
          </p>
          <div className="mt-5">
            <Button onClick={() => setShowForm(true)}>Start the list</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {open.map((todo, i) => (
              <TodoCard key={todo.id} todo={todo} index={i} />
            ))}
          </AnimatePresence>

          {done.length > 0 && (
            <div className="pt-6">
              <p className="mb-1 font-type text-[9px] uppercase tracking-[0.2em] text-pencil-300">
                crossed off
              </p>
              <AnimatePresence initial={false}>
                {done.map((todo, i) => (
                  <TodoCard key={todo.id} todo={todo} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      <TodoForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
