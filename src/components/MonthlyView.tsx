import { useMemo } from 'react';
import { useMask } from '../hooks/useMask';
import { buildMonthlyKPIs } from '../lib/metrics';
import type { Transaction } from '../types';

interface MonthlyViewProps {
  transactions: Transaction[];
}

export function MonthlyView({ transactions }: MonthlyViewProps) {
  const { formatCurrency } = useMask();
  const monthly = useMemo(
    () => buildMonthlyKPIs(transactions).slice().reverse(),
    [transactions]
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          Monthly log
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Closing totals and savings rate by month
        </p>
      </div>

      {monthly.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface-strong/80 p-6 text-center text-sm text-text-muted">
          No monthly history yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5 space-y-0">
          {monthly.map((m) => (
            <li
              key={m.key}
              className="cozy-card p-4 transition-all duration-200"
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h3 className="font-display text-base font-bold text-text">
                  {m.label}
                </h3>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  Save {m.totalSavingsPct.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <MiniStat
                  label="Income"
                  value={formatCurrency(m.income)}
                  className="text-emerald-600 dark:text-emerald-400"
                />
                <MiniStat
                  label="Spends"
                  value={formatCurrency(m.spends)}
                  className="text-rose-600 dark:text-rose-400"
                />
                <MiniStat
                  label="Invest"
                  value={formatCurrency(m.investment)}
                  className="text-violet-600 dark:text-violet-400"
                />
                <MiniStat
                  label="Closing Balance"
                  value={formatCurrency(m.closingLiquid)}
                  className="text-teal-600 dark:text-teal-400"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className={`mt-0.5 text-xs font-bold tabular-nums ${className}`}>
        {value}
      </p>
    </div>
  );
}
