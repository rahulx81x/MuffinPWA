import { Skeleton } from './Skeleton';

export function SkeletonKpiGrid() {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Loading financial data">
      <div className="space-y-1">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-6 w-48" />
      </div>

      {/* Hero Card Skeleton */}
      <div className="hero-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-24 bg-white/20" />
          <Skeleton className="h-6 w-6 rounded-full bg-white/20" />
        </div>
        <Skeleton className="h-9 w-48 bg-white/20" />
        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/20">
          <div className="rounded-xl bg-white/10 p-2.5 space-y-2">
            <Skeleton className="h-3 w-20 bg-white/20" />
            <Skeleton className="h-5 w-24 bg-white/20" />
          </div>
          <div className="rounded-xl bg-white/10 p-2.5 space-y-2">
            <Skeleton className="h-3 w-20 bg-white/20" />
            <Skeleton className="h-5 w-24 bg-white/20" />
          </div>
        </div>
        <Skeleton className="h-2.5 w-full rounded-full bg-white/20" />
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="cozy-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
    </section>
  );
}
