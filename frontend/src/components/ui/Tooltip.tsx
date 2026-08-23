"use client";

import { useState } from "react";
import { clsx } from "clsx";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

/** A pencilled aside that appears next to whatever you're hovering. */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      className={clsx("relative inline-flex", className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className={clsx(
            "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap",
            "animate-fade-in rounded-[2px] bg-ink-900/95 px-2 py-1 font-type text-[10px] tracking-wide text-paper-100 shadow-sheet-md",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
