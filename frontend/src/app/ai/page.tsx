"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Header } from "@/components/layout/Header";
import { AiChat } from "@/components/ai/AiChat";
import { AiSuggestions } from "@/components/ai/AiSuggestions";
import { AiDecompose } from "@/components/ai/AiDecompose";
import { aiApi } from "@/lib/api";
import type { AiStatus } from "@/types";

type Tab = "suggest" | "decompose" | "chat";

const tabs: { id: Tab; label: string }[] = [
  { id: "suggest", label: "What now?" },
  { id: "decompose", label: "Plan a goal" },
  { id: "chat", label: "Just ask" },
];

export default function AIPage() {
  const [tab, setTab] = useState<Tab>("suggest");
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    aiApi.status().then(setStatus).catch(() => setStatus(null));
  }, []);

  return (
    <div className="flex min-h-[32rem] flex-col">
      <Header
        title="Ask"
        subtitle={
          status?.configured
            ? `reading your list with ${status.model}`
            : status
            ? "offline mode — set ANTHROPIC_API_KEY for real answers"
            : undefined
        }
      />

      {/* Divider tabs, like the coloured tabs in a ring binder. */}
      <div className="mb-6 flex gap-1 border-b border-dashed border-pencil-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "-mb-px px-3 py-1.5 font-hand text-[20px] leading-none transition-all",
              tab === t.id
                ? "border-b-[3px] border-ink-800 text-ink-900"
                : "border-b-[3px] border-transparent text-pencil-400 hover:text-ink-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {tab === "suggest" && <AiSuggestions />}
        {tab === "decompose" && <AiDecompose />}
        {tab === "chat" && <AiChat />}
      </div>
    </div>
  );
}
