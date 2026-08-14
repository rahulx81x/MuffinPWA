import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useMask } from '../../hooks/useMask';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import type { FinancialMetrics, KpiIconHint, MetricKey, Transaction } from '../../domain/types';
import { ChartModal } from './ChartModal';
import { KpiCard, type KpiTone } from './KpiCard';
import { EmptyState } from '../../components/molecules/EmptyState';

interface HomeViewProps {
  metrics: FinancialMetrics;
  transactions: Transaction[];
  /** First name / display name for the home greeting. */
  userName?: string;
  onRefresh?: () => Promise<void>;
  onAddTransaction?: () => void;
}

interface CardDef {
  key: MetricKey;
  label: string;
  value: string;
  tone?: KpiTone;
  className?: string;
  iconHint?: KpiIconHint;
  interactive?: boolean;
  breakup?: Record<string, number>;
  incomeProgress?: boolean;
  expenseProgress?: {
    pctOfIncome: number;
    cappedPct: number;
  };
  savingsBreakdown?: {
    liquidAmount: number;
    investAmount: number;
    liquidPct: number;
    investPct: number;
    liquidBarRatio: number;
    investBarRatio: number;
    hasSavings: boolean;
  };
  netWorthBreakdown?: {
    liquidAmount: number;
    investAmount: number;
    liquidRatio: number;
    investRatio: number;
    hasPositive: boolean;
  };
}

