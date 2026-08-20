export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-ink-100 rounded" />
        <div className="h-4 w-64 bg-ink-100/60 rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-ink-100/40 rounded-lg" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-ink-100/40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
