import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  formatCurrency as formatCurrencyRaw,
  getInitialInvestmentTotal,
  getOpeningBalance,
} from '../config';
import { useMask, MASKED_VALUE } from '../hooks/useMask';
import { useRecipeConfig } from '../hooks/useRecipeConfig';
import { useTheme } from '../hooks/useTheme';
import {
  buildMonthlyKPIs,
  currentMonthKey,
  monthKey,
} from '../lib/metrics';
import {
  backdropVariants,
  sheetTransition,
  sheetVariants,
} from '../lib/motion';
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
  avgMonthlySavings: 'line',
  currentMonthSavingsPct: 'line',
};

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
  const { theme } = useTheme();
  const pieColors = theme.chartColors;
  const entries = Object.entries(data)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  if (!entries.length || total <= 0) {
    return (
      <p className="py-10 text-center text-sm text-text-muted">
        No allocation data yet.
      </p>
    );
  }

  const activeIndex = Math.min(selectedIndex, entries.length - 1);
  const activeEntry = entries[activeIndex] ?? entries[0];
  const activeColor = pieColors[activeIndex % pieColors.length];
  const activeShare = ((activeEntry[1] / total) * 100).toFixed(1);

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Selected Item Callout Card */}
      <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface-strong p-3.5 shadow-warm-sm transition-all duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full shadow-warm-sm"
            style={{ backgroundColor: activeColor }}
          />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-text">
              {activeEntry[0]}
            </p>
            <p className="text-[11px] font-semibold text-text-muted">
              {activeShare}% of total allocation
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-base font-bold tabular-nums text-text">
            {masked ? MASKED_VALUE : formatCurrency(activeEntry[1])}
          </p>
        </div>
      </div>

      {/* Donut SVG with Touch Slices */}
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 180 180" className="h-48 w-48 -rotate-90">
          {entries.map(([name, amount], index) => {
            const fraction = amount / total;
            const dash = fraction * circumference;
            const color = pieColors[index % pieColors.length];
            const isSelected = index === activeIndex;

            const segment = (
              <circle
                key={name}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? 34 : 26}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                className="cursor-pointer transition-all duration-300 ease-out"
                style={{
                  opacity: isSelected ? 1 : 0.75,
                  filter: isSelected ? `drop-shadow(0 0 6px ${color}80)` : 'none',
                }}
                onClick={() => {
                  setSelectedIndex(index);
                }}
              />
            );
            offset += dash;
            return segment;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Total
          </span>
          <span className="font-display text-xs font-bold text-text tabular-nums">
            {masked ? MASKED_VALUE : formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Legend List */}
      <ul className="w-full space-y-1.5 pt-1">
        {entries.map(([name, amount], index) => {
          const share = ((amount / total) * 100).toFixed(0);
          const isSelected = index === activeIndex;
          return (
            <li key={name}>
              <button
                type="button"
                onClick={() => {
                  setSelectedIndex(index);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs transition-colors duration-200 ${
                  isSelected
                    ? 'border border-primary/40 bg-primary/10 font-bold text-text'
                    : 'hover:bg-surface-muted/50 text-text-secondary'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: pieColors[index % pieColors.length],
                    }}
                  />
                  <span className="truncate">{name}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {masked ? `${share}%` : `${formatCurrency(amount)} · ${share}%`}
                </span>
              </button>
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
  const { formatCurrency } = useMask();
  const [selectedIndex, setSelectedIndex] = useState<number>(
    points.length > 0 ? points.length - 1 : 0
  );

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
  const height = 210;
  const padX = 28;
  const padTop = 28;
  const padBottom = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((value, index) => {
    const x = padX + (index / (points.length - 1)) * (width - padX * 2);
    const y =
      height -
      padBottom -
      ((value - min) / range) * (height - padTop - padBottom);
    return { x, y, value, label: labels[index] ?? '' };
  });

  const activeIdx = Math.min(selectedIndex, coords.length - 1);
  const activeCoord = coords[activeIdx] ?? coords[coords.length - 1];

  // Month-over-Month Delta calculation
  let deltaText = '';
  let isPositive = true;

  if (activeIdx > 0) {
    const prevValue = points[activeIdx - 1];
    const diff = activeCoord.value - prevValue;
    const pct = prevValue !== 0 ? (diff / Math.abs(prevValue)) * 100 : 0;
    isPositive = diff >= 0;

    if (asPercent) {
      deltaText = `${isPositive ? '+' : ''}${diff.toFixed(1)}% MoM`;
    } else if (masked) {
      deltaText = `${isPositive ? '+' : ''}${pct.toFixed(1)}% MoM`;
    } else {
      deltaText = `${isPositive ? '+' : '−'}${formatCurrency(Math.abs(diff))} (${isPositive ? '+' : ''}${pct.toFixed(1)}%) MoM`;
    }
  } else {
    deltaText = 'Baseline month';
  }

  const path = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const stepWidth = width / coords.length;

  return (
    <div className="space-y-3">
      {/* Interactive Month Callout Header Card */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-strong p-3.5 shadow-warm-sm transition-all duration-200">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Selected Month
          </span>
          <p className="font-display text-sm font-bold text-text">
            {activeCoord.label}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-base font-bold tabular-nums text-text">
            {formatChartValue(activeCoord.value, asPercent, masked)}
          </p>
          <p
            className={`text-[11px] font-semibold tabular-nums ${
              activeIdx === 0
                ? 'text-text-muted'
                : isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {deltaText}
          </p>
        </div>
      </div>

      <div className="relative rounded-2xl border border-border bg-surface-strong p-3 shadow-warm-sm transition-colors duration-200">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full touch-none"
          role="img"
          aria-label="Monthly trend trajectory graph"
        >
          {/* Vertical Crosshair Line for active point */}
          <line
            x1={activeCoord.x}
            y1={padTop - 10}
            x2={activeCoord.x}
            y2={height - padBottom}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            className="text-primary/60"
          />

          {/* Line Path */}
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />

          {/* Point Circles & Month Labels */}
          {coords.map((point, index) => {
            const isSelected = index === activeIdx;
            const monthY = height - 10;
            const anchor =
              index === 0
                ? 'start'
                : index === coords.length - 1
                  ? 'end'
                  : 'middle';

            return (
              <g key={`${point.label}-${index}`}>
                {/* Active Outer Ring */}
                {isSelected && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="12"
                    className="fill-primary/20 animate-pulse"
                  />
                )}
                {/* Main Circle */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? 6 : 4}
                  className={`transition-all duration-200 ${
                    isSelected
                      ? 'fill-primary stroke-white dark:stroke-zinc-900'
                      : 'fill-primary'
                  }`}
                  strokeWidth={isSelected ? 2 : 0}
                />
                <text
                  x={point.x}
                  y={monthY}
                  textAnchor={anchor}
                  className={isSelected ? 'fill-primary font-bold' : 'fill-text-muted'}
                  style={{ fontSize: isSelected ? '10px' : '9px' }}
                >
                  {point.label}
                </text>

                {/* Wide Touch Catchers for 1-Tap & Drag selection */}
                <rect
                  x={point.x - stepWidth / 2}
                  y={0}
                  width={stepWidth}
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedIndex(index);
                  }}
                  onTouchStart={() => {
                    setSelectedIndex(index);
                  }}
                />
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

  let liquid = getOpeningBalance();
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
    else if (metricKey === 'avgMonthlySavings') {
      value = month.investment + month.liquidSavings;
    } else if (metricKey === 'currentMonthSavingsPct') {
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
  let footer = asPercent
    ? `Latest month: ${latest.toFixed(1)}%`
    : `Latest close: ${formatCurrencyRaw(latest)}`;

  if (metricKey === 'avgMonthlySavings' && points.length > 0 && !asPercent) {
    const avg = points.reduce((sum, p) => sum + p, 0) / points.length;
    footer = `Average: ${formatCurrencyRaw(avg)} · latest ${formatCurrencyRaw(latest)}`;
  }

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
  const { config: recipeConfig } = useRecipeConfig();

  // Keep last open payload so exit animation still has content to show.
  const [snapshot, setSnapshot] = useState<{
    metricKey: MetricKey;
    title: string;
    subtitle?: string;
    breakup: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    if (open && metricKey) {
      setSnapshot({ metricKey, title, subtitle, breakup });
    }
  }, [open, metricKey, title, subtitle, breakup]);

  const activeKey = snapshot?.metricKey ?? null;
  const kind = activeKey ? MODAL_KIND[activeKey] : undefined;
  const activeTitle = snapshot?.title ?? title;
  const activeSubtitle = snapshot?.subtitle ?? subtitle;
  const activeBreakup = snapshot?.breakup ?? breakup;

  const listTransactions = useMemo(() => {
    if (!activeKey) return [];
    if (activeKey === 'providentFund') {
      return transactions
        .filter(isProvidentFund)
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    const type = resolveListType(activeKey);
    if (!type) return [];
    const thisMonth = currentMonthKey();
    return transactions
      .filter((t) => {
        if (monthKey(t.date) !== thisMonth || t.type !== type) return false;
        if (type === 'investment' && !isCountedInvestment(t)) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [activeKey, transactions]);

  const series = useMemo(() => {
    if (!activeKey || kind !== 'line') {
      return { points: [], labels: [], footer: '', asPercent: false };
    }
    return buildClosingSeries(transactions, activeKey, masked);
  }, [activeKey, kind, transactions, masked, recipeConfig]);

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

  const show = open && !!activeKey && !!kind;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.button
          key="chart-backdrop"
          type="button"
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] bg-black/50"
          aria-label="Dismiss modal"
          onClick={onClose}
        />
      )}
      {show && (
        <motion.div
          key="chart-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={activeTitle}
          variants={sheetVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={sheetTransition}
          className="fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-canvas shadow-elevate transition-theme pb-safe"
        >
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" />

          <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-bold text-text">
                {activeTitle}
              </h2>
              {activeSubtitle && (
                <p className="mt-0.5 text-sm text-text-muted">{activeSubtitle}</p>
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
            {kind === 'pie' && <PieChart data={activeBreakup} />}
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
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
