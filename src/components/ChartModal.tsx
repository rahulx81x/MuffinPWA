import { useEffect, useMemo } from 'react';
import {
  formatCurrency as formatCurrencyRaw,
  getInitialInvestmentTotal,
  INITIAL_LIQUID_BALANCE,
} from '../config';
import { useMask, MASKED_VALUE } from '../hooks/useMask';
import {
  buildMonthlyKPIs,
  currentMonthKey,
  monthKey,
} from '../lib/metrics';
import { isCountedInvestment, isProvidentFund } from '../lib/providentFund';
import type { MetricKey, Transaction } from '../types';
import { TransactionList } from './TransactionList';

interface ChartModalProps {
  open: boolean;
  metricKey: MetricKey | null;
  title: string;
  subtitle?: string;
  transactions: Transaction[];
  breakup: Record<string, number>;
  onClose: () => void;
}

type ModalKind = 'list' | 'pie' | 'line';

const MODAL_KIND: Partial<Record<MetricKey, ModalKind>> = {
  currentMonthIncome: 'list',
  currentMonthExpense: 'list',
  currentMonthInvestment: 'list',
  providentFund: 'list',
  totalInvestment: 'pie',
  investmentBreakup: 'pie',
  totalLiquid: 'line',
  netWorth: 'line',
  currentMonthSavingsPct: 'line',
};

const PIE_COLORS = [
  '#d97706',
  '#b45309',
  '#f59e0b',
  '#8c6d53',
  '#047857',
  '#b91c1c',
  '#7c5a43',
  '#c2410c',
];

function resolveListType(
  metricKey: MetricKey
): Transaction['type'] | null {
  if (metricKey === 'currentMonthIncome') return 'income';
  if (metricKey === 'currentMonthExpense') return 'expense';
  if (metricKey === 'currentMonthInvestment') return 'investment';
  return null;
}

