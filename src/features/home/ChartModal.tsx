import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  formatCurrency as formatCurrencyRaw,
} from '../../config';
import { useMask, MASKED_VALUE } from '../../hooks/useMask';
import { useRecipeConfig } from '../../hooks/useRecipeConfig';
import { useTheme } from '../../hooks/useTheme';
import {
  buildMonthlyKPIs,
  currentMonthKey,
  monthKey,
} from '../../domain/metrics';
import {
  backdropVariants,
  sheetTransition,
  sheetVariants,
} from '../../lib/motion';
import { isCountedInvestment, isProvidentFund } from '../../domain/providentFund';
import type { MetricKey, Transaction } from '../../domain/types';
import { FocusTrap } from '../../components/atoms/FocusTrap';
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
  currentMonthLiquid: 'line',
  providentFund: 'list',
  totalInvestment: 'pie',
  investmentBreakup: 'pie',
  totalLiquid: 'line',
  netWorth: 'line',
  avgMonthlySavings: 'line',
  avgMonthlyInvestment: 'line',
  avgMonthlyLiquid: 'line',
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
        <svg
          role="img"
          aria-label={`Investment breakup donut chart. Total: ${masked ? MASKED_VALUE : formatCurrency(total)}`}
          viewBox="0 0 180 180"
          className="h-48 w-48 -rotate-90"
        >
          {entries.map(([name, amount], index) => {
            const fraction = amount / total;
            const dash = fraction * circumference;
            const color = pieColors[index % pieColors.length];
            const isSelected = index === activeIndex;
            const share = ((amount / total) * 100).toFixed(1);

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
              >
                <title>{`${name}: ${masked ? MASKED_VALUE : formatCurrency(amount)} (${share}%)`}</title>
              </circle>
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
      <ul className="w-full max-h-60 overflow-y-auto space-y-1.5 pt-1 pr-1">
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

      {/* Screen Reader Data Table Alternative */}
      <table className="sr-only" aria-label="Investment breakup data table">
        <caption>Investment allocation by type</caption>
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Amount</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, amount]) => {
            const share = ((amount / total) * 100).toFixed(1);
            return (
              <tr key={name}>
                <td>{name}</td>
                <td>{formatCurrency(amount)}</td>
                <td>{share}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

export interface MultiSeriesItem {
  id: string;
  name: string;
  color: string;
  points: number[];
  unit?: 'currency' | 'percent';
}

function formatAxisLabel(label: string, isShort = false): string {
  const trimmed = label.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 2) {
    const [mon, yr] = parts;
    const shortMon = mon.slice(0, 3);
    if (isShort) return shortMon;
    const shortYr = yr.length === 4 ? `'${yr.slice(2)}` : yr;
    return `${shortMon} ${shortYr}`;
  }
  return trimmed;
}

type TimeRange = '3M' | '6M' | '1Y' | 'ALL';

function LineChart({
  points: rawPoints,
  labels: rawLabels,
  multiSeries: rawMultiSeries,
  footer,
  asPercent = false,
  masked = false,
}: {
  points: number[];
  labels: string[];
  multiSeries?: MultiSeriesItem[];
  footer?: string;
  asPercent?: boolean;
  masked?: boolean;
}) {
  const { formatCurrency } = useMask();

  const rangeOptions = useMemo(() => {
    const total = rawLabels.length;
    if (total < 4) return [];
    const opts: { id: TimeRange; label: string; count: number }[] = [];
    if (total >= 4) opts.push({ id: '3M', label: '3M', count: 3 });
    if (total >= 7) opts.push({ id: '6M', label: '6M', count: 6 });
    if (total >= 13) opts.push({ id: '1Y', label: '1Y', count: 12 });
    opts.push({ id: 'ALL', label: 'ALL', count: total });
    return opts;
  }, [rawLabels.length]);

  const [selectedRange, setSelectedRange] = useState<TimeRange>('ALL');

  const { points, labels, multiSeries } = useMemo(() => {
    const total = rawLabels.length;
    const activeOption = rangeOptions.find((r) => r.id === selectedRange);
    const count = activeOption ? activeOption.count : total;
    const startIndex = Math.max(0, total - count);

    return {
      labels: rawLabels.slice(startIndex),
      points: rawPoints.slice(startIndex),
      multiSeries: rawMultiSeries
        ? rawMultiSeries.map((s) => ({
            ...s,
            points: s.points.slice(startIndex),
          }))
        : undefined,
    };
  }, [rawLabels, rawPoints, rawMultiSeries, rangeOptions, selectedRange]);

  const [selectedIndex, setSelectedIndex] = useState<number>(
    labels.length > 0 ? labels.length - 1 : 0
  );

  // Keep selectedIndex in bounds if range changes
  useEffect(() => {
    setSelectedIndex(labels.length > 0 ? labels.length - 1 : 0);
  }, [labels.length]);

  if (labels.length < 2) {
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

  const hasMulti = Boolean(multiSeries && multiSeries.length > 0);
  const allValues = hasMulti
    ? multiSeries!.flatMap((s) => s.points)
    : points;

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const activeIdx = Math.min(Math.max(0, selectedIndex), labels.length - 1);
  const stepWidth = width / labels.length;

  // Calculate intelligent dynamic label decimation to prevent text overlap
  const totalLabels = labels.length;
  const maxAxisLabels = 5;
  const stride = totalLabels <= maxAxisLabels
    ? 1
    : Math.ceil((totalLabels - 1) / (maxAxisLabels - 1));

  const shouldRenderLabel = (index: number): boolean => {
    if (totalLabels <= maxAxisLabels) return true;
    if (index === 0) return true;
    if (index === totalLabels - 1) return true;
    if (index % stride === 0) {
      // Don't render if too close to the last index to avoid collision
      const distFromEnd = totalLabels - 1 - index;
      return distFromEnd >= Math.floor(stride * 0.75);
    }
    return false;
  };

  // Single series coords
  const coords = points.map((value, index) => {
    const x = padX + (index / (labels.length - 1)) * (width - padX * 2);
    const y =
      height -
      padBottom -
      ((value - min) / range) * (height - padTop - padBottom);
    return { x, y, value, label: labels[index] ?? '' };
  });

  // Multi series coords and paths
  const isMixedUnits = hasMulti && multiSeries!.some((item) => item.unit !== multiSeries![0].unit);

  const multiSeriesData = hasMulti
    ? multiSeries!.map((s) => {
        const sMin = isMixedUnits ? Math.min(0, ...s.points) : min;
        const sMax = isMixedUnits ? Math.max(...s.points) || 1 : max;
        const sRange = sMax - sMin || 1;

        const seriesCoords = s.points.map((value, index) => {
          const x = padX + (index / (labels.length - 1)) * (width - padX * 2);
          const y =
            height -
            padBottom -
            ((value - sMin) / sRange) * (height - padTop - padBottom);
          return { x, y, value };
        });
        const path = seriesCoords
          .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
          .join(' ');
        return {
          ...s,
          coords: seriesCoords,
          path,
          activeVal: s.points[activeIdx] ?? 0,
          activeCoord: seriesCoords[activeIdx],
        };
      })
    : [];

  const activeX = padX + (activeIdx / (labels.length - 1)) * (width - padX * 2);
  const activeCoord = coords[activeIdx] ?? coords[coords.length - 1];

  // Month-over-Month Delta calculation (for single series)
  let deltaText = '';
  let isPositive = true;

  if (activeIdx > 0 && !hasMulti) {
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
  } else if (!hasMulti) {
    deltaText = 'Baseline month';
  }

  const singlePath = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="space-y-3">
      {/* Time Range Selector (when 4+ months exist) */}
      {rangeOptions.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Timeframe
          </span>
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-surface-muted/50 p-0.5">
            {rangeOptions.map((opt) => {
              const active = selectedRange === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedRange(opt.id)}
                  className={`relative rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all duration-200 ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Month Callout Header Card */}
      <div className="rounded-2xl border border-border bg-surface-strong p-3.5 shadow-warm-sm transition-all duration-200">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Selected Month
            </span>
            <p className="truncate font-display text-sm font-bold text-text">
              {labels[activeIdx]}
            </p>
          </div>

          {!hasMulti ? (
            <div className="shrink-0 text-right">
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
          ) : null}
        </div>

        {/* Multi-series stats strip */}
        {hasMulti && (
          <div
            className={`mt-2.5 grid gap-2 border-t border-border/50 pt-2.5 text-center ${
              multiSeriesData.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
            }`}
          >
            {multiSeriesData.map((s) => (
              <div key={s.id} className="min-w-0 rounded-xl bg-surface/60 p-2">
                <div className="flex items-center justify-center gap-1.5 mb-0.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted truncate">
                    {s.name}
                  </span>
                </div>
                <span
                  className="block font-display text-sm font-bold tabular-nums truncate"
                  style={{ color: s.color }}
                >
                  {s.unit === 'currency'
                    ? formatCurrency(s.activeVal)
                    : `${s.activeVal.toFixed(1)}%`}
                </span>
              </div>
            ))}
          </div>
        )}
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
            x1={activeX}
            y1={padTop - 10}
            x2={activeX}
            y2={height - padBottom}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            className="text-primary/50"
          />

          {/* Render Multi-Series Paths */}
          {hasMulti
            ? multiSeriesData.map((s) => (
                <g key={s.id}>
                  <path
                    d={s.path}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.id === 'total' ? 2.8 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={s.id === 'total' ? 1 : 0.85}
                  />
                  {s.activeCoord && (
                    <circle
                      cx={s.activeCoord.x}
                      cy={s.activeCoord.y}
                      r={s.id === 'total' ? 5 : 4}
                      fill={s.color}
                      stroke="white"
                      className="dark:stroke-zinc-900"
                      strokeWidth={1.5}
                    />
                  )}
                </g>
              ))
            : (
                <path
                  d={singlePath}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                />
              )}

          {/* Month Labels & Touch Catchers */}
          {labels.map((label, index) => {
            const x = padX + (index / (labels.length - 1)) * (width - padX * 2);
            const isSelected = index === activeIdx;
            const isVisibleLabel = shouldRenderLabel(index);
            const monthY = height - 10;
            const anchor =
              index === 0
                ? 'start'
                : index === labels.length - 1
                  ? 'end'
                  : 'middle';

            const displayLabel = formatAxisLabel(label, totalLabels > 8);

            return (
              <g key={`${label}-${index}`}>
                {!hasMulti && isSelected && (
                  <circle
                    cx={x}
                    cy={coords[index]?.y ?? 0}
                    r="12"
                    className="fill-primary/20 animate-pulse"
                  />
                )}
                {!hasMulti && (
                  <circle
                    cx={x}
                    cy={coords[index]?.y ?? 0}
                    r={isSelected ? 6 : 3.5}
                    className={`transition-all duration-200 ${
                      isSelected
                        ? 'fill-primary stroke-white dark:stroke-zinc-900'
                        : 'fill-primary/80'
                    }`}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                )}

                {isVisibleLabel && (
                  <text
                    x={x}
                    y={monthY}
                    textAnchor={anchor}
                    className={isSelected ? 'fill-primary font-bold' : 'fill-text-muted'}
                    style={{ fontSize: isSelected ? '10px' : '9px' }}
                  >
                    {displayLabel}
                  </text>
                )}

                {/* Wide Touch Catchers for 1-Tap & Drag selection */}
                <rect
                  x={x - stepWidth / 2}
                  y={0}
                  width={stepWidth}
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => setSelectedIndex(index)}
                  onTouchStart={() => setSelectedIndex(index)}
                />
              </g>
            );
          })}
        </svg>

        {/* Legend for Multi-Series */}
        {hasMulti && (
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-border/40 pt-2 text-[11px] font-semibold">
            {multiSeriesData.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-text-secondary">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {footer && (
        <p className="text-center text-xs text-text-muted">{footer}</p>
      )}

      {/* Screen Reader Data Table Alternative */}
      <table className="sr-only" aria-label="Monthly trend data table">
        <caption>Monthly financial metric progression</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {hasMulti
              ? multiSeriesData.map((s) => <th key={s.id} scope="col">{s.name}</th>)
              : <th scope="col">Value</th>}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => (
            <tr key={`${label}-${i}`}>
              <td>{label}</td>
              {hasMulti ? (
                multiSeriesData.map((s) => (
                  <td key={s.id}>{s.points[i]?.toFixed(1)}%</td>
                ))
              ) : (
                <td>{formatChartValue(points[i] ?? 0, asPercent, masked)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildClosingSeries(
  transactions: Transaction[],
  metricKey: MetricKey,
  masked: boolean,
  openingBalance: number,
  initialInvestmentTotal: number
): {
  points: number[];
  labels: string[];
  footer: string;
  asPercent: boolean;
  multiSeries?: MultiSeriesItem[];
} {
  const monthly = buildMonthlyKPIs(transactions, openingBalance);
  if (!monthly.length) {
    return { points: [], labels: [], footer: '', asPercent: false };
  }

  let liquid = openingBalance;
  let investment = initialInvestmentTotal;
  const points: number[] = [];
  const labels: string[] = [];
  let asPercent = metricKey === 'currentMonthSavingsPct';

  for (const month of monthly) {
    liquid += month.liquidSavings;
    investment += month.investment;

    let value = 0;
    if (metricKey === 'totalLiquid' || metricKey === 'currentMonthLiquid') value = liquid;
    else if (metricKey === 'netWorth') value = liquid + investment;
    else if (metricKey === 'avgMonthlySavings') {
      value = month.investment + month.liquidSavings;
    } else if (metricKey === 'avgMonthlyInvestment') {
      value = month.investment;
    } else if (metricKey === 'avgMonthlyLiquid') {
      value = month.liquidSavings;
    } else if (metricKey === 'currentMonthSavingsPct') {
      value = month.totalSavingsPct;
    }

    points.push(value);
    labels.push(month.label);
  }

  if (metricKey === 'avgMonthlySavings') {
    const multiSeries: MultiSeriesItem[] = [
      {
        id: 'absolute',
        name: 'Savings (₹)',
        color: 'var(--color-primary)',
        points: monthly.map((m) => m.investment + m.liquidSavings),
        unit: 'currency',
      },
      {
        id: 'percent',
        name: 'Savings Rate (%)',
        color: '#10b981',
        points: monthly.map((m) => m.totalSavingsPct),
        unit: 'percent',
      },
    ];

    const avgAmount = points.reduce((sum, p) => sum + p, 0) / points.length;
    const totalInc = monthly.reduce((sum, m) => sum + m.income, 0);
    const totalSav = points.reduce((sum, p) => sum + p, 0);
    const avgPct = totalInc > 0 ? ((totalSav / totalInc) * 100).toFixed(1) : '0.0';
    const latestAmount = points[points.length - 1] ?? 0;
    const latestPct = monthly[monthly.length - 1]?.totalSavingsPct ?? 0;

    return {
      points,
      labels,
      multiSeries,
      asPercent: false,
      footer: `Average: ${formatCurrencyRaw(avgAmount)} (${avgPct}%) · latest ${formatCurrencyRaw(latestAmount)} (${latestPct.toFixed(1)}%)`,
    };
  }

  if (metricKey === 'avgMonthlyInvestment') {
    const multiSeries: MultiSeriesItem[] = [
      {
        id: 'investAmount',
        name: 'Invested (₹)',
        color: '#8b5cf6',
        points: monthly.map((m) => m.investment),
        unit: 'currency',
      },
      {
        id: 'investPct',
        name: 'Invest Rate (%)',
        color: '#a855f7',
        points: monthly.map((m) => m.investmentPct),
        unit: 'percent',
      },
    ];

    const avgAmount = points.reduce((sum, p) => sum + p, 0) / points.length;
    const totalInc = monthly.reduce((sum, m) => sum + m.income, 0);
    const totalInv = points.reduce((sum, p) => sum + p, 0);
    const avgPct = totalInc > 0 ? ((totalInv / totalInc) * 100).toFixed(1) : '0.0';
    const latestAmount = points[points.length - 1] ?? 0;
    const latestPct = monthly[monthly.length - 1]?.investmentPct ?? 0;

    return {
      points,
      labels,
      multiSeries,
      asPercent: false,
      footer: `Average: ${formatCurrencyRaw(avgAmount)} (${avgPct}%) · latest ${formatCurrencyRaw(latestAmount)} (${latestPct.toFixed(1)}%)`,
    };
  }

  if (metricKey === 'avgMonthlyLiquid') {
    const multiSeries: MultiSeriesItem[] = [
      {
        id: 'liquidAmount',
        name: 'Liquid Retained (₹)',
        color: '#0d9488',
        points: monthly.map((m) => m.liquidSavings),
        unit: 'currency',
      },
      {
        id: 'liquidPct',
        name: 'Liquid Rate (%)',
        color: '#14b8a6',
        points: monthly.map((m) => m.liquidSavingsPct),
        unit: 'percent',
      },
    ];

    const avgAmount = points.reduce((sum, p) => sum + p, 0) / points.length;
    const totalInc = monthly.reduce((sum, m) => sum + m.income, 0);
    const totalLiq = points.reduce((sum, p) => sum + p, 0);
    const avgPct = totalInc > 0 ? ((totalLiq / totalInc) * 100).toFixed(1) : '0.0';
    const latestAmount = points[points.length - 1] ?? 0;
    const latestPct = monthly[monthly.length - 1]?.liquidSavingsPct ?? 0;

    return {
      points,
      labels,
      multiSeries,
      asPercent: false,
      footer: `Average: ${formatCurrencyRaw(avgAmount)} (${avgPct}%) · latest ${formatCurrencyRaw(latestAmount)} (${latestPct.toFixed(1)}%)`,
    };
  }

  if (metricKey === 'currentMonthSavingsPct') {
    const multiSeries: MultiSeriesItem[] = [
      {
        id: 'total',
        name: 'Total Savings',
        color: 'var(--color-primary)',
        points: monthly.map((m) => m.totalSavingsPct),
        unit: 'percent',
      },
      {
        id: 'liquid',
        name: 'Liquid Retained',
        color: '#0d9488',
        points: monthly.map((m) => m.liquidSavingsPct),
        unit: 'percent',
      },
      {
        id: 'investment',
        name: 'Investments',
        color: '#9333ea',
        points: monthly.map((m) => m.investmentPct),
        unit: 'percent',
      },
    ];

    const latestTotal = monthly[monthly.length - 1]?.totalSavingsPct ?? 0;
    const latestLiquid = monthly[monthly.length - 1]?.liquidSavingsPct ?? 0;
    const latestInvest = monthly[monthly.length - 1]?.investmentPct ?? 0;

    return {
      points,
      labels,
      multiSeries,
      asPercent: true,
      footer: `Latest month: Total ${latestTotal.toFixed(1)}% · Liquid ${latestLiquid.toFixed(1)}% · Invest ${latestInvest.toFixed(1)}%`,
    };
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
    return buildClosingSeries(transactions, activeKey, masked, recipeConfig.openingBalance, recipeConfig.investments.reduce((s, r) => s + r.amount, 0));
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
        <FocusTrap active={show}>
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
                className="inline-flex min-h-11 min-w-11 h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-strong text-text-secondary shadow-warm-sm transition-colors duration-200 active:scale-95"
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
                  multiSeries={series.multiSeries}
                  footer={series.footer}
                  asPercent={series.asPercent}
                  masked={masked}
                />
              )}
            </div>
          </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>,
    document.body
  );
}
