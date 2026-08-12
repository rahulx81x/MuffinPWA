export function ShimmerSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pt-4 sm:max-w-3xl lg:max-w-5xl">
      {/* Top Banner Skeleton */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface/70 p-5 shadow-warm-sm backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-border/60 animate-pulse" />
            <div className="h-7 w-36 rounded-xl bg-border/80 animate-pulse" />
          </div>
          <div className="h-10 w-10 rounded-2xl bg-border/60 animate-pulse" />
        </div>
      </div>

      {/* KPI Grid Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface/70 p-4 shadow-warm-sm backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-16 rounded-full bg-border/60 animate-pulse" />
              <div className="h-7 w-7 rounded-xl bg-border/60 animate-pulse" />
            </div>
            <div className="h-6 w-28 rounded-lg bg-border/80 animate-pulse" />
            <div className="mt-2 h-2.5 w-20 rounded-full bg-border/50 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Ledger Skeleton Items */}
      <div className="space-y-3 pt-2">
        <div className="h-4 w-28 rounded-full bg-border/60 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl border border-border/50 bg-surface/70 p-3.5 shadow-warm-sm backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-border/70 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-24 rounded-md bg-border/80 animate-pulse" />
                <div className="h-2.5 w-16 rounded-md bg-border/50 animate-pulse" />
              </div>
            </div>
            <div className="h-4 w-20 rounded-md bg-border/80 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
