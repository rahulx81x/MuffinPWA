import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronRight } from 'lucide-react';
import { useMask } from '../../hooks/useMask';
import { useRecipeConfig } from '../../hooks/useRecipeConfig';
import { buildMonthlyKPIs } from '../../domain/metrics';
import type { Transaction } from '../../domain/types';
import { EmptyState } from '../../components/molecules/EmptyState';
import { springSoft } from '../../lib/motion';

interface MonthlyViewProps {
  transactions: Transaction[];
  onSelectMonth?: (monthKey: string) => void;
  onAddTransaction?: () => void;
}

export function MonthlyView({
  transactions,
  onSelectMonth,
  onAddTransaction,
}: MonthlyViewProps) {
  const { formatCurrency } = useMask();
  const { config: recipeConfig } = useRecipeConfig();
  const monthly = useMemo(
    () => buildMonthlyKPIs(transactions, recipeConfig.openingBalance).slice().reverse(),
    [transactions, recipeConfig.openingBalance]
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-text">
          Monthly log
        </h2>
        <p className="text-sm text-text-muted">
          Closing totals and savings rate by month · tap a month to drill down in Ledger
        </p>
      </div>

      {monthly.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="No monthly history yet"
          description="Your month-by-month financial progression and savings rate will appear here as soon as transactions are logged."
          action={
            onAddTransaction
              ? { label: 'Add First Transaction', onClick: onAddTransaction }
              : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5 space-y-0">
          {monthly.map((m) => {
            const isClickable = Boolean(onSelectMonth);

            return (
              <motion.li
                key={m.key}
                whileHover={isClickable ? { y: -2 } : undefined}
                whileTap={isClickable ? { scale: 0.985 } : undefined}
                transition={springSoft}
                onClick={isClickable ? () => onSelectMonth?.(m.key) : undefined}
                className={`cozy-card p-4 transition-all duration-200 ${
                  isClickable ? 'cursor-pointer hover:border-primary/40 hover:shadow-warm' : ''
                }`}
              >
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-text">
                      {m.label}
                    </h3>
                    {isClickable && (
                      <span className="flex items-center text-[11px] font-semibold text-primary">
                        <span>Ledger</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    Save {m.totalSavingsPct.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 pt-1">
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
              </motion.li>
            );
          })}
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
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className={`mt-0.5 text-xs font-bold tabular-nums ${className}`}>
        {value}
      </p>
    </div>
  );
}
