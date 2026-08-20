"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Header } from "@/components/layout/Header";
import type { DashboardStats } from "@/types";

const defaultStats: DashboardStats = {
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  overdue: 0,
  completionRate: 0,
  recentCompletions: [],
  upcomingDeadlines: [],
  categoryBreakdown: [],
  priorityBreakdown: [],
  aiInsights: [],
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/dashboard/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: "Total", value: stats.total, accent: false },
    { label: "Pending", value: stats.pending, accent: false },
    { label: "In Progress", value: stats.inProgress, accent: true },
    { label: "Completed", value: stats.completed, accent: false },
  ];

  return (
    <div>
      <Header title="Dashboard" subtitle="Your task overview at a glance" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="text-center py-6">
              <p className="font-sans text-xs text-ink-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`font-serif text-3xl font-semibold ${s.accent ? "text-ink-900" : "text-ink-600"}`}>
                {loading ? "—" : s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card>
          <CardContent>
            <h2 className="font-serif text-lg font-semibold text-ink-900 mb-4">Upcoming Deadlines</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-ink-100/50 rounded animate-pulse" />
                ))}
              </div>
            ) : stats.upcomingDeadlines.length === 0 ? (
              <p className="font-sans text-sm text-ink-400 text-center py-8">
                No upcoming deadlines — all clear!
              </p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingDeadlines.map((todo) => (
                  <div key={todo.id} className="flex items-center justify-between py-2 border-b border-ink-200/30 last:border-0">
                    <div className="min-w-0">
                      <p className="font-serif text-sm text-ink-800 truncate">{todo.title}</p>
                      {todo.category && (
                        <span className="paper-badge bg-paper-100 text-ink-500 border-ink-200 mt-1 inline-block">
                          {todo.category}
                        </span>
                      )}
                    </div>
                    <span className="font-sans text-xs text-ink-500 flex-shrink-0 ml-3">
                      {todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Completions */}
        <Card>
          <CardContent>
            <h2 className="font-serif text-lg font-semibold text-ink-900 mb-4">Recent Completions</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-ink-100/50 rounded animate-pulse" />
                ))}
              </div>
            ) : stats.recentCompletions.length === 0 ? (
              <p className="font-sans text-sm text-ink-400 text-center py-8">
                No completed tasks yet — start checking things off!
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentCompletions.map((todo) => (
                  <div key={todo.id} className="flex items-center justify-between py-2 border-b border-ink-200/30 last:border-0">
                    <div className="min-w-0">
                      <p className="font-serif text-sm text-ink-500 line-through truncate">{todo.title}</p>
                    </div>
                    <span className="font-sans text-xs text-ink-400 flex-shrink-0 ml-3">
                      {todo.completedAt ? new Date(todo.completedAt).toLocaleDateString() : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {stats.aiInsights.length > 0 && (
        <Card className="mt-6">
          <CardContent>
            <h2 className="font-serif text-lg font-semibold text-ink-900 mb-4">AI Insights</h2>
            <div className="space-y-2">
              {stats.aiInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-paper-100/50 border border-ink-200/30">
                  <svg className="flex-shrink-0 mt-0.5 text-ink-400" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="7" cy="7" r="6" />
                    <path d="M7 4.5v3M7 9.5v.01" />
                  </svg>
                  <p className="font-sans text-sm text-ink-600">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
