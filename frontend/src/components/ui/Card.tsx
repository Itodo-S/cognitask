"use client";

import { clsx } from "clsx";
import { Sheet } from "./Paper";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

/** Thin wrapper kept so existing callers keep working; renders a paper sheet. */
export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <Sheet
      onClick={onClick}
      className={clsx(hover && "transition-shadow duration-200 hover:shadow-sheet-md", className)}
    >
      {children}
    </Sheet>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("border-b border-dashed border-pencil-200 px-5 py-3", className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("border-t border-dashed border-pencil-200 px-5 py-3", className)}>
      {children}
    </div>
  );
}
