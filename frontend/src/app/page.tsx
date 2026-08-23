"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { Header } from "@/components/layout/Header";
import { StickyNote, CoffeeRing } from "@/components/ui/Paper";
import { InkCheck, InkStrike } from "@/components/ui/InkCheck";
import { useTodoStore } from "@/stores/todoStore";
import { dashboardApi } from "@/lib/api";
import type { DashboardData } from "@/types";

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function TodayPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { updateStatus } = useTodoStore();

  const load = () => {
    dashboardApi
      .get()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const now = new Date();
  const stats = data?.stats;
  const overdue = (data?.upcomingDue ?? []).length;

  const cross = async (id: string) => {
    await updateStatus(id, "completed");
    load();
  };

  const tally = [
    { label: "still open", value: (stats?.pending ?? 0) + (stats?.inProgress ?? 0) },
    { label: "in hand", value: stats?.inProgress ?? 0 },
    { label: "done today", value: stats?.completedToday ?? 0 },
    { label: "overdue", value: stats?.overdue ?? 0, alarm: true },
  ];

  return (
    <div className="relative">
      <CoffeeRing className="-right-2 top-10 hidden sm:block" size={92} />

      <Header
        title={greeting(now)}
        subtitle={now.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />

      {/* The tally you'd scribble in the top corner. */}
      <div className="mb-8 flex flex-wrap gap-x-8 gap-y-3">
        {tally.map((t) => (
          <div key={t.label}>
            <p
              className={clsx(
                "font-hand text-[40px] leading-none",
                t.alarm && t.value > 0 ? "text-redpen-500" : "text-ink-900"
              )}
            >
              {loading ? "—" : t.value}
            </p>
            <p className="mt-1 font-type text-[9px] uppercase tracking-[0.16em] text-pencil-400">
              {t.label}
            </p>
          </div>
        ))}
      </div>

      {stats && stats.overdue > 0 && (
        <StickyNote tone="pink" tilt="a" className="mb-8 max-w-sm">
          <p className="font-hand text-[21px] leading-snug text-redpen-600">
            {stats.overdue} thing{stats.overdue === 1 ? "" : "s"} slipped past its date.
          </p>
          <Link
            href="/ai"
            className="mt-1 inline-block font-hand text-[17px] text-ink-800 underline decoration-dotted underline-offset-4"
          >
            ask what to do about it →
          </Link>
        </StickyNote>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* What's on the bench right now. */}
        <section>
          <h2 className="mb-3 font-hand text-[26px] leading-none text-ink-900">
            <span className="pen-underline">In hand</span>
          </h2>

          {loading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-5 animate-pulse rounded-full bg-pencil-100" style={{ width: `${80 - i * 15}%` }} />
              ))}
            </div>
          ) : !data?.activeInProgress?.length ? (
            <p className="font-note text-[15px] text-pencil-300">
              Nothing picked up yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.activeInProgress.map((todo, i) => (
                <motion.li
                  key={todo.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2.5 border-b border-dashed border-rule-soft pb-2"
                >
                  <InkCheck state="empty" onClick={() => cross(todo.id)} label={`Complete ${todo.title}`} className="mt-0.5" />
                  <span className="font-hand text-[20px] leading-tight text-ink-900">{todo.title}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </section>

        {/* Coming up. */}
        <section>
          <h2 className="mb-3 font-hand text-[26px] leading-none text-ink-900">
            <span className="pen-underline">Coming up</span>
          </h2>

          {loading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-5 animate-pulse rounded-full bg-pencil-100" style={{ width: `${76 - i * 14}%` }} />
              ))}
            </div>
          ) : overdue === 0 ? (
            <p className="font-note text-[15px] text-pencil-300">Nothing with a date on it.</p>
          ) : (
            <ul className="space-y-2">
              {data!.upcomingDue.map((todo, i) => (
                <motion.li
                  key={todo.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-baseline justify-between gap-3 border-b border-dashed border-rule-soft pb-2"
                >
                  <span className="min-w-0 truncate font-hand text-[20px] leading-tight text-ink-800">
                    {todo.title}
                  </span>
                  <span className="flex-shrink-0 font-type text-[10px] tracking-wide text-pencil-400">
                    {todo.dueDate
                      ? new Date(todo.dueDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recently crossed off, in faded ink. */}
      {data?.recentCompleted && data.recentCompleted.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-hand text-[22px] leading-none text-pencil-400">
            Crossed off lately
          </h2>
          <ul className="space-y-1.5">
            {data.recentCompleted.map((todo) => (
              <li key={todo.id} className="relative inline-flex w-full items-baseline gap-2">
                <span className="relative font-hand text-[18px] leading-tight text-pencil-300">
                  {todo.title}
                  <InkStrike />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && !data && (
        <p className="mt-8 font-hand text-[19px] text-redpen-500">
          Couldn&apos;t read the notebook — is the backend running?
        </p>
      )}
    </div>
  );
}
