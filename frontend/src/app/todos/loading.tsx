export default function TodosLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-ink-100 rounded" />
          <div className="h-4 w-48 bg-ink-100/60 rounded" />
        </div>
        <div className="h-9 w-28 bg-ink-100 rounded-md" />
      </div>
      <div className="flex gap-3">
        <div className="h-9 flex-1 bg-ink-100/40 rounded-md" />
        <div className="h-9 w-64 bg-ink-100/40 rounded-lg" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-ink-100/40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