const METRIC_LABELS: Partial<Record<MetricKey, string>> = {
  currentMonthIncome: 'Month Income',
  currentMonthExpense: 'Month Expense',
  currentMonthInvestment: 'Month Investment',
  currentMonthLiquid: 'Month Net Liquid',
  currentMonthSavingsPct: 'Month Savings & Allocation',
  netWorth: 'Net Worth',
  totalLiquid: 'Total Liquid Cash',
  totalInvestment: 'Total Invested',
  providentFund: 'Provident Fund',
  avgMonthlySavings: 'Avg Monthly Savings',
  totalIncome: 'Lifetime Income',
  totalSpends: 'Lifetime Spends',
  incomeMinusSpends: 'Income − Spends',
  growthSinceStart: 'Growth Since Start',
  growthSinceStartPct: 'Growth Since Start %',
  monthsTracked: 'Months Tracked',
};

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeView({
  metrics,
  transactions,
  userName,
  onRefresh,
  onAddTransaction,
}: HomeViewProps) {
  const { masked, formatCurrency, formatSignedCurrency } = useMask();
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);

  const { containerRef, pullDistance, refreshing } = usePullToRefresh<HTMLDivElement>({
    onRefresh: onRefresh || (() => {}),
    disabled: !onRefresh,
  });

  const firstName = userName?.trim().split(/\s+/)[0] || '';
  const greeting = `${greetingForHour(new Date().getHours())}${
    firstName ? `, ${firstName}` : ''
  }`;

  const breakupTotal = useMemo(
    () =>
      Object.values(metrics.investmentBreakup).reduce(
        (sum, amount) => sum + amount,
        0
      ),
    [metrics.investmentBreakup]
  );

  const currentMonthExpensePct = useMemo(() => {
    if (!metrics.currentMonthIncome) return 0;
    return (metrics.currentMonthExpense / metrics.currentMonthIncome) * 100;
  }, [metrics.currentMonthIncome, metrics.currentMonthExpense]);

  const currentMonthLiquidPct = useMemo(() => {
    if (!metrics.currentMonthIncome) return 0;
    return (metrics.currentMonthLiquid / metrics.currentMonthIncome) * 100;
  }, [metrics.currentMonthIncome, metrics.currentMonthLiquid]);

  const currentMonthInvestPct = useMemo(() => {
    if (!metrics.currentMonthIncome) return 0;
    return (metrics.currentMonthInvestment / metrics.currentMonthIncome) * 100;
  }, [metrics.currentMonthIncome, metrics.currentMonthInvestment]);

  const { liquidBarRatio, investBarRatio, hasPositiveSavings } = useMemo(() => {
    const posLiquid = Math.max(0, metrics.currentMonthLiquid);
    const posInvest = Math.max(0, metrics.currentMonthInvestment);
    const totalPos = posLiquid + posInvest;
    if (totalPos <= 0) {
      return { liquidBarRatio: 0, investBarRatio: 0, hasPositiveSavings: false };
    }
    return {
      liquidBarRatio: (posLiquid / totalPos) * 100,
      investBarRatio: (posInvest / totalPos) * 100,
      hasPositiveSavings: true,
    };
  }, [metrics.currentMonthLiquid, metrics.currentMonthInvestment]);

  const { netWorthLiquidRatio, netWorthInvestRatio, hasPositiveNetWorth } = useMemo(() => {
    const posLiquid = Math.max(0, metrics.liquidBalance);
    const posInvest = Math.max(0, metrics.investmentBalance);
    const total = posLiquid + posInvest;
    if (total <= 0) {
      return { netWorthLiquidRatio: 0, netWorthInvestRatio: 0, hasPositiveNetWorth: false };
    }
    return {
      netWorthLiquidRatio: (posLiquid / total) * 100,
      netWorthInvestRatio: (posInvest / total) * 100,
      hasPositiveNetWorth: true,
    };
  }, [metrics.liquidBalance, metrics.investmentBalance]);

  const monthCards: CardDef[] = useMemo(
    () => [
      {
        key: 'currentMonthIncome',
        label: 'Month Income',
        value: formatCurrency(metrics.currentMonthIncome),
        tone: 'success',
        iconHint: 'list',
        interactive: true,
        incomeProgress: true,
      },
      {
        key: 'currentMonthExpense',
        label: 'Month Expense',
        value: formatCurrency(metrics.currentMonthExpense),
        tone: 'destructive',
        iconHint: 'list',
        interactive: true,
        expenseProgress: {
          pctOfIncome: currentMonthExpensePct,
          cappedPct: Math.min(100, Math.max(0, currentMonthExpensePct)),
        },
      },
      {
        key: 'currentMonthSavingsPct',
        label: 'Month Savings & Allocation',
        value: `${metrics.currentMonthSavingsPct.toFixed(1)}%`,
        tone: metrics.currentMonthSavingsPct >= 0 ? 'teal' : 'destructive',
        className: 'col-span-2 sm:col-span-2 md:col-span-2',
        iconHint: 'chart',
        interactive: true,
        savingsBreakdown: {
          liquidAmount: metrics.currentMonthLiquid,
          investAmount: metrics.currentMonthInvestment,
          liquidPct: currentMonthLiquidPct,
          investPct: currentMonthInvestPct,
          liquidBarRatio,
          investBarRatio,
          hasSavings: hasPositiveSavings,
        },
      },
    ],
    [
      metrics,
      formatCurrency,
      currentMonthExpensePct,
      currentMonthLiquidPct,
      currentMonthInvestPct,
      liquidBarRatio,
      investBarRatio,
      hasPositiveSavings,
    ]
  );

  const balanceCards: CardDef[] = useMemo(
    () => [
      {
        key: 'netWorth',
        label: 'Net Worth',
        value: formatCurrency(metrics.netWorth),
        tone: 'hero',
        className: 'w-full',
        iconHint: 'chart',
        interactive: true,
        netWorthBreakdown: {
          liquidAmount: metrics.liquidBalance,
          investAmount: metrics.investmentBalance,
          liquidRatio: netWorthLiquidRatio,
          investRatio: netWorthInvestRatio,
          hasPositive: hasPositiveNetWorth,
        },
      },
    ],
    [
      metrics,
      formatCurrency,
      netWorthLiquidRatio,
      netWorthInvestRatio,
      hasPositiveNetWorth,
    ]
  );

  const investmentCards: CardDef[] = useMemo(
    () => [
      {
        key: 'investmentBreakup',
        label: 'Investment Breakup',
        value: '',
        breakup: metrics.investmentBreakup,
        className: 'col-span-2 sm:col-span-2 md:col-span-2',
        iconHint: 'chart',
        interactive: true,
      },
      {
        key: 'providentFund',
        label: 'Provident Fund',
        value: formatCurrency(metrics.providentFundBalance),
        tone: 'teal',
        className: 'col-span-2 sm:col-span-2 md:col-span-2',
        iconHint: 'list',
        interactive: true,
      },
    ],
    [metrics, formatCurrency]
  );

  const lifetimeCards: CardDef[] = useMemo(
    () => [
      {
        key: 'avgMonthlySavings',
        label: 'Avg Monthly Savings',
        value: formatCurrency(metrics.avgMonthlySavings),
        tone: 'hero',
        className: 'col-span-2 sm:col-span-3 md:col-span-2',
        iconHint: 'chart',
        interactive: true,
      },
      {
        key: 'totalIncome',
        label: 'Lifetime Income',
        value: formatCurrency(metrics.totalIncome),
        tone: 'success',
      },
      {
        key: 'totalSpends',
        label: 'Lifetime Spends',
        value: formatCurrency(metrics.totalSpends),
        tone: 'destructive',
      },
      {
        key: 'incomeMinusSpends',
        label: 'Income − Spends',
        value: formatCurrency(metrics.incomeMinusSpends),
        tone: metrics.incomeMinusSpends >= 0 ? 'success' : 'destructive',
      },
      {
        key: 'growthSinceStart',
        label: 'Growth Since Start',
        value: formatSignedCurrency(metrics.growthSinceStart),
        tone: metrics.growthSinceStart >= 0 ? 'success' : 'destructive',
      },
      {
        key: 'growthSinceStartPct',
        label: 'Growth Since Start %',
        value: `${metrics.growthSinceStart < 0 ? '−' : ''}${Math.abs(metrics.growthSinceStartPct).toFixed(1)}%`,
        tone: metrics.growthSinceStart >= 0 ? 'success' : 'destructive',
      },
      {
        key: 'monthsTracked',
        label: 'Months Tracked',
        value: String(metrics.monthsTracked),
      },
    ],
    [metrics, formatCurrency, formatSignedCurrency]
  );

  const allCards = useMemo(
    () => [...monthCards, ...balanceCards, ...investmentCards, ...lifetimeCards],
    [monthCards, balanceCards, investmentCards, lifetimeCards]
  );

  const activeCard = allCards.find((c) => c.key === activeMetric);

  const renderCard = (card: CardDef) => (
    <KpiCard
      key={card.key}
      label={card.label}
      value={card.breakup ? undefined : card.value}
      tone={card.tone}
      className={card.className}
      iconHint={card.iconHint}
      interactive={card.interactive}
      onClick={card.interactive ? () => setActiveMetric(card.key) : undefined}
    >
      {card.netWorthBreakdown && (
        <div className="mt-4 space-y-2.5 border-t border-white/20 pt-3">
          {/* 2-column interactive sub-tiles with individual chart triggers */}
          <div className="grid grid-cols-2 gap-2.5 text-left">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMetric('totalLiquid');
              }}
              className="rounded-xl bg-white/10 p-2.5 backdrop-blur-xs transition-all hover:bg-white/15 active:scale-[0.98] text-left cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground/80">
                  <span className="h-2 w-2 rounded-full bg-teal-300 shadow-xs" />
                  <span>Liquid Cash</span>
                </span>
                <span className="text-[10px] opacity-0 transition-opacity group-hover:opacity-100 text-white font-semibold">
                  View →
                </span>
              </div>
              <p className="mt-1 font-display text-base font-bold tabular-nums text-primary-foreground">
                {formatCurrency(card.netWorthBreakdown.liquidAmount)}
              </p>
              <p className="text-[10px] font-medium text-primary-foreground/75">
                {card.netWorthBreakdown.liquidRatio.toFixed(1)}% of total
              </p>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMetric('totalInvestment');
              }}
              className="rounded-xl bg-white/10 p-2.5 backdrop-blur-xs transition-all hover:bg-white/15 active:scale-[0.98] text-left cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground/80">
                  <span className="h-2 w-2 rounded-full bg-amber-200 shadow-xs" />
                  <span>Investments</span>
                </span>
                <span className="text-[10px] opacity-0 transition-opacity group-hover:opacity-100 text-white font-semibold">
                  View →
                </span>
              </div>
              <p className="mt-1 font-display text-base font-bold tabular-nums text-primary-foreground">
                {formatCurrency(card.netWorthBreakdown.investAmount)}
              </p>
              <p className="text-[10px] font-medium text-primary-foreground/75">
                {card.netWorthBreakdown.investRatio.toFixed(1)}% of total
              </p>
            </button>
          </div>

          {/* Dual 100% Progress Bar inside Hero Card */}
          {card.netWorthBreakdown.hasPositive ? (
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/20 p-0.5 shadow-inner">
              {card.netWorthBreakdown.liquidRatio > 0 && (
                <div
                  className="rounded-full bg-teal-300 transition-all duration-500 ease-out shadow-xs"
                  style={{
                    width: `${card.netWorthBreakdown.liquidRatio}%`,
                  }}
                  title={`Liquid Cash: ${card.netWorthBreakdown.liquidRatio.toFixed(1)}%`}
                />
              )}
              {card.netWorthBreakdown.investRatio > 0 && (
                <div
                  className="rounded-full bg-amber-200 transition-all duration-500 ease-out shadow-xs"
                  style={{
                    width: `${card.netWorthBreakdown.investRatio}%`,
                  }}
                  title={`Investments: ${card.netWorthBreakdown.investRatio.toFixed(1)}%`}
                />
              )}
            </div>
          ) : (
            <div className="h-2 w-full rounded-full bg-white/20" />
          )}
        </div>
      )}

      {card.incomeProgress && metrics.currentMonthIncome > 0 && (
        <div className="mt-2.5 space-y-1.5 border-t border-border/40 pt-2 text-[10px]">
          <div className="flex items-center justify-between text-text-muted">
            <span>baseline income</span>
            <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              100.0%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted/60">
            <div
              className="h-full w-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
              title="100% of income baseline"
            />
          </div>
        </div>
      )}

      {card.expenseProgress && metrics.currentMonthIncome > 0 && (
        <div className="mt-2.5 space-y-1.5 border-t border-border/40 pt-2 text-[10px]">
          <div className="flex items-center justify-between text-text-muted">
            <span>of income</span>
            <span
              className={`font-bold tabular-nums ${
                card.expenseProgress.pctOfIncome > 80
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-text'
              }`}
            >
              {card.expenseProgress.pctOfIncome.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                card.expenseProgress.pctOfIncome > 80
                  ? 'bg-rose-500'
                  : card.expenseProgress.pctOfIncome > 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500/80'
              }`}
              style={{
                width: `${card.expenseProgress.cappedPct}%`,
              }}
              title={`${card.expenseProgress.pctOfIncome.toFixed(1)}% of income`}
            />
          </div>
        </div>
      )}

      {card.savingsBreakdown && (
        <div className="mt-3.5 space-y-2.5 border-t border-border/40 pt-3">
          {/* 2-column interactive sub-tiles for Month Liquid & Month Investment */}
          <div className="grid grid-cols-2 gap-2.5 text-left">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMetric('currentMonthLiquid');
              }}
              className="rounded-xl border border-border/60 bg-surface/70 p-2.5 transition-all hover:bg-surface-muted/60 active:scale-[0.98] text-left cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                  <span>Net Liquid</span>
                </span>
                <span className="text-[10px] opacity-0 transition-opacity group-hover:opacity-100 text-text font-semibold">
                  View →
                </span>
              </div>
              <p className="mt-1 font-display text-base font-bold tabular-nums text-text">
                {formatCurrency(card.savingsBreakdown.liquidAmount)}
              </p>
              <p
                className={`text-[10px] font-semibold tabular-nums ${
                  card.savingsBreakdown.liquidPct < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-text-muted'
                }`}
              >
                {card.savingsBreakdown.liquidPct < 0 ? '−' : ''}
                {Math.abs(card.savingsBreakdown.liquidPct).toFixed(1)}% of income
              </p>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMetric('currentMonthInvestment');
              }}
              className="rounded-xl border border-border/60 bg-surface/70 p-2.5 transition-all hover:bg-surface-muted/60 active:scale-[0.98] text-left cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
                  <span>Investments</span>
                </span>
                <span className="text-[10px] opacity-0 transition-opacity group-hover:opacity-100 text-text font-semibold">
                  View →
                </span>
              </div>
              <p className="mt-1 font-display text-base font-bold tabular-nums text-text">
                {formatCurrency(card.savingsBreakdown.investAmount)}
              </p>
              <p
                className={`text-[10px] font-semibold tabular-nums ${
                  card.savingsBreakdown.investPct < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-text-muted'
                }`}
              >
                {card.savingsBreakdown.investPct < 0 ? '−' : ''}
                {Math.abs(card.savingsBreakdown.investPct).toFixed(1)}% of income
              </p>
            </button>
          </div>

          {/* Dual 100% Progress Bar */}
          {card.savingsBreakdown.hasSavings ? (
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted/60">
              {card.savingsBreakdown.liquidBarRatio > 0 && (
                <div
                  className="bg-teal-500 transition-all duration-500 ease-out"
                  style={{
                    width: `${card.savingsBreakdown.liquidBarRatio}%`,
                  }}
                  title={`Liquid: ${card.savingsBreakdown.liquidBarRatio.toFixed(1)}% of positive savings`}
                />
              )}
              {card.savingsBreakdown.investBarRatio > 0 && (
                <div
                  className="bg-violet-500 transition-all duration-500 ease-out"
                  style={{
                    width: `${card.savingsBreakdown.investBarRatio}%`,
                  }}
                  title={`Invested: ${card.savingsBreakdown.investBarRatio.toFixed(1)}% of positive savings`}
                />
              )}
            </div>
          ) : (
            <div className="h-2.5 w-full rounded-full bg-surface-muted/50" />
          )}
        </div>
      )}

      {card.breakup && (
        <div className="mt-3 space-y-2.5">
          {Object.keys(card.breakup).length === 0 ? (
            <span className="text-xs text-text-muted">
              No investments configured yet
            </span>
          ) : (
            Object.entries(card.breakup)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([name, amount]) => {
                const share = breakupTotal
                  ? Math.round((amount / breakupTotal) * 100)
                  : 0;
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="truncate text-text">{name}</span>
                      <span className="shrink-0 tabular-nums text-text-secondary">
                        {masked
                          ? `${share}%`
                          : `${formatCurrency(amount)} (${share}%)`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted/50">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(100, Math.max(4, share))}%` }}
                      />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}
    </KpiCard>
  );

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: refreshing ? 48 : pullDistance }}
        >
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text shadow-warm-sm">
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent ${
                refreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: refreshing ? undefined : `rotate(${pullDistance * 4}deg)`,
              }}
            />
            <span>{refreshing ? 'Refreshing data…' : 'Pull down to refresh'}</span>
          </div>
        </div>
      )}

      {/* Greeting Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
          {greeting}
        </p>
        <h2 className="mt-1 font-display text-lg font-bold tracking-[-0.02em] text-text">
          Your money at a glance
        </h2>
      </div>

      {transactions.length === 0 && (
        <EmptyState
          icon={<Plus className="h-6 w-6" strokeWidth={2.2} />}
          title="Ready to track your money"
          description="Log your first income, expense, or investment entry using the + button to see your live financial dashboard."
          action={
            onAddTransaction
              ? { label: 'Add First Transaction', onClick: onAddTransaction }
              : undefined
          }
        />
      )}

      {/* Section 1: Net Worth & Balances */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Net Worth & Balances
        </h3>
        <div className="w-full">
          {balanceCards.map(renderCard)}
        </div>
      </section>

      {/* Section 2: This Month's Overview */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
          This Month
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-3.5">
          {monthCards.map(renderCard)}
        </div>
      </section>

      {/* Section 3: Investment Allocation */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Investments & Allocation
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-3.5">
          {investmentCards.map(renderCard)}
        </div>
      </section>

      {/* Section 4: Lifetime Metrics & Growth */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Lifetime Totals & Growth
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3.5">
          {lifetimeCards.map(renderCard)}
        </div>
      </section>

      <ChartModal
        open={activeMetric !== null}
        metricKey={activeMetric}
        title={activeCard?.label || (activeMetric ? METRIC_LABELS[activeMetric] ?? '' : '')}
        subtitle={
          activeMetric === 'providentFund'
            ? 'Tracked separately · not in net worth'
            : activeCard?.breakup
              ? 'All investment types'
              : activeCard?.value
        }
        transactions={transactions}
        breakup={metrics.investmentBreakup}
        onClose={() => setActiveMetric(null)}
      />
    </div>
  );
}
