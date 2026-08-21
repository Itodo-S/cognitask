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
    <div className="border-t border-ink-200/40 px-4 py-3">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
          placeholder="Ask about your tasks..."
          className="paper-input flex-1"
          disabled={loading}
        />
        <Button onClick={onSend} disabled={!input.trim() || loading}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 1L6 8M13 1l-4 12-2-5-5-2z" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
