export default function CalendarLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-36 bg-ink-100 rounded" />
        <div className="h-4 w-48 bg-ink-100/60 rounded" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-ink-100/40 rounded-lg" />
        <div className="h-96 bg-ink-100/40 rounded-lg" />
      </div>
    </div>
  );
}
