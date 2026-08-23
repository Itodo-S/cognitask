"use client";

import { clsx } from "clsx";
import { forwardRef, useId } from "react";
import { FieldLabel } from "./Paper";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Underline only, like writing straight onto a ruled line. */
  bare?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, bare, id, ...props }, ref) => {
    const generated = useId();
    const inputId = id ?? generated;

    return (
      <div className="flex flex-col gap-1.5">
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            bare ? "write-line" : "write-box",
            "text-[17px] leading-snug",
            error && "border-redpen-400",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="font-type text-[10px] text-pencil-300">{hint}</p>}
        {error && <p className="font-hand text-base text-redpen-500">{error}</p>}
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
    const generated = useId();
    const areaId = id ?? generated;

    return (
      <div className="flex flex-col gap-1.5">
        {label && <FieldLabel htmlFor={areaId}>{label}</FieldLabel>}
        <textarea
          ref={ref}
          id={areaId}
          className={clsx(
            "write-box resize-none text-[17px] leading-relaxed",
            error && "border-redpen-400",
            className
          )}
          {...props}
        />
        {error && <p className="font-hand text-base text-redpen-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
