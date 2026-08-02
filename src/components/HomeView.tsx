import { useMemo, useState } from 'react';
import { useMask } from '../hooks/useMask';
import type { FinancialMetrics, KpiIconHint, MetricKey, Transaction } from '../types';
import { ChartModal } from './ChartModal';
import { KpiCard, type KpiTone } from './KpiCard';

interface HomeViewProps {
  metrics: FinancialMetrics;
  transactions: Transaction[];
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
}

export function HomeView({ metrics, transactions }: HomeViewProps) {
  const { masked, formatCurrency, formatSignedCurrency } = useMask();
  const [showMore, setShowMore] = useState(false);
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);

  const breakupTotal = useMemo(
    () =>
      Object.values(metrics.investmentBreakup).reduce(
        (sum, amount) => sum + amount,
        0
      ),
    [metrics.investmentBreakup]
  );

  const defaultCards: CardDef[] = useMemo(
    () => [
      {
        key: 'currentMonthIncome',
        label: 'Current Month Income',
        value: formatCurrency(metrics.currentMonthIncome),
        tone: 'success',
        iconHint: 'list',
        interactive: true,
      },
      {
        key: 'currentMonthExpense',
        label: 'Current Month Expense',
        value: formatCurrency(metrics.currentMonthExpense),
        tone: 'destructive',
        iconHint: 'list',
        interactive: true,
      },
      {
        key: 'currentMonthInvestment',
        label: 'Current Month Investment',
        value: formatCurrency(metrics.currentMonthInvestment),
        tone: 'violet',
        iconHint: 'list',
        interactive: true,
      },
      {
        key: 'currentMonthSavingsPct',
        label: 'Current Month Savings %',
        value: `${metrics.currentMonthSavingsPct.toFixed(1)}%`,
        tone: metrics.currentMonthSavingsPct >= 0 ? 'teal' : 'destructive',
        iconHint: 'chart',
        interactive: true,
      },
      {
        key: 'totalLiquid',
        label: 'Total Liquid',
        value: formatCurrency(metrics.liquidBalance),
        tone: 'teal',
        iconHint: 'chart',
        interactive: true,
      },
      {
        key: 'totalInvestment',
        label: 'Total Investment',
        value: formatCurrency(metrics.investmentBalance),
        tone: 'violet',
        iconHint: 'chart',
        interactive: true,
      },
      {
        key: 'investmentBreakup',
        label: 'Investment Breakup',
        value: '',
        breakup: metrics.investmentBreakup,
        className: 'col-span-2',
        iconHint: 'chart',
        interactive: true,
      },
      {
        key: 'netWorth',
        label: 'Net Worth',
        value: formatCurrency(metrics.netWorth),
        tone: 'hero',
        className: 'col-span-2',
        iconHint: 'chart',
        interactive: true,
      },
    ],
    [metrics, formatCurrency]
  );

  const detailCards: CardDef[] = useMemo(
    () => [
      {
        key: 'currentMonthLiquid',
        label: 'Current Month Liquid',
        value: formatCurrency(metrics.currentMonthLiquid),
        tone: metrics.currentMonthLiquid >= 0 ? 'teal' : 'destructive',
      },
      {
        key: 'totalIncome',
        label: 'Total Income',
        value: formatCurrency(metrics.totalIncome),
        tone: 'success',
      },
      {
        key: 'totalSpends',
        label: 'Total Spends',
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
        value: `${metrics.growthSinceStart >= 0 ? '+' : ''}${metrics.growthSinceStartPct.toFixed(1)}%`,
        tone: metrics.growthSinceStart >= 0 ? 'success' : 'destructive',
      },
      {
        key: 'avgMonthlySavings',
        label: 'Avg Monthly Net Savings',
        value: formatCurrency(metrics.avgMonthlySavings),
        tone: metrics.avgMonthlySavings >= 0 ? 'teal' : 'destructive',
      },
      {
        key: 'monthsTracked',
        label: 'Months Tracked',
        value: String(metrics.monthsTracked),
      },
    ],
    [metrics, formatCurrency, formatSignedCurrency]
  );

  const activeCard = defaultCards.find((c) => c.key === activeMetric);

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {defaultCards.map((card) => (
          <KpiCard
            key={card.key}
            label={card.label}
            value={card.breakup ? undefined : card.value}
            tone={card.tone}
            className={card.className}
            iconHint={card.iconHint}
            interactive={card.interactive}
            onClick={() => setActiveMetric(card.key)}
          >
            {card.breakup && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.keys(card.breakup).length === 0 ? (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    No investments yet
                  </span>
                ) : (
                  Object.entries(card.breakup)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([name, amount]) => {
                      const share = breakupTotal
                        ? ((amount / breakupTotal) * 100).toFixed(0)
                        : '0';
                      return (
                        <span
                          key={name}
                          className="inline-flex max-w-full items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          <span className="truncate">{name}</span>
                          <span className="ml-1.5 tabular-nums text-zinc-500 dark:text-zinc-400">
                            {masked
                              ? `${share}%`
                              : `${formatCurrency(amount)} · ${share}%`}
                          </span>
                        </span>
                      );
                    })
                )}
              </div>
            )}
          </KpiCard>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        aria-expanded={showMore}
      >
        {showMore ? 'Show Less' : 'More Details'}
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        className={`grid grid-cols-2 gap-3 overflow-hidden transition-all duration-300 ease-out ${
          showMore ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {detailCards.map((card) => (
          <KpiCard
            key={card.key}
            label={card.label}
            value={card.value}
            tone={card.tone}
            interactive={false}
          />
        ))}
      </div>

      <ChartModal
        open={activeMetric !== null}
        metricKey={activeMetric}
        title={activeCard?.label ?? ''}
        subtitle={
          activeCard?.breakup
            ? 'Allocation overview'
            : activeCard?.value
        }
        transactions={transactions}
        breakup={metrics.investmentBreakup}
        onClose={() => setActiveMetric(null)}
      />
    </section>
  );
}
