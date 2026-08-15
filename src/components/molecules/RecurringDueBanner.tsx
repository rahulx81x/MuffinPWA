import { motion } from 'framer-motion';
import { CalendarSync, ChevronRight, Loader2, X, Zap } from 'lucide-react';
import { useMask } from '../../hooks/useMask';
import type { RecurringDueSummary } from '../../domain/recurring';

interface RecurringDueBannerProps {
  summary: RecurringDueSummary;
  logging?: boolean;
  onLogAll: () => Promise<unknown>;
  onReview: () => void;
  onDismiss: () => void;
}

export function RecurringDueBanner({
  summary,
  logging = false,
  onLogAll,
  onReview,
  onDismiss,
}: RecurringDueBannerProps) {
  const { formatCurrency } = useMask();
  const { dueItems, totalDueAmount } = summary;

  if (dueItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/15 via-primary/8 to-accent/10 p-3.5 sm:p-4 shadow-warm-md backdrop-blur-xl"
    >
      {/* Decorative ambient glow */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-3">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <CalendarSync className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Monthly Due
                </span>
                <span className="inline-flex items-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {dueItems.length} {dueItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-sm font-semibold text-text">
                {formatCurrency(totalDueAmount)} scheduled for this month
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss banner"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-strong/60 hover:text-text active:scale-95 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Due Items Preview Chips */}
        <div className="flex flex-wrap gap-1.5">
          {dueItems.slice(0, 4).map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-surface/80 px-2 py-0.5 text-[11px] font-medium text-text-secondary backdrop-blur-sm"
            >
              <span className="truncate max-w-[110px]">{item.name}</span>
              <span className="font-semibold text-text">{formatCurrency(item.amount)}</span>
            </span>
          ))}
          {dueItems.length > 4 && (
            <span className="inline-flex items-center rounded-lg border border-border/60 bg-surface/60 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
              +{dueItems.length - 4} more
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            disabled={logging}
            onClick={() => void onLogAll()}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-warm-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {logging ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Logging to Sheet...</span>
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>Log All Due ({formatCurrency(totalDueAmount)})</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={logging}
            onClick={onReview}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-border/80 bg-surface/90 px-3 py-2 text-xs font-semibold text-text shadow-warm-sm hover:bg-surface-strong active:scale-[0.98] transition-all disabled:opacity-60"
          >
            <span>Review</span>
            <ChevronRight className="h-3 w-3 text-text-muted" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
