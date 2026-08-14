export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-muted/60 ${className}`}
      aria-hidden="true"
    />
  );
}
