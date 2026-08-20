"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { TodoCard, TodoForm, TodoFilters } from "@/components/todos";
import { useTodoStore } from "@/stores/todoStore";

export default function TodosPage() {
  const [showForm, setShowForm] = useState(false);
  const { todos, loading, fetchTodos } = useTodoStore();

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const filtered = todos;

  return (
    <div>
      <Header
        title="Tasks"
        subtitle={`${todos.length} task${todos.length !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => setShowForm(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M7 2v10M2 7h10" />
            </svg>
            New Task
          </Button>
        }
      />

      <TodoFilters />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-paper-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <svg className="mx-auto mb-4 text-ink-300" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="8" y="4" width="32" height="40" rx="4" />
            <path d="M16 16h16M16 24h16M16 32h8" />
          </svg>
          <p className="font-serif text-lg text-ink-400 mb-2">No tasks yet</p>
          <p className="font-sans text-sm text-ink-400 mb-4">Create your first task to get started</p>
          <Button onClick={() => setShowForm(true)}>Create Task</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((todo) => (
            <TodoCard key={todo.id} todo={todo} />
          ))}
        </div>
      )}

      <TodoForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
