"use client";

import { RefObject } from "react";
import { Button } from "@/components/ui/Button";

interface AiChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  loading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function AiChatInput({ input, setInput, onSend, loading, inputRef }: AiChatInputProps) {
  return (
    <div className="flex items-end gap-2 border-t border-dashed border-pencil-200 px-1 pt-3">
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder="ask about your list…"
        disabled={loading}
        className="write-line flex-1 font-hand text-[20px]"
      />
      <Button onClick={onSend} disabled={!input.trim() || loading} size="sm" aria-label="Send">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M14.4 1.6 C10.6 5.2 7.4 8.2 5.8 9.9 M14.4 1.6 C13.2 6.2 12 10.6 10.8 14.6 C9.8 12.7 8.9 11.2 8 9.9 C6.2 9.1 4.4 8.3 2.4 7.6 C6.2 5.5 10.3 3.4 14.4 1.6 Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </Button>
    </div>
  );
}
