"use client";

import { clsx } from "clsx";

type CheckState = "empty" | "checked" | "half";

interface InkCheckProps {
  state: CheckState;
  onClick?: () => void;
  size?: "sm" | "md";
  /** Red pen instead of blue-black — used for urgent tasks. */
  tone?: "ink" | "red";
  label?: string;
  className?: string;
}

/**
 * A checkbox drawn by hand: a slightly-off square with an ink tick that gets
 * stroked on rather than appearing. Deliberately not a native input so the
 * square can be a wobbly SVG path.
 */
export function InkCheck({
  state,
  onClick,
  size = "md",
  tone = "ink",
  label,
  className,
}: InkCheckProps) {
  const px = size === "sm" ? 18 : 24;
  const stroke = tone === "red" ? "#b93a28" : "#1f3a5f";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={state === "checked"}
      className={clsx(
        "flex-shrink-0 grid place-items-center rounded transition-transform duration-150",
        onClick && "hover:scale-110 active:scale-95 cursor-pointer",
        !onClick && "pointer-events-none",
        className
      )}
      style={{ width: px, height: px }}
    >
      <svg width={px} height={px} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {/* The box: four strokes that don't quite meet, like a real pen box. */}
        <path
          d="M4.2 3.6 C8 3.1 16 3.3 19.9 3.9 C20.4 8 20.2 16 19.6 19.9 C15.5 20.5 8 20.3 4.1 19.7 C3.4 15.6 3.6 8 4.2 3.6 Z"
          stroke={stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={state === "empty" ? 0.55 : 0.8}
        />

        {state === "checked" && (
          <path
            d="M6 12.4 C8 14 9.4 16.2 10.6 17.8 C13 13.4 15.6 8.8 19.4 4.6"
            stroke={stroke}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{ strokeDasharray: 24, strokeDashoffset: 24 }}
            className="animate-draw-check"
          />
        )}

        {/* A dash for "some of the lines inside are done". */}
        {state === "half" && (
          <path
            d="M7.2 12 C10 11.5 14 11.6 16.8 12.1"
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          />
        )}
      </svg>
    </button>
  );
}

/**
 * A hand-drawn strike-through that draws itself across completed text.
 * Sits absolutely over the text it crosses out.
 */
export function InkStrike({ tone = "ink" }: { tone?: "ink" | "red" }) {
  return (
    <svg
      className="pointer-events-none absolute left-0 top-1/2 w-full -translate-y-1/2 overflow-visible"
      height="8"
      viewBox="0 0 200 8"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M1 4.6 C34 2.4 62 5.6 98 3.4 C132 1.6 168 5.2 199 3"
        stroke={tone === "red" ? "#b93a28" : "#1f3a5f"}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
        vectorEffect="non-scaling-stroke"
        style={{ strokeDasharray: 220, strokeDashoffset: 220 }}
        className="animate-strike"
      />
    </svg>
  );
}
