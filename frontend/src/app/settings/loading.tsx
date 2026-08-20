export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-28 bg-ink-100 rounded" />
        <div className="h-4 w-56 bg-ink-100/60 rounded" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 bg-ink-100/40 rounded-lg" />
      ))}
      <div className="h-10 w-32 bg-ink-100 rounded-md ml-auto" />
    </div>
  );
}
