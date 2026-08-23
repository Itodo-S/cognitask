/** Pencil ruling appearing before the ink does. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-9 w-56 animate-pulse rounded-full bg-pencil-100" />
        <div className="h-4 w-72 animate-pulse rounded-full bg-pencil-100/70" />
      </div>
      <div className="space-y-3 pt-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-5 animate-pulse rounded-full bg-pencil-100"
            style={{ width: `${92 - i * 9}%`, animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
