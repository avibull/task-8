export function TaskListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading tasks">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-b border-[color:var(--color-border)] px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="skeleton h-5 w-5 rounded-[3px]" />
            <div className="skeleton h-4 w-7 rounded-[3px]" />
            <div className="skeleton h-4 flex-1" style={{ maxWidth: `${60 + (i % 4) * 8}%` }} />
          </div>
          <div className="mt-2 flex gap-1.5" style={{ paddingLeft: "calc(1.25rem + 0.5rem + 1.75rem + 0.5rem)" }}>
            <div className="skeleton h-3 w-14" />
            <div className="skeleton h-3 w-10" />
            <div className="skeleton h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
