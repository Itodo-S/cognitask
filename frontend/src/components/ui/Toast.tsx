"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { clsx } from "clsx";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-lg",
              "bg-paper-50 border shadow-paper-lg",
              "font-sans text-sm animate-slide-up",
              "cursor-pointer hover:shadow-paper-xl transition-shadow",
              t.type === "success" && "border-ink-300",
              t.type === "error" && "border-red-300",
              t.type === "info" && "border-ink-200"
            )}
            onClick={() => remove(t.id)}
          >
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ink-900" />
            <span className="text-ink-800">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
