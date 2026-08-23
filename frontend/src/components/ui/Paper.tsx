"use client";

import { clsx } from "clsx";

interface SheetProps {
  children: React.ReactNode;
  className?: string;
  /** Surface pattern printed on the paper. */
  lined?: boolean;
  dotted?: boolean;
  grid?: boolean;
  /** Ragged bottom edge, as if torn from a pad. */
  torn?: boolean;
  /** Visible edges of the pages underneath. */
  stacked?: boolean;
  /** Ring-binder holes down the left. */
  punched?: boolean;
  tilt?: "a" | "b" | "c" | "none";
  onClick?: () => void;
}

export function Sheet({
  children,
  className,
  lined,
  dotted,
  grid,
  torn,
  stacked,
  punched,
  tilt = "none",
  onClick,
}: SheetProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "sheet rounded-[3px]",
        lined && "sheet-ruled",
        dotted && "sheet-dotted",
        grid && "sheet-grid",
        torn && "sheet-torn",
        stacked && "sheet-stack",
        punched && "sheet-punched",
        tilt !== "none" && `tilt-${tilt}`,
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

const stickyTones = {
  yellow: "bg-sticky-yellow",
  orange: "bg-sticky-orange",
  pink: "bg-sticky-pink",
  blue: "bg-sticky-blue",
  green: "bg-sticky-green",
} as const;

export function StickyNote({
  children,
  className,
  tone = "yellow",
  tilt = "b",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: keyof typeof stickyTones;
  tilt?: "a" | "b" | "c" | "none";
}) {
  return (
    <div
      className={clsx(
        "sticky-note rounded-[2px] p-4",
        stickyTones[tone],
        tilt !== "none" && `tilt-${tilt}`,
        className
      )}
    >
      {children}
    </div>
  );
}

/** A strip of masking tape holding something to the page. */
export function Tape({
  className,
  rotate = -4,
}: {
  className?: string;
  rotate?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={clsx("tape", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    />
  );
}

/** Faint ring where a mug sat on the page. */
export function CoffeeRing({
  className,
  size = 84,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={clsx("coffee-ring", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Section heading with a hand-drawn underline. */
export function PageHeading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag className={clsx("font-hand text-ink-900", className)}>
      <span className="pen-underline">{children}</span>
    </Tag>
  );
}

/** Small uppercase typewriter label, for the pre-printed parts of a form. */
export function FieldLabel({
  children,
  className,
  htmlFor,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx("font-type text-[10px] uppercase tracking-[0.14em] text-pencil-400", className)}
    >
      {children}
    </label>
  );
}
