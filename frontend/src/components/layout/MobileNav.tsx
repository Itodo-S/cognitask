"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const tabs = [
  { label: "Today", href: "/", glyph: "❑" },
  { label: "List", href: "/todos", glyph: "✓" },
  { label: "Ask", href: "/ai", glyph: "✦" },
  { label: "Dates", href: "/calendar", glyph: "▤" },
  { label: "Setup", href: "/settings", glyph: "⚙" },
];

/** Index tabs along the bottom edge of the notebook. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-pencil-200 bg-paper-200/95 backdrop-blur-sm lg:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "relative flex min-w-[52px] flex-col items-center gap-0.5 px-2 py-1.5 transition-colors",
                isActive ? "text-ink-900" : "text-pencil-400"
              )}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute -top-px h-1 w-8 rounded-b-sm bg-marker-yellow"
                />
              )}
              <span className="text-base leading-none">{tab.glyph}</span>
              <span className="font-hand text-[15px] leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
