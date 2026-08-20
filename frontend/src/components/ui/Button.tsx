"use client";

import { clsx } from "clsx";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center gap-2 font-sans font-medium rounded-md",
          "focus:outline-none focus:ring-2 focus:ring-ink-900/20 focus:ring-offset-2",
          "transition-all duration-150 ease-out",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
          "active:scale-[0.98]",
          {
            "bg-ink-900 text-paper-50 hover:bg-ink-800 border border-ink-900": variant === "primary",
            "bg-transparent text-ink-700 hover:bg-ink-100 border border-transparent": variant === "ghost",
            "bg-paper-50 text-ink-700 border border-ink-300 hover:bg-ink-50 hover:border-ink-400": variant === "outline",
            "bg-white text-red-700 border border-red-300 hover:bg-red-50": variant === "danger",
          },
          {
            "px-2.5 py-1.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
