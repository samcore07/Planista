export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Skeleton */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-muted/60 animate-pulse" />
            <div className="h-5 w-24 rounded bg-muted/50 animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-32 rounded bg-muted/40 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Workspace Skeleton */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
        {/* Title Skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-56 rounded bg-muted/60" />
            <div className="h-4 w-80 rounded bg-muted/40" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 rounded bg-muted/50" />
            <div className="h-9 w-32 rounded bg-muted/60" />
          </div>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-lg border border-border/60 bg-card space-y-2">
              <div className="h-3.5 w-24 rounded bg-muted/50" />
              <div className="h-6 w-28 rounded bg-muted/60" />
              <div className="h-2 w-full rounded bg-muted/30" />
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-6 w-36 rounded bg-muted/60" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-44 rounded-lg border border-border/60 bg-card p-5 space-y-3">
                  <div className="h-5 w-3/4 rounded bg-muted/50" />
                  <div className="h-3 w-1/2 rounded bg-muted/40" />
                  <div className="h-10 w-full rounded bg-muted/20 mt-4" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-6 w-32 rounded bg-muted/60" />
            <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded bg-muted/20" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
