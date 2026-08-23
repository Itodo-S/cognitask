"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { aiApi } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ChatMessage } from "./ChatMessage";
import { AiChatInput } from "./AiChatInput";
import type { AiChatMessage } from "@/types";

const openers = [
  "What should I do next?",
  "What am I forgetting?",
  "What's actually overdue?",
];

export function AiChat() {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [thinking, setThinking] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleWsEvent = useCallback((event: string, payload: unknown) => {
    if (event === "ai:thinking") {
      setThinking((payload as { message?: string })?.message ?? null);
    } else if (event === "ai:response") {
      setThinking(null);
    }
  }, []);

  const { connected } = useWebSocket(handleWsEvent);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content, timestamp: new Date() }]);
    setLoading(true);

    try {
      const data = await aiApi.chat(content, sessionId, history);
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, timestamp: new Date() },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: (e as Error).message || "I couldn't reach the model — is the backend running?",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      setThinking(null);
    }
  };

  return (
    <div className="flex h-full min-h-[26rem] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto py-2 pr-1">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
            <p className="font-hand text-[24px] leading-snug text-pencil-300">
              I can see your list. Ask me anything about it.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {openers.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-sketch border-2 border-pencil-200 px-3 py-1 font-hand text-[17px] leading-none text-pencil-500 transition-all hover:border-ink-400 hover:text-ink-800"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} msg={msg} />
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="border-l-[3px] border-ink-200 pl-3">
              <span className="font-note text-[15px] italic text-pencil-400">
                {thinking ?? "thinking"}
              </span>
              <span className="pen-cursor" />
            </div>
          </motion.div>
        )}
      </div>

      {sessionId && (
        <p className="px-1 pb-1 font-type text-[9px] uppercase tracking-[0.16em] text-pencil-300">
          {connected ? "live" : "offline"} · same conversation
        </p>
      )}

      <AiChatInput
        input={input}
        setInput={setInput}
        onSend={() => send()}
        loading={loading}
        inputRef={inputRef}
      />
    </div>
  );
}
