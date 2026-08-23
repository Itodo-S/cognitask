"use client";

import { useState, useCallback, createContext, useContext, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

/**
 * Wraps the app so `useToast` actually reaches a provider — toasts appear as
 * small notes tossed onto the desk in the corner.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastItem["type"] = "info") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      setTimeout(() => remove(id), 3600);
    },
    [remove]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[100] flex max-w-[19rem] flex-col gap-2 lg:bottom-6">
        <AnimatePresence mode="popLayout">
          {toasts.map((t, i) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 18, rotate: 4, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -1.4 : 1.2, scale: 1 }}
              exit={{ opacity: 0, x: 24, rotate: 6, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              onClick={() => remove(t.id)}
              className={clsx(
                "sticky-note pointer-events-auto cursor-pointer px-4 py-3 font-hand text-[19px] leading-tight",
                t.type === "error" ? "bg-sticky-pink text-redpen-600" : "bg-sticky-yellow text-ink-900"
              )}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
