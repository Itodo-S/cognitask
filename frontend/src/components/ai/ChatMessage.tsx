"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { AiChatMessage } from "@/types";

/**
 * A conversation written in the margins: your side in pencil on the right,
 * the assistant's replies in ink on the left.
 */
export function ChatMessage({ msg }: { msg: AiChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={clsx("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div className={clsx("max-w-[85%]", isUser && "text-right")}>
        <span className="font-type text-[9px] uppercase tracking-[0.16em] text-pencil-300">
          {isUser ? "you" : "the assistant"} ·{" "}
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>

        <p
          className={clsx(
            "mt-0.5 whitespace-pre-wrap font-note text-[16px] leading-relaxed",
            isUser
              ? "border-r-[3px] border-pencil-200 pr-3 text-pencil-500"
              : "border-l-[3px] border-ink-200 pl-3 text-ink-800"
          )}
        >
          {msg.content}
        </p>
      </div>
    </motion.div>
  );
}
