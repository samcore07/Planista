export default function EventWorkspaceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title & Actions Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-muted/60" />
          <div className="h-4 w-72 rounded bg-muted/40" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 rounded bg-muted/50" />
          <div className="h-8 w-28 rounded bg-muted/50" />
        </div>
      </div>

      {/* KPI / Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-lg border border-border/60 bg-card space-y-2.5">
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-20 rounded bg-muted/50" />
              <div className="h-4 w-4 rounded bg-muted/40" />
            </div>
            <div className="h-6 w-28 rounded bg-muted/60" />
            <div className="h-2 w-full rounded bg-muted/30" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-lg border border-border/60 bg-card p-6 space-y-4">
        <div className="h-5 w-36 rounded bg-muted/60" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="h-12 w-full rounded bg-muted/30" />
          ))}
        </div>
      </div>
    </div>
  );
}
