import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { AiChatMessage } from "@/types";

interface ChatMessageProps {
  msg: AiChatMessage;
}

export function ChatMessage({ msg }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={clsx("flex", msg.role === "user" ? "justify-end" : "justify-start")}
    >
      <div
        className={clsx(
          "max-w-[80%] rounded-xl px-4 py-3",
          msg.role === "user"
            ? "bg-ink-900 text-paper-50"
            : "bg-paper-100 text-ink-800 border border-ink-200/60"
        )}
      >
        <p className="font-sans text-sm whitespace-pre-wrap">{msg.content}</p>
        <p className={clsx(
          "font-sans text-[10px] mt-1.5",
          msg.role === "user" ? "text-paper-300" : "text-ink-400"
        )}>
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}
