"use client";

import { clsx } from "clsx";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-sans text-sm font-medium text-ink-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "w-full px-3 py-2 bg-paper-50 border rounded-md",
            "font-sans text-sm text-ink-900 placeholder:text-ink-400",
            "focus:outline-none focus:ring-1 focus:ring-ink-900/20 focus:border-ink-900/40",
            "transition-all duration-200",
            error ? "border-red-400 focus:ring-red-400/20" : "border-ink-200",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="font-sans text-xs text-ink-400">{hint}</p>}
        {error && <p className="font-sans text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="font-sans text-sm font-medium text-ink-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            "w-full px-3 py-2 bg-paper-50 border rounded-md resize-none",
            "font-sans text-sm text-ink-900 placeholder:text-ink-400",
            "focus:outline-none focus:ring-1 focus:ring-ink-900/20 focus:border-ink-900/40",
            "transition-all duration-200",
            error ? "border-red-400" : "border-ink-200",
            className
          )}
          {...props}
        />
        {error && <p className="font-sans text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
