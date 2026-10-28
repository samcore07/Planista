export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Skeleton */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-base shadow-sm">
                P
              </div>
              <span className="font-serif text-lg font-semibold tracking-tight text-foreground">
                Planista
              </span>
            </div>
            <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
              Overview
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-muted/40 animate-pulse" />
            <div className="h-4 w-28 rounded bg-muted/40 animate-pulse hidden sm:block" />
            <div className="h-8 w-16 rounded bg-muted/30 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Workspace Skeleton */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
        {/* Title & Actions Skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="h-8 w-56 rounded bg-muted/60" />
            <div className="h-4 w-72 rounded bg-muted/40" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 rounded bg-muted/40" />
            <div className="h-9 w-28 rounded bg-muted/60" />
          </div>
        </div>

        {/* Security & RLS Status Skeleton */}
        <div className="rounded-lg border border-border bg-secondary/30 p-3.5 flex items-center justify-between">
          <div className="h-4 w-72 rounded bg-muted/50" />
          <div className="h-5 w-24 rounded bg-muted/40" />
        </div>

        {/* 3 Metric Cards Skeleton (Matches page.tsx 1:1) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-lg border border-border bg-card space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-24 rounded bg-muted/50" />
                <div className="h-4 w-4 rounded bg-muted/40" />
              </div>
              <div className="h-8 w-32 rounded bg-muted/60" />
              <div className="h-3 w-40 rounded bg-muted/30" />
            </div>
          ))}
        </div>

        {/* Celebrations List & Radar Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-36 rounded bg-muted/60" />
              <div className="h-4 w-12 rounded bg-muted/30" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-56 rounded-lg border border-border bg-card p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 w-16 rounded bg-muted/40" />
                    <div className="h-5 w-3/4 rounded bg-muted/60" />
                    <div className="h-3.5 w-24 rounded bg-muted/30" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-3 w-32 rounded bg-muted/30" />
                    <div className="h-3 w-40 rounded bg-muted/30" />
                  </div>
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="h-2 w-full rounded bg-muted/40" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-6 w-36 rounded bg-muted/60" />
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="h-4 w-44 rounded bg-muted/40" />
              <div className="space-y-2 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-md bg-secondary/40 p-3 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-muted/50" />
                    <div className="h-2.5 w-1/2 rounded bg-muted/30" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
