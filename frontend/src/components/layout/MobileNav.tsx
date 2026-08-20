"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const tabs = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Todos", href: "/todos", icon: "check" },
  { label: "AI", href: "/ai", icon: "ai" },
  { label: "Calendar", href: "/calendar", icon: "cal" },
  { label: "Settings", href: "/settings", icon: "gear" },
];

function TabIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  const s = size;
  if (icon === "home")
    return <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7-5.5L17 8"/><path d="M5 7v7.5a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1V7"/></svg>;
  if (icon === "check")
    return <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 10l3.5 3.5L15.5 6"/></svg>;
  if (icon === "ai")
    return <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7"/><path d="M10 6v8M6 10h8"/></svg>;
  if (icon === "cal")
    return <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 2v3M13 2v3"/></svg>;
  return <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"/></svg>;
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-paper-50/95 backdrop-blur-md border-t border-ink-200/60">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg",
                "transition-all duration-150 min-w-[48px]",
                isActive ? "text-ink-900" : "text-ink-400 active:text-ink-600"
              )}
            >
              <TabIcon icon={tab.icon} />
              <span className="font-sans text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
