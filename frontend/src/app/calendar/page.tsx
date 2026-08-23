"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { Header } from "@/components/layout/Header";
import { InkCheck } from "@/components/ui/InkCheck";
import { todosApi } from "@/lib/api";
import { useTodoStore } from "@/stores/todoStore";
import type { Todo } from "@/types";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** A wall planner: a month grid, pencilled in. */
export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(() => new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const { updateStatus } = useTodoStore();

  const load = () => {
    todosApi
      .list({ limit: 100 })
      .then(setTodos)
      .catch(() => setTodos([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const today = new Date();

  // Weeks start on Monday.
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of todos) {
      if (!t.dueDate) continue;
      const key = localKey(new Date(t.dueDate));
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return map;
  }, [todos]);

  const selectedTodos = selected ? byDay.get(localKey(selected)) ?? [] : [];

  const cross = async (id: string) => {
    await updateStatus(id, "completed");
    load();
  };

  return (
    <div>
      <Header
        title="Calendar"
        subtitle={loading ? "checking dates…" : "everything with a date on it"}
      />

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-hand text-[28px] leading-none text-ink-900">
              {MONTHS[month]} <span className="text-pencil-300">{year}</span>
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                aria-label="Previous month"
                className="grid h-8 w-8 place-items-center rounded-full font-hand text-[20px] text-pencil-400 transition-colors hover:bg-ink-100 hover:text-ink-800"
              >
                ‹
              </button>
              <button
                onClick={() => {
                  setCursor(new Date());
                  setSelected(new Date());
                }}
                className="px-2 font-type text-[9px] uppercase tracking-widest text-pencil-400 transition-colors hover:text-ink-800"
              >
                today
              </button>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                aria-label="Next month"
                className="grid h-8 w-8 place-items-center rounded-full font-hand text-[20px] text-pencil-400 transition-colors hover:bg-ink-100 hover:text-ink-800"
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px border-b border-dashed border-pencil-200 pb-1">
            {DAYS.map((d, i) => (
              <span
                key={i}
                className="text-center font-type text-[9px] uppercase tracking-widest text-pencil-300"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-px">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const date = new Date(year, month, day);
              const key = localKey(date);
              const dayTodos = byDay.get(key) ?? [];
              const openCount = dayTodos.filter((t) => t.status !== "completed").length;
              const isToday =
                today.getFullYear() === year &&
                today.getMonth() === month &&
                today.getDate() === day;
              const isSelected = selected ? localKey(selected) === key : false;
              const isPast = date < new Date(today.toDateString());

              return (
                <button
                  key={day}
                  onClick={() => setSelected(date)}
                  className={clsx(
                    "relative flex aspect-square flex-col items-center justify-center rounded-[3px] transition-colors",
                    isSelected
                      ? "bg-marker-yellow/70"
                      : "hover:bg-marker-yellow/25"
                  )}
                >
                  {/* Today gets circled in red pen. */}
                  {isToday && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-1.5 rounded-full border-[1.5px] border-redpen-400"
                      style={{ borderRadius: "48% 52% 51% 49% / 53% 47% 53% 47%" }}
                    />
                  )}
                  <span
                    className={clsx(
                      "font-hand text-[19px] leading-none",
                      isToday
                        ? "text-redpen-600"
                        : isPast
                        ? "text-pencil-300"
                        : "text-ink-800"
                    )}
                  >
                    {day}
                  </span>

                  {openCount > 0 && (
                    <span className="mt-0.5 flex gap-[2px]">
                      {Array.from({ length: Math.min(openCount, 3) }).map((_, i) => (
                        <span key={i} className="h-1 w-1 rounded-full bg-ink-500" />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* The day's page, torn off the planner. */}
        <section>
          <h2 className="mb-3 font-hand text-[24px] leading-none text-ink-900">
            <span className="pen-underline">
              {selected
                ? selected.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
                : "Pick a day"}
            </span>
          </h2>

          {selectedTodos.length === 0 ? (
            <p className="font-note text-[15px] text-pencil-300">Nothing due this day.</p>
          ) : (
            <ul className="space-y-2">
              {selectedTodos.map((todo, i) => (
                <motion.li
                  key={todo.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2.5 border-b border-dashed border-rule-soft pb-2"
                >
                  <InkCheck
                    state={todo.status === "completed" ? "checked" : "empty"}
                    tone={todo.priority === "urgent" ? "red" : "ink"}
                    onClick={todo.status === "completed" ? undefined : () => cross(todo.id)}
                    label={`Complete ${todo.title}`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <p
                      className={clsx(
                        "font-hand text-[19px] leading-tight",
                        todo.status === "completed" ? "text-pencil-300 line-through" : "text-ink-900"
                      )}
                    >
                      {todo.title}
                    </p>
                    {todo.checklistProgress && todo.checklistProgress.total > 0 && (
                      <span className="font-type text-[9px] tracking-widest text-pencil-300">
                        {todo.checklistProgress.done}/{todo.checklistProgress.total} steps
                      </span>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
