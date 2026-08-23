"use client";

import { clsx } from "clsx";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        {
          "btn-pen": variant === "primary",
          "btn-outline": variant === "outline",
          "btn-ghost": variant === "ghost",
          "btn-outline btn-red": variant === "danger",
        },
        {
          "px-2.5 py-1 text-base": size === "sm",
          "px-4 py-2 text-lg": size === "md",
          "px-6 py-2.5 text-xl": size === "lg",
        },
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
