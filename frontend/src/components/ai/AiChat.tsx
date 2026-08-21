"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

import { aiApi } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ChatMessage } from "./ChatMessage";
import { AiChatInput } from "./AiChatInput";
import type { AiChatMessage } from "@/types";

export function AiChat() {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleWsEvent = useCallback((event: string, payload: unknown) => {
    if (event === "ai:thinking") {
      setActiveTool(null);
    } else if (event === "ai:tool_call") {
      const p = payload as { name: string; input: unknown };
      setActiveTool(p.name);
    } else if (event === "ai:response") {
      setActiveTool(null);
    }
  }, []);

  const { connected } = useWebSocket(handleWsEvent);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const userMessage: AiChatMessage = { role: "user", content: userMsg, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const data = await aiApi.chat(userMsg, sessionId);
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error — is the backend running?", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {}
      {sessionId && (
        <div className="px-4 py-1.5 border-b border-ink-200/40 flex items-center gap-2">
          <span className={clsx(
            "w-1.5 h-1.5 rounded-full",
            connected ? "bg-green-500" : "bg-ink-300"
          )} />
          <span className="font-sans text-[11px] text-ink-400">
            Session active{connected ? " (real-time)" : ""}
          </span>
        </div>
      )}

      {}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center h-full"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-ink-100 rounded-full flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
              <p className="font-serif text-lg text-ink-400">Ask me anything about your tasks</p>
              <p className="font-sans text-sm text-ink-400 mt-1">I can help organize, prioritize, and plan</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <ChatMessage key={i} msg={msg} />
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-paper-100 border border-ink-200/60 rounded-xl px-4 py-3">
              {activeTool ? (
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3 animate-spin text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4m0 12v4m-8-10h4m12 0h4m-3.5-6.5-2.8 2.8m-7.4 7.4-2.8 2.8m0-13L8.3 8.7m7.4 7.4 2.8 2.8" strokeLinecap="round" />
                  </svg>
                  <span className="font-sans text-xs text-ink-500">Using {activeTool}...</span>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((delay) => (
                    <motion.span
                      key={delay}
                      className="w-2 h-2 bg-ink-300 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: delay / 1000 }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <AiChatInput 
        input={input} 
        setInput={setInput} 
        onSend={send} 
        loading={loading} 
        inputRef={inputRef} 
      />
    </div>
  );
}
