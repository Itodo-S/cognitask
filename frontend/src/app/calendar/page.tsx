"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";
import type { Todo } from "@/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/todos`)
      .then((r) => r.json())
      .then((data) => setTodos(data.todos ?? []))
      .catch(() => {});
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const isSelected = (day: number) =>
    selectedDate?.getFullYear() === year && selectedDate?.getMonth() === month && selectedDate?.getDate() === day;

  const getTodosForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return todos.filter((t) => t.dueDate?.startsWith(dateStr));
  };

  const selectedTodos = selectedDate ? getTodosForDay(selectedDate.getDate()) : [];

  return (
    <div>
      <Header title="Calendar" subtitle="View tasks by due date" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent>
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={prevMonth}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 3L5 7l4 4"/></svg>
                </Button>
                <h2 className="font-serif text-lg font-semibold text-ink-900">
                  {MONTHS[month]} {year}
                </h2>
                <Button variant="ghost" size="sm" onClick={nextMonth}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 3l4 4-4 4"/></svg>
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((d) => (
                  <div key={d} className="text-center font-sans text-[11px] font-medium text-ink-400 uppercase py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-px bg-ink-200/30 rounded-lg overflow-hidden">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-paper-50 min-h-[72px] sm:min-h-[88px]" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayTodos = getTodosForDay(day);
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(new Date(year, month, day))}
                      className={clsx(
                        "bg-paper-50 min-h-[72px] sm:min-h-[88px] p-1.5 text-left transition-colors",
                        "hover:bg-ink-50",
                        isSelected(day) && "ring-2 ring-ink-900 ring-inset",
                        isToday(day) && !isSelected(day) && "bg-paper-100"
                      )}
                    >
                      <span
                        className={clsx(
                          "font-sans text-xs block mb-1",
                          isToday(day) ? "font-bold text-ink-900" : "text-ink-500"
                        )}
                      >
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {dayTodos.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            className={clsx(
                              "text-[10px] font-sans px-1 py-0.5 rounded truncate",
                              t.status === "completed"
                                ? "bg-ink-100 text-ink-400 line-through"
                                : "bg-ink-900 text-paper-50"
                            )}
                          >
                            {t.title}
                          </div>
                        ))}
                        {dayTodos.length > 2 && (
                          <span className="text-[10px] font-sans text-ink-400">+{dayTodos.length - 2}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected day details */}
        <div>
          <Card>
            <CardContent>
              <h3 className="font-serif text-lg font-semibold text-ink-900 mb-4">
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                  : "Select a date"}
              </h3>

              {!selectedDate ? (
                <p className="font-sans text-sm text-ink-400 text-center py-8">
                  Click a date to see tasks
                </p>
              ) : selectedTodos.length === 0 ? (
                <p className="font-sans text-sm text-ink-400 text-center py-8">
                  No tasks due on this date
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedTodos.map((todo) => (
                    <div key={todo.id} className="p-3 rounded-lg bg-paper-100/50 border border-ink-200/30">
                      <p className={clsx(
                        "font-serif text-sm",
                        todo.status === "completed" ? "line-through text-ink-400" : "text-ink-800"
                      )}>
                        {todo.title}
                      </p>
                      {todo.category && (
                        <span className="paper-badge bg-paper-50 text-ink-500 border-ink-200 mt-1 inline-block text-[10px]">
                          {todo.category}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
