"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const nav = [
  { label: "Today", href: "/", glyph: "❑" },
  { label: "The List", href: "/todos", glyph: "✓" },
  { label: "Ask", href: "/ai", glyph: "✦" },
  { label: "Calendar", href: "/calendar", glyph: "▤" },
  { label: "Settings", href: "/settings", glyph: "⚙" },
];

/** The notebook's cover and tabbed dividers, pinned to the left. */
export function Sidebar() {
  const pathname = usePathname();
  const today = new Date();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-pencil-200/70 bg-paper-200 lg:flex">
      {/* Stitched binding down the inner edge. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-px"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(120,100,70,0.45) 0 7px, transparent 7px 15px)",
        }}
      />

      <div className="px-6 pb-4 pt-7">
        <h1 className="font-hand text-[34px] leading-none text-ink-900">CogniTask</h1>
        <p className="mt-1 font-type text-[10px] uppercase tracking-[0.2em] text-pencil-400">
          {today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <div className="cut-line mt-4" />
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {nav.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group relative flex items-center gap-3 rounded-[3px] px-3 py-2 font-hand text-[21px] leading-none transition-all",
                isActive
                  ? "bg-paper-50 text-ink-900 shadow-sheet"
                  : "text-pencil-500 hover:bg-paper-100/70 hover:text-ink-800"
              )}
            >
              {/* Active page gets a marker tab sticking out. */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute -right-[9px] top-1/2 h-7 w-2.5 -translate-y-1/2 rounded-r-sm bg-marker-yellow shadow-sheet"
                />
              )}
              <span className={clsx("text-[15px]", isActive ? "text-ink-700" : "text-pencil-300")}>
                {item.glyph}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 pb-6">
        <div className="cut-line mb-3" />
        <p className="font-type text-[9px] uppercase tracking-[0.18em] text-pencil-300">
          v0.1 · pen &amp; paper
        </p>
      </div>
    </aside>
  );
}
