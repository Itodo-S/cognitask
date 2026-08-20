"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-ink-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="font-sans text-sm text-ink-500 mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
