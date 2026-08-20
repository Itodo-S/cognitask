export default function AiLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] animate-pulse">
      <div className="space-y-2 mb-6">
        <div className="h-8 w-36 bg-ink-100 rounded" />
        <div className="h-4 w-52 bg-ink-100/60 rounded" />
      </div>
      <div className="flex-1 bg-ink-100/30 rounded-lg mb-4" />
      <div className="h-10 bg-ink-100/40 rounded-md" />
    </div>
  );
}
