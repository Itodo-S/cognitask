"use client";

import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-paper-50 border border-ink-200/60 rounded-lg shadow-paper",
        "transition-all duration-200",
        hover && "hover:shadow-paper-md hover:border-ink-300/60 cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("px-4 py-3 border-b border-ink-200/40", className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("px-4 py-3", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("px-4 py-3 border-t border-ink-200/40", className)}>
      {children}
    </div>
  );
}
