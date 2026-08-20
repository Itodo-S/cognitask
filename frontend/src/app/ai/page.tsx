"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";
import { AiChat } from "@/components/ai/AiChat";
import { AiSuggestions } from "@/components/ai/AiSuggestions";
import { AiDecompose } from "@/components/ai/AiDecompose";

type Tab = "chat" | "suggest" | "decompose";

const tabs: { id: Tab; label: string; description: string }[] = [
  { id: "chat", label: "Chat", description: "Ask your AI assistant" },
  { id: "suggest", label: "Suggestions", description: "AI-powered task ideas" },
  { id: "decompose", label: "Decompose", description: "Break down goals" },
];

export default function AIPage() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <Header title="AI Assistant" subtitle="Chat with your task assistant" />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-ink-100/50 rounded-lg p-1">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex-1 font-sans text-sm transition-all",
              activeTab === tab.id
                ? "bg-paper-50 text-ink-900 shadow-sm border border-ink-200/60"
                : "text-ink-500 hover:text-ink-700"
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {activeTab === "chat" && <AiChat />}
          {activeTab === "suggest" && (
            <div className="p-4">
              <AiSuggestions />
            </div>
          )}
          {activeTab === "decompose" && (
            <div className="p-4">
              <AiDecompose />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
