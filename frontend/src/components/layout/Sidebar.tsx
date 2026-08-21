"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const nav = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="6" height="6" rx="1" />
        <rect x="10" y="2" width="6" height="6" rx="1" />
        <rect x="2" y="10" width="6" height="6" rx="1" />
        <rect x="10" y="10" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    label: "Todos",
    href: "/todos",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9l3 3 7-7" />
      </svg>
    ),
  },
  {
    label: "AI Assistant",
    href: "/ai",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="7" />
        <path d="M9 6v6M6 9h6" />
      </svg>
    ),
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="14" height="13" rx="2" />
        <path d="M2 7h14M6 1v4M12 1v4" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="2.5" />
        <path d="M14.8 11a1.5 1.5 0 00.3 1.65l.05.05a1.82 1.82 0 01-1.28 3.1 1.82 1.82 0 01-1.29-.53l-.05-.05a1.5 1.5 0 00-1.65-.3 1.5 1.5 0 00-.91 1.37v.16a1.82 1.82 0 01-3.64 0v-.08a1.5 1.5 0 00-.98-1.37 1.5 1.5 0 00-1.65.3l-.05.05a1.82 1.82 0 01-2.57-2.57l.05-.05a1.5 1.5 0 00.3-1.65 1.5 1.5 0 00-1.37-.91H2.4a1.82 1.82 0 010-3.64h.08a1.5 1.5 0 001.37-.98 1.5 1.5 0 00-.3-1.65l-.05-.05A1.82 1.82 0 015.67 1.53l.05.05a1.5 1.5 0 001.65.3h.07a1.5 1.5 0 00.91-1.37V.8A1.82 1.82 0 0110.16.8v.08a1.5 1.5 0 00.91 1.37 1.5 1.5 0 001.65-.3l.05-.05a1.82 1.82 0 012.57 2.57l-.05.05a1.5 1.5 0 00-.3 1.65v.07a1.5 1.5 0 001.37.91h.16a1.82 1.82 0 010 3.64h-.08a1.5 1.5 0 00-1.37.91z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:bg-paper-50 lg:border-r lg:border-ink-200/60">
      {}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-ink-200/40">
        <div className="w-8 h-8 bg-ink-900 rounded-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="font-serif text-lg font-semibold text-ink-900 leading-none">CogniTask</h1>
          <p className="font-sans text-[10px] text-ink-400 mt-0.5 tracking-wider uppercase">AI-Powered</p>
        </div>
      </div>

      {}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-md",
                "font-sans text-sm transition-all duration-150",
                isActive
                  ? "bg-ink-900 text-paper-50 shadow-paper"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {}
      <div className="px-6 py-4 border-t border-ink-200/40">
        <p className="font-sans text-[10px] text-ink-400 text-center">
          v0.1.0 · Claude Agent SDK Ready
        </p>
      </div>
    </aside>
  );
}
