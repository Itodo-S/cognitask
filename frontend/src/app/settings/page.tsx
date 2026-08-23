"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { FieldLabel, StickyNote } from "@/components/ui/Paper";
import { InkCheck } from "@/components/ui/InkCheck";
import { useToast } from "@/components/ui/Toast";
import { aiApi, todosApi } from "@/lib/api";
import type { AiStatus, TodoStats } from "@/types";

interface Preferences {
  autoBreakDown: boolean;
  confirmBeforeTearOut: boolean;
  showCrossedOff: boolean;
}

const defaults: Preferences = {
  autoBreakDown: false,
  confirmBeforeTearOut: true,
  showCrossedOff: true,
};

const STORAGE_KEY = "cognitask-preferences";

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setPrefs({ ...defaults, ...JSON.parse(saved) });
    } catch {
      /* a corrupt or blocked store just means defaults */
    }
    aiApi.status().then(setStatus).catch(() => setStatus(null));
    todosApi.stats().then(setStats).catch(() => setStats(null));
  }, []);

  const toggle = (key: keyof Preferences) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      toast("Noted");
    } catch {
      toast("Couldn't remember that on this device", "error");
    }
  };

  const rows: { key: keyof Preferences; label: string; hint: string }[] = [
    {
      key: "autoBreakDown",
      label: "Offer steps for every new task",
      hint: "Ask the assistant for a checklist as soon as something is written down.",
    },
    {
      key: "confirmBeforeTearOut",
      label: "Ask before tearing a task out",
      hint: "A confirmation before anything leaves the page.",
    },
    {
      key: "showCrossedOff",
      label: "Keep crossed-off tasks visible",
      hint: "Finished lines stay on the page in faded ink.",
    },
  ];

  return (
    <div>
      <Header title="Settings" subtitle="How this notebook behaves" />

      <div className="max-w-2xl space-y-9">
        <section>
          <h2 className="mb-3 font-hand text-[26px] leading-none text-ink-900">
            <span className="pen-underline">Preferences</span>
          </h2>

          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.key} className="flex items-start gap-3 border-b border-dashed border-rule-soft pb-3">
                <InkCheck
                  state={prefs[row.key] ? "checked" : "empty"}
                  onClick={() => toggle(row.key)}
                  label={row.label}
                  className="mt-0.5"
                />
                <div>
                  <p
                    className={clsx(
                      "font-hand text-[20px] leading-tight",
                      prefs[row.key] ? "text-ink-900" : "text-pencil-400"
                    )}
                  >
                    {row.label}
                  </p>
                  <p className="mt-0.5 font-note text-[14px] leading-snug text-pencil-400">
                    {row.hint}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-hand text-[26px] leading-none text-ink-900">
            <span className="pen-underline">The assistant</span>
          </h2>

          {status === null ? (
            <p className="font-note text-[15px] text-pencil-300">Checking…</p>
          ) : status.configured ? (
            <div className="space-y-1">
              <p className="font-note text-[16px] text-ink-700">
                Connected, reading your list with{" "}
                <span className="highlight font-type text-[13px]">{status.model}</span>.
              </p>
              <p className="font-note text-[14px] text-pencil-400">
                It sees your open tasks, what&apos;s overdue and what&apos;s gone stale — that&apos;s
                how it can point at specific things rather than giving generic advice.
              </p>
            </div>
          ) : (
            <StickyNote tone="orange" tilt="a" className="max-w-md">
              <p className="font-hand text-[20px] leading-snug text-ink-900">
                Running offline.
              </p>
              <p className="mt-1 font-note text-[14px] leading-snug text-ink-700/80">
                Set <span className="font-type text-[12px]">ANTHROPIC_API_KEY</span> (or{" "}
                <span className="font-type text-[12px]">ANTHROPIC_AUTH_TOKEN</span>) in the backend
                and restart to get real planning and suggestions.
              </p>
            </StickyNote>
          )}
        </section>

        {stats && (
          <section>
            <h2 className="mb-3 font-hand text-[26px] leading-none text-ink-900">
              <span className="pen-underline">This notebook</span>
            </h2>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {[
                { label: "entries", value: stats.total },
                { label: "open", value: stats.pending + stats.inProgress },
                { label: "crossed off", value: stats.completed },
                { label: "torn out", value: stats.archived },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-hand text-[32px] leading-none text-ink-900">{s.value}</p>
                  <p className="mt-1 font-type text-[9px] uppercase tracking-[0.16em] text-pencil-400">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="cut-line" />

        <div className="flex justify-end">
          <Button
            variant="danger"
            onClick={() => {
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {
                /* nothing to clear */
              }
              setPrefs(defaults);
              toast("Back to defaults");
            }}
          >
            Reset preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
