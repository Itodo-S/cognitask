"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/** The heading you'd write at the top of a fresh page, then underline. */
export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-hand text-[38px] leading-none text-ink-900 sm:text-[44px]">
          <span className="pen-underline">{title}</span>
        </h1>
        {subtitle && (
          <p className="mt-3 font-note text-[15px] text-pencil-400">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
