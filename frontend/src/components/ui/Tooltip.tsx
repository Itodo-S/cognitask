"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({ children, content, side = "top", className }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), 400);
  };

  const handleLeave = () => {
    clearTimeout(timeoutRef.current);
    setShow(false);
  };

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {show && (
        <div
          role="tooltip"
          className={clsx(
            "absolute z-50 px-2.5 py-1.5 rounded-md",
            "bg-ink-900 text-paper-50 font-sans text-xs",
            "shadow-lg pointer-events-none",
            "whitespace-nowrap",
            "animate-fade-in",
            positionClasses[side],
            className
          )}
        >
          {content}
          <div
            className={clsx(
              "absolute w-2 h-2 bg-ink-900 rotate-45",
              side === "top" && "top-full left-1/2 -translate-x-1/2 -mt-1",
              side === "bottom" && "bottom-full left-1/2 -translate-x-1/2 mb-1",
              side === "left" && "left-full top-1/2 -translate-y-1/2 -ml-1",
              side === "right" && "right-full top-1/2 -translate-y-1/2 -mr-1"
            )}
          />
        </div>
      )}
    </div>
  );
}