function PieChart({ data }: { data: Record<string, number> }) {
  const { masked, formatCurrency } = useMask();
  const entries = Object.entries(data)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

  if (!entries.length || total <= 0) {
    return (
      <p className="py-10 text-center text-sm text-text-muted">
        No allocation data yet.
      </p>
    );
  }

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <svg viewBox="0 0 180 180" className="h-44 w-44 -rotate-90">
        {entries.map(([name, amount], index) => {
          const fraction = amount / total;
          const dash = fraction * circumference;
          const segment = (
            <circle
              key={name}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={PIE_COLORS[index % PIE_COLORS.length]}
              strokeWidth="28"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return segment;
        })}
      </svg>

      <ul className="w-full space-y-2">
        {entries.map(([name, amount], index) => {
          const share = ((amount / total) * 100).toFixed(0);
          return (
            <li
              key={name}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                  }}
                />
                <span className="truncate font-medium text-text">
                  {name}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-text-muted">
                {masked ? `${share}%` : `${formatCurrency(amount)} · ${share}%`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatChartValue(
  value: number,
  asPercent: boolean,
  masked: boolean
): string {
  if (asPercent) {
    return `${value.toFixed(1)}%`;
  }
  if (masked) return MASKED_VALUE;

  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';

  if (abs >= 10_000_000) {
    return `${sign}₹${(abs / 10_000_000).toFixed(1)}Cr`;
  }
  if (abs >= 100_000) {
    return `${sign}₹${(abs / 100_000).toFixed(1)}L`;
  }
  if (abs >= 1_000) {
    return `${sign}₹${(abs / 1_000).toFixed(1)}k`;
  }
  return `${sign}${formatCurrencyRaw(abs)}`;
}

function LineChart({
  points,
  labels,
  footer,
  asPercent = false,
  masked = false,
}: {
  points: number[];
  labels: string[];
  footer?: string;
  asPercent?: boolean;
  masked?: boolean;
}) {
  if (points.length < 2) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-strong p-6 transition-colors duration-200">
        <p className="text-sm font-semibold text-text">Trend chart</p>
        <p className="max-w-xs text-center text-sm text-text-muted">
          Need at least two months of closing balances to draw a trajectory.
        </p>
      </div>
    );
  }

  const width = 340;
  const height = 220;
  const padX = 28;
  const padTop = 28;
  const padBottom = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((value, index) => {
    const x =
      padX + (index / (points.length - 1)) * (width - padX * 2);
    const y =
      height -
      padBottom -
      ((value - min) / range) * (height - padTop - padBottom);
    return { x, y, value, label: labels[index] ?? '' };
  });

  const path = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-surface-strong p-3 shadow-warm-sm transition-colors duration-200">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full"
          role="img"
          aria-label="Monthly trend with values at each point"
        >
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-600 dark:text-amber-400"
          />
          {coords.map((point, index) => {
            const labelAbove = index % 2 === 0;
            const valueY = labelAbove ? point.y - 12 : point.y + 16;
            const monthY = height - 10;
            const anchor =
              index === 0
                ? 'start'
                : index === coords.length - 1
                  ? 'end'
                  : 'middle';

            return (
              <g key={`${point.label}-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  className="fill-amber-600 dark:fill-amber-400"
                />
                <text
                  x={point.x}
                  y={valueY}
                  textAnchor={anchor}
                  className="fill-text"
                  style={{ fontSize: '10px', fontWeight: 700 }}
                >
                  {formatChartValue(point.value, asPercent, masked)}
                </text>
                <text
                  x={point.x}
                  y={monthY}
                  textAnchor={anchor}
                  className="fill-text-muted"
                  style={{ fontSize: '9px', fontWeight: 500 }}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {footer && (
        <p className="text-center text-xs text-text-muted">{footer}</p>
      )}
    </div>
  );
}

function buildClosingSeries(
  transactions: Transaction[],
  metricKey: MetricKey,
  masked: boolean
): {
  points: number[];
  labels: string[];
  footer: string;
  asPercent: boolean;
} {
  const monthly = buildMonthlyKPIs(transactions);
  if (!monthly.length) {
    return { points: [], labels: [], footer: '', asPercent: false };
  }

  let liquid = INITIAL_LIQUID_BALANCE;
  let investment = getInitialInvestmentTotal();
  const points: number[] = [];
  const labels: string[] = [];
  let asPercent = metricKey === 'currentMonthSavingsPct';

  for (const month of monthly) {
    liquid += month.liquidSavings;
    investment += month.investment;

    let value = 0;
    if (metricKey === 'totalLiquid') value = liquid;
    else if (metricKey === 'netWorth') value = liquid + investment;
    else if (metricKey === 'currentMonthSavingsPct') {
      value = month.totalSavingsPct;
    }

    points.push(value);
    labels.push(month.label);
  }

  // When masked, convert absolute currency trajectories into % of peak.
  if (masked && !asPercent && points.length > 0) {
    const peak = Math.max(...points.map((p) => Math.abs(p))) || 1;
    for (let i = 0; i < points.length; i += 1) {
      points[i] = (points[i] / peak) * 100;
    }
    asPercent = true;
    const latest = points[points.length - 1] ?? 0;
    return {
      points,
      labels,
      footer: `Shown as % of peak · latest ${latest.toFixed(1)}%`,
      asPercent,
    };
  }

  const latest = points[points.length - 1] ?? 0;
  const footer = asPercent
    ? `Latest month: ${latest.toFixed(1)}%`
    : `Latest close: ${formatCurrencyRaw(latest)}`;

  return { points, labels, footer, asPercent };
}

export function ChartModal({
  open,
  metricKey,
  title,
  subtitle,
  transactions,
  breakup,
  onClose,
}: ChartModalProps) {
  const { masked } = useMask();
  const kind = metricKey ? MODAL_KIND[metricKey] : undefined;

  const listTransactions = useMemo(() => {
    if (!metricKey) return [];
    if (metricKey === 'providentFund') {
      return transactions
        .filter(isProvidentFund)
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    const type = resolveListType(metricKey);
    if (!type) return [];
    const thisMonth = currentMonthKey();
    return transactions
      .filter((t) => {
        if (monthKey(t.date) !== thisMonth || t.type !== type) return false;
        if (type === 'investment' && !isCountedInvestment(t)) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [metricKey, transactions]);

  const series = useMemo(() => {
    if (!metricKey || kind !== 'line') {
      return { points: [], labels: [], footer: '', asPercent: false };
    }
    return buildClosingSeries(transactions, metricKey, masked);
  }, [metricKey, kind, transactions, masked]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !metricKey || !kind) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-muffin-chocolate/50 backdrop-blur-[2px] transition-opacity duration-200"
        aria-label="Dismiss modal"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-canvas shadow-warm transition-colors duration-200 pb-safe"
        style={{
          animation: 'slideUp 220ms ease-out',
        }}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" />

        <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold text-text">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-strong text-text-secondary shadow-warm-sm transition-colors duration-200 active:scale-95"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6l12 12M18 6 6 18"
              />
            </svg>
          </button>
        </header>

        <div className="overflow-y-auto px-4 pb-6">
          {kind === 'list' && (
            <TransactionList transactions={listTransactions} />
          )}
          {kind === 'pie' && <PieChart data={breakup} />}
          {kind === 'line' && (
            <LineChart
              points={series.points}
              labels={series.labels}
              footer={series.footer}
              asPercent={series.asPercent}
              masked={masked}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
