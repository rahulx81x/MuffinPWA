import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  EyeOff,
  PieChart as PieChartIcon,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ShieldCheck,
  Percent,
  Sparkles,
} from 'lucide-react';
import { useMask, MASKED_VALUE } from '../../hooks/useMask';
import { useTheme } from '../../hooks/useTheme';
import { useRecipeConfig } from '../../hooks/useRecipeConfig';
import {
  buildMonthlyKPIs,
  buildInvestmentBreakup,
  buildFinancialMetrics,
  currentMonthKey,
  monthKey,
  monthLabel,
} from '../../domain/metrics';
import type { MonthlyKPI, Transaction } from '../../domain/types';
import { springSoft } from '../../lib/motion';

interface SuperDashboardProps {
  transactions: Transaction[];
  onClose: () => void;
}

type GlobalScope = 'all' | 'year' | 'month';
type TimeRange = '3M' | '6M' | '1Y' | 'ALL';

function pct(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return (part / whole) * 100;
}

export function SuperDashboard({ transactions, onClose }: SuperDashboardProps) {
  const { masked, toggleMask, formatCurrency } = useMask();
  const { theme } = useTheme();
  const { config: recipeConfig } = useRecipeConfig();

  const thisMonth = currentMonthKey();
  const currentYear = String(new Date().getFullYear());

  // Global Scope Filters
  const [scope, setScope] = useState<GlobalScope>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');

  // Discover available months and years
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      const k = monthKey(t.date);
      if (k) set.add(k);
    }
    set.add(thisMonth);
    return Array.from(set).sort().reverse();
  }, [transactions, thisMonth]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      const y = t.date ? t.date.slice(0, 4) : '';
      if (/^\d{4}$/.test(y)) set.add(y);
    }
    set.add(currentYear);
    return Array.from(set).sort().reverse();
  }, [transactions, currentYear]);

  const [selectedMonth, setSelectedMonth] = useState<string>(thisMonth);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);

  // Compute monthly KPIs
  const allMonthlyKPIs = useMemo(
    () => buildMonthlyKPIs(transactions, recipeConfig.openingBalance),
    [transactions, recipeConfig.openingBalance]
  );

  // Filter transactions based on current scope for category & distribution charts
  const scopedTransactions = useMemo(() => {
    if (scope === 'month') {
      return transactions.filter((t) => monthKey(t.date) === selectedMonth);
    }
    if (scope === 'year') {
      return transactions.filter((t) => (t.date ? t.date.slice(0, 4) === selectedYear : false));
    }
    return transactions;
  }, [transactions, scope, selectedMonth, selectedYear]);

  // Financial Metrics
  const metrics = useMemo(() => {
    return buildFinancialMetrics(
      transactions,
      {
        openingBalance: recipeConfig.openingBalance,
        investments: recipeConfig.investments,
      },
      scope === 'month' ? selectedMonth : undefined
    );
  }, [transactions, recipeConfig, scope, selectedMonth]);

  // Time-slice monthly KPIs according to selected TimeRange for trend charts
  const trendMonthlyKPIs = useMemo(() => {
    const total = allMonthlyKPIs.length;
    let count = total;
    if (timeRange === '3M') count = 3;
    if (timeRange === '6M') count = 6;
    if (timeRange === '1Y') count = 12;

    const start = Math.max(0, total - count);
    return allMonthlyKPIs.slice(start);
  }, [allMonthlyKPIs, timeRange]);

  // Multi-series visibility state
  const [visibleSeries, setVisibleSeries] = useState({
    income: true,
    spends: true,
    investment: true,
    liquid: false,
  });

  // Selected points for interactive exploration
  const [activeTrendIdx, setActiveTrendIdx] = useState<number>(
    trendMonthlyKPIs.length > 0 ? trendMonthlyKPIs.length - 1 : 0
  );
  const [activeBarIdx, setActiveBarIdx] = useState<number>(
    trendMonthlyKPIs.length > 0 ? trendMonthlyKPIs.length - 1 : 0
  );
  const [activeSavingsIdx, setActiveSavingsIdx] = useState<number>(
    trendMonthlyKPIs.length > 0 ? trendMonthlyKPIs.length - 1 : 0
  );
  const [activeNetWorthIdx, setActiveNetWorthIdx] = useState<number>(
    trendMonthlyKPIs.length > 0 ? trendMonthlyKPIs.length - 1 : 0
  );

  // Category Expense breakdown
  const categoryExpenses = useMemo(() => {
    const counts: Record<string, { total: number; count: number }> = {};
    let totalExpense = 0;

    for (const tx of scopedTransactions) {
      if (tx.type !== 'expense') continue;
      const cat = (tx.category || 'Uncategorized').trim();
      if (!counts[cat]) counts[cat] = { total: 0, count: 0 };
      counts[cat].total += tx.amount;
      counts[cat].count += 1;
      totalExpense += tx.amount;
    }

    const entries = Object.entries(counts)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        share: pct(data.total, totalExpense),
      }))
      .sort((a, b) => b.total - a.total);

    return { entries, totalExpense };
  }, [scopedTransactions]);

  // Income Breakdown
  const categoryIncome = useMemo(() => {
    const counts: Record<string, { total: number; count: number }> = {};
    let totalIncome = 0;

    for (const tx of scopedTransactions) {
      if (tx.type !== 'income') continue;
      const cat = (tx.category || 'General Income').trim();
      if (!counts[cat]) counts[cat] = { total: 0, count: 0 };
      counts[cat].total += tx.amount;
      counts[cat].count += 1;
      totalIncome += tx.amount;
    }

    const entries = Object.entries(counts)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        share: pct(data.total, totalIncome),
      }))
      .sort((a, b) => b.total - a.total);

    return { entries, totalIncome };
  }, [scopedTransactions]);

  // Investment Allocation Breakdown
  const investmentBreakup = useMemo(() => {
    const breakup = buildInvestmentBreakup(scopedTransactions, recipeConfig.investments);
    const total = Object.values(breakup).reduce((s, v) => s + v, 0);
    const entries = Object.entries(breakup)
      .filter(([, amt]) => amt > 0)
      .map(([name, total]) => ({
        name,
        total,
        share: pct(total, total),
      }))
      .sort((a, b) => b.total - a.total);

    return { breakup, entries, total };
  }, [scopedTransactions, recipeConfig.investments]);

  // Active Donut selections
  const [selectedExpenseCat, setSelectedExpenseCat] = useState<number>(0);
  const [selectedIncomeCat, setSelectedIncomeCat] = useState<number>(0);
  const [selectedInvestCat, setSelectedInvestCat] = useState<number>(0);

  const chartColors = theme.chartColors;

  const scopeLabel = useMemo(() => {
    if (scope === 'month') return monthLabel(selectedMonth);
    if (scope === 'year') return `Year ${selectedYear}`;
    return 'All Time Tracked';
  }, [scope, selectedMonth, selectedYear]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={springSoft}
      className="fixed inset-0 z-50 overflow-y-auto bg-canvas text-text selection:bg-primary/20 pb-20"
    >
      {/* Background Decorative Auras */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="gemini-aura-glow absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-20 blur-3xl" />
        <div className="gemini-aura-glow absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full opacity-15 blur-3xl" />
        <div className="gemini-aura-glow absolute bottom-10 left-1/4 h-80 w-80 rounded-full opacity-15 blur-3xl" />
      </div>

      {/* Sticky Header Bar */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-canvas/85 backdrop-blur-xl transition-theme">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Back Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 rounded-full border border-border/80 bg-white dark:bg-surface px-3.5 py-1.5 text-xs font-bold text-text transition-all duration-200 hover:border-primary/50 active:scale-95 shadow-warm-xs"
              aria-label="Exit Super Dashboard"
            >
              <ArrowLeft className="h-4 w-4 text-primary" strokeWidth={2.4} />
              <span>Back</span>
            </button>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="gemini-aura-ring inline-block h-2 w-2 rounded-full" />
                <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-text">
                  Super Dashboard
                </h1>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                  Visualizer
                </span>
              </div>
              <p className="text-[11px] text-text-muted hidden sm:block">
                Deep interactive financial trends, cashflows, and asset distributions
              </p>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMask}
              className="flex items-center gap-1.5 rounded-full border border-border/80 bg-white dark:bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-primary/40 hover:text-text active:scale-95 shadow-warm-xs"
              title={masked ? 'Reveal values' : 'Mask values'}
              aria-label={masked ? 'Reveal values' : 'Mask values'}
            >
              {masked ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">Masked</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-text-muted" />
                  <span className="hidden sm:inline">Visible</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="border-t border-border/40 bg-surface-strong/50 px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2.5">
            {/* Scope Switcher (All / Year / Month) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Scope:
              </span>
              <div className="flex items-center gap-1 rounded-full border border-border/80 bg-surface/90 p-1 shadow-warm-xs">
                {(
                  [
                    { id: 'all', label: 'All Time' },
                    { id: 'year', label: 'Year' },
                    { id: 'month', label: 'Month' },
                  ] as const
                ).map((s) => {
                  const active = scope === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setScope(s.id)}
                      className={`relative rounded-full px-3 py-1 text-xs font-bold transition-colors duration-200 outline-none active:scale-95 ${
                        active
                          ? 'text-primary-foreground'
                          : 'text-text-muted hover:text-text'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="superDashboardScopePill"
                          className="absolute inset-0 rounded-full bg-primary shadow-warm-xs"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Scope Pickers */}
              {scope === 'year' && availableYears.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    aria-label="Select year"
                    className="h-8 rounded-full border border-border/80 bg-surface/90 pl-3 pr-7 text-xs font-semibold text-text shadow-warm-xs cursor-pointer appearance-none"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                </div>
              )}

              {scope === 'month' && availableMonths.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    aria-label="Select month"
                    className="h-8 rounded-full border border-border/80 bg-surface/90 pl-3 pr-7 text-xs font-semibold text-text shadow-warm-xs cursor-pointer appearance-none"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {monthLabel(m)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                </div>
              )}
            </div>

            {/* Timeframe Chips for Trends */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Trend Range:
              </span>
              <div className="flex items-center gap-1 rounded-full border border-border/80 bg-surface/90 p-1 shadow-warm-xs">
                {(['3M', '6M', '1Y', 'ALL'] as const).map((r) => {
                  const active = timeRange === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTimeRange(r)}
                      className={`relative rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors duration-200 outline-none active:scale-95 ${
                        active
                          ? 'text-primary-foreground'
                          : 'text-text-muted hover:text-text'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="superDashboardTrendRangePill"
                          className="absolute inset-0 rounded-full bg-primary shadow-warm-xs"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6">
        {/* SECTION 1: MULTI-SERIES MONTHLY CASHFLOW TRAJECTORY */}
        <div className="cozy-card p-4 sm:p-5 shadow-warm">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="font-display text-base font-bold text-text">
                  Cashflow Dynamics & Trajectory
                </h2>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Monthly trend of Credits, Debits, Investments, and Liquid additions ({trendMonthlyKPIs.length} months)
              </p>
            </div>

            {/* Series Toggles */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Lines:
              </span>
              <button
                type="button"
                onClick={() => setVisibleSeries((s) => ({ ...s, income: !s.income }))}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                  visibleSeries.income
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-border/60 text-text-muted opacity-60'
                }`}
              >
                ● Credits
              </button>
              <button
                type="button"
                onClick={() => setVisibleSeries((s) => ({ ...s, spends: !s.spends }))}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                  visibleSeries.spends
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
                    : 'border-border/60 text-text-muted opacity-60'
                }`}
              >
                ● Debits
              </button>
              <button
                type="button"
                onClick={() => setVisibleSeries((s) => ({ ...s, investment: !s.investment }))}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                  visibleSeries.investment
                    ? 'border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-400 font-bold'
                    : 'border-border/60 text-text-muted opacity-60'
                }`}
              >
                ● Investment
              </button>
              <button
                type="button"
                onClick={() => setVisibleSeries((s) => ({ ...s, liquid: !s.liquid }))}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                  visibleSeries.liquid
                    ? 'border-teal-500/40 bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold'
                    : 'border-border/60 text-text-muted opacity-60'
                }`}
              >
                ● Liquid
              </button>
            </div>
          </div>

          {/* Interactive Multi-Line SVG Chart */}
          <MultiLineTrendChart
            data={trendMonthlyKPIs}
            visibleSeries={visibleSeries}
            activeIdx={activeTrendIdx}
            onSelectIdx={setActiveTrendIdx}
            masked={masked}
            formatCurrency={formatCurrency}
          />
        </div>

        {/* SECTION 3 & 4: MONTHLY INFLOW/OUTFLOW COMPARISON & SAVINGS RATE */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Monthly Comparison Bar Chart */}
          <div className="cozy-card p-4 sm:p-5 shadow-warm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-text flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Monthly Inflow vs Outflow
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Credits compared directly with Outflow (Debits + Investment)
                </p>
              </div>
            </div>

            <MonthlyBarComparisonChart
              data={trendMonthlyKPIs}
              activeIdx={activeBarIdx}
              onSelectIdx={setActiveBarIdx}
              masked={masked}
              formatCurrency={formatCurrency}
            />
          </div>

          {/* Savings Rate Trajectory */}
          <div className="cozy-card p-4 sm:p-5 shadow-warm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-text flex items-center gap-2">
                  <Percent className="h-4 w-4 text-emerald-500" />
                  Savings Rate (%) Trajectory
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Monthly percentage saved and invested with 30% baseline indicator
                </p>
              </div>
            </div>

            <SavingsRateLineChart
              data={trendMonthlyKPIs}
              activeIdx={activeSavingsIdx}
              onSelectIdx={setActiveSavingsIdx}
            />
          </div>
        </div>

        {/* SECTION 5: CUMULATIVE WEALTH ACCUMULATION */}
        <div className="cozy-card p-4 sm:p-5 shadow-warm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-text flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Cumulative Wealth Accumulation
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Progressive closing net balance and closing liquid reserve month-over-month
              </p>
            </div>
          </div>

          <CumulativeWealthChart
            data={trendMonthlyKPIs}
            activeIdx={activeNetWorthIdx}
            onSelectIdx={setActiveNetWorthIdx}
            masked={masked}
            formatCurrency={formatCurrency}
            initialInvestments={recipeConfig.investments}
            openingBalance={recipeConfig.openingBalance}
          />
        </div>

        {/* SECTION 6 & 7: CATEGORY EXPENSE & INCOME DISTRIBUTIONS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Category Expense Breakdown */}
          <div className="cozy-card p-4 sm:p-5 shadow-warm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-text flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-rose-500" />
                  Debit Category Distribution
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {scopeLabel} · Total: {masked ? MASKED_VALUE : formatCurrency(categoryExpenses.totalExpense)}
                </p>
              </div>
            </div>

            {categoryExpenses.entries.length === 0 ? (
              <p className="py-12 text-center text-xs text-text-muted">
                No debit entries found for {scopeLabel}.
              </p>
            ) : (
              <InteractiveDonutAndList
                title="Debits"
                entries={categoryExpenses.entries}
                total={categoryExpenses.totalExpense}
                colors={chartColors}
                selectedIndex={selectedExpenseCat}
                onSelectIndex={setSelectedExpenseCat}
                masked={masked}
                formatCurrency={formatCurrency}
              />
            )}
          </div>

          {/* Income Source Breakdown */}
          <div className="cozy-card p-4 sm:p-5 shadow-warm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-text flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  Credit Stream Distribution
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {scopeLabel} · Total: {masked ? MASKED_VALUE : formatCurrency(categoryIncome.totalIncome)}
                </p>
              </div>
            </div>

            {categoryIncome.entries.length === 0 ? (
              <p className="py-12 text-center text-xs text-text-muted">
                No credit entries found for {scopeLabel}.
              </p>
            ) : (
              <InteractiveDonutAndList
                title="Credits"
                entries={categoryIncome.entries}
                total={categoryIncome.totalIncome}
                colors={['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']}
                selectedIndex={selectedIncomeCat}
                onSelectIndex={setSelectedIncomeCat}
                masked={masked}
                formatCurrency={formatCurrency}
              />
            )}
          </div>
        </div>

        {/* SECTION 8 & 9: INVESTMENT ALLOCATION & MONTHLY VOLUME */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Investment Portfolio Allocation */}
          <div className="cozy-card p-4 sm:p-5 shadow-warm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-text flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-violet-500" />
                  Investment Asset Allocation
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Breakdown by investment vehicle / asset class ({scopeLabel})
                </p>
              </div>
            </div>

            {investmentBreakup.entries.length === 0 ? (
              <p className="py-12 text-center text-xs text-text-muted">
                No investment assets recorded yet.
              </p>
            ) : (
              <InteractiveDonutAndList
                title="Portfolio"
                entries={investmentBreakup.entries}
                total={investmentBreakup.total}
                colors={['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6', '#f43f5e']}
                selectedIndex={selectedInvestCat}
                onSelectIndex={setSelectedInvestCat}
                masked={masked}
                formatCurrency={formatCurrency}
              />
            )}
          </div>

          {/* Monthly Investment Volume */}
          <div className="cozy-card p-4 sm:p-5 shadow-warm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-text flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-violet-500" />
                  Monthly Investment Flow
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Capital committed to investments per month
                </p>
              </div>
            </div>

            <MonthlyInvestmentVolumeChart
              data={trendMonthlyKPIs}
              masked={masked}
              formatCurrency={formatCurrency}
            />
          </div>
        </div>

        {/* SECTION: FINANCIAL OVERVIEW KPIS (NON-CHART) */}
        <div>
          <div className="mb-2.5 px-1 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-text flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Key Financial Metrics & Overview
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {scopeLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
            <KpiMetricCard
              title="Net Balance"
              value={masked ? MASKED_VALUE : formatCurrency(metrics.netWorth)}
              subtitle="Liquid + Invested"
              tone="text-text font-bold"
            />
            <KpiMetricCard
              title="Total Credits"
              value={masked ? MASKED_VALUE : formatCurrency(metrics.totalIncome)}
              subtitle="Tracked inflow"
              tone="text-emerald-600 dark:text-emerald-400 font-bold"
            />
            <KpiMetricCard
              title="Total Debits"
              value={masked ? MASKED_VALUE : formatCurrency(metrics.totalSpends)}
              subtitle="Total outflow"
              tone="text-rose-600 dark:text-rose-400 font-bold"
            />
            <KpiMetricCard
              title="Investments"
              value={masked ? MASKED_VALUE : formatCurrency(metrics.investmentBalance)}
              subtitle="Counted assets"
              tone="text-violet-600 dark:text-violet-400 font-bold"
            />
            <KpiMetricCard
              title="Liquid Cash"
              value={masked ? MASKED_VALUE : formatCurrency(metrics.liquidBalance)}
              subtitle="In hand / bank"
              tone="text-teal-600 dark:text-teal-400 font-bold"
            />
            <KpiMetricCard
              title="Provident Fund"
              value={masked ? MASKED_VALUE : formatCurrency(metrics.providentFundBalance)}
              subtitle="EPF / PPF total"
              tone="text-indigo-600 dark:text-indigo-400 font-bold"
            />
            <KpiMetricCard
              title="Savings Rate"
              value={`${metrics.savingsRate.toFixed(1)}%`}
              subtitle="Overall avg"
              tone={metrics.savingsRate >= 30 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-primary font-bold'}
            />
            <KpiMetricCard
              title="Months"
              value={String(metrics.monthsTracked)}
              subtitle="History recorded"
              tone="text-text font-bold"
            />
          </div>
        </div>
      </main>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: KPI Card (Translucent Glassmorphic)
// ----------------------------------------------------------------------
function KpiMetricCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/40 dark:border-white/10 bg-white/45 dark:bg-surface/35 p-3 shadow-warm-xs backdrop-blur-md transition-all hover:border-primary/40 hover:bg-white/65 dark:hover:bg-surface/55 hover:shadow-warm-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted truncate">
        {title}
      </p>
      <p className={`mt-1 font-display text-sm sm:text-base tabular-nums truncate ${tone}`}>
        {value}
      </p>
      <p className="text-[10px] text-text-muted truncate mt-0.5">{subtitle}</p>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: Multi-Line Trend Chart
// ----------------------------------------------------------------------
function MultiLineTrendChart({
  data,
  visibleSeries,
  activeIdx,
  onSelectIdx,
  masked,
  formatCurrency,
}: {
  data: MonthlyKPI[];
  visibleSeries: { income: boolean; spends: boolean; investment: boolean; liquid: boolean };
  activeIdx: number;
  onSelectIdx: (idx: number) => void;
  masked: boolean;
  formatCurrency: (val: number) => string;
}) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-xs text-text-muted">No monthly data available.</p>;
  }

  const width = 560;
  const height = 240;
  const padX = 36;
  const padTop = 20;
  const padBottom = 36;

  const validIdx = Math.min(Math.max(0, activeIdx), data.length - 1);
  const activeMonth = data[validIdx];

  // Gather values for range
  const allValues: number[] = [];
  data.forEach((m) => {
    if (visibleSeries.income) allValues.push(m.income);
    if (visibleSeries.spends) allValues.push(m.spends);
    if (visibleSeries.investment) allValues.push(m.investment);
    if (visibleSeries.liquid) allValues.push(m.liquidSavings);
  });

  const min = allValues.length ? Math.min(0, ...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues, 1000) : 1000;
  const range = max - min || 1;

  const getCoords = (getter: (m: MonthlyKPI) => number) => {
    return data.map((m, idx) => {
      const val = getter(m);
      const x = padX + (idx / Math.max(1, data.length - 1)) * (width - padX * 2);
      const y = height - padBottom - ((val - min) / range) * (height - padTop - padBottom);
      return { x, y, val };
    });
  };

  const incomeCoords = getCoords((m) => m.income);
  const spendsCoords = getCoords((m) => m.spends);
  const investmentCoords = getCoords((m) => m.investment);
  const liquidCoords = getCoords((m) => m.liquidSavings);

  const makePath = (coords: { x: number; y: number }[]) => {
    return coords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  };

  const activeX = padX + (validIdx / Math.max(1, data.length - 1)) * (width - padX * 2);
  const stepWidth = width / Math.max(1, data.length);

  return (
    <div className="space-y-3">
      {/* Detail Callout Card for Active Month */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface-strong/80 p-3 shadow-warm-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Selected Point
          </span>
          <p className="font-display text-sm font-bold text-text">{activeMonth?.label}</p>
        </div>

        <div className="flex items-center gap-3 text-xs sm:gap-4 flex-wrap">
          {visibleSeries.income && (
            <div>
              <span className="text-[10px] font-semibold text-text-muted">Credits:</span>
              <p className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {masked ? MASKED_VALUE : formatCurrency(activeMonth?.income ?? 0)}
              </p>
            </div>
          )}
          {visibleSeries.spends && (
            <div>
              <span className="text-[10px] font-semibold text-text-muted">Debits:</span>
              <p className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {masked ? MASKED_VALUE : formatCurrency(activeMonth?.spends ?? 0)}
              </p>
            </div>
          )}
          {visibleSeries.investment && (
            <div>
              <span className="text-[10px] font-semibold text-text-muted">Investment:</span>
              <p className="font-bold tabular-nums text-violet-600 dark:text-violet-400">
                {masked ? MASKED_VALUE : formatCurrency(activeMonth?.investment ?? 0)}
              </p>
            </div>
          )}
          {visibleSeries.liquid && (
            <div>
              <span className="text-[10px] font-semibold text-text-muted">Liquid Savings:</span>
              <p className="font-bold tabular-nums text-teal-600 dark:text-teal-400">
                {masked ? MASKED_VALUE : formatCurrency(activeMonth?.liquidSavings ?? 0)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SVG Multi-Line Chart Canvas */}
      <div className="relative rounded-2xl border border-border/80 bg-surface/60 p-2 shadow-inner">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-64 w-full touch-none"
          role="img"
          aria-label="Monthly Cashflow Multi-Line Graph"
        >
          {/* Subtle grid lines */}
          <line
            x1={padX}
            y1={height - padBottom}
            x2={width - padX}
            y2={height - padBottom}
            stroke="currentColor"
            strokeWidth="1"
            className="text-border"
          />

          {/* Active Crosshair */}
          <line
            x1={activeX}
            y1={padTop}
            x2={activeX}
            y2={height - padBottom}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-primary/60"
          />

          {/* Series Lines */}
          {visibleSeries.income && (
            <path
              d={makePath(incomeCoords)}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {visibleSeries.spends && (
            <path
              d={makePath(spendsCoords)}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {visibleSeries.investment && (
            <path
              d={makePath(investmentCoords)}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {visibleSeries.liquid && (
            <path
              d={makePath(liquidCoords)}
              fill="none"
              stroke="#0d9488"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Active Circles on intersection points */}
          {visibleSeries.income && incomeCoords[validIdx] && (
            <circle
              cx={incomeCoords[validIdx].x}
              cy={incomeCoords[validIdx].y}
              r="4.5"
              fill="#10b981"
              stroke="white"
              strokeWidth="1.5"
            />
          )}
          {visibleSeries.spends && spendsCoords[validIdx] && (
            <circle
              cx={spendsCoords[validIdx].x}
              cy={spendsCoords[validIdx].y}
              r="4.5"
              fill="#f43f5e"
              stroke="white"
              strokeWidth="1.5"
            />
          )}
          {visibleSeries.investment && investmentCoords[validIdx] && (
            <circle
              cx={investmentCoords[validIdx].x}
              cy={investmentCoords[validIdx].y}
              r="4.5"
              fill="#8b5cf6"
              stroke="white"
              strokeWidth="1.5"
            />
          )}
          {visibleSeries.liquid && liquidCoords[validIdx] && (
            <circle
              cx={liquidCoords[validIdx].x}
              cy={liquidCoords[validIdx].y}
              r="4.5"
              fill="#0d9488"
              stroke="white"
              strokeWidth="1.5"
            />
          )}

          {/* Labels & Touch Catchers */}
          {data.map((m, idx) => {
            const x = padX + (idx / Math.max(1, data.length - 1)) * (width - padX * 2);
            const isSelected = idx === validIdx;
            const shortLabel = m.label.split(' ')[0];

            return (
              <g key={m.key}>
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  className={isSelected ? 'fill-primary font-bold' : 'fill-text-muted'}
                  style={{ fontSize: isSelected ? '11px' : '9.5px' }}
                >
                  {shortLabel}
                </text>

                {/* Wide touch catcher */}
                <rect
                  x={x - stepWidth / 2}
                  y={0}
                  width={stepWidth}
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onSelectIdx(idx)}
                  onTouchStart={() => onSelectIdx(idx)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: Monthly Inflow vs Outflow Bar Chart
// ----------------------------------------------------------------------
function MonthlyBarComparisonChart({
  data,
  activeIdx,
  onSelectIdx,
  masked,
  formatCurrency,
}: {
  data: MonthlyKPI[];
  activeIdx: number;
  onSelectIdx: (idx: number) => void;
  masked: boolean;
  formatCurrency: (val: number) => string;
}) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-xs text-text-muted">No comparison data.</p>;
  }

  const width = 360;
  const height = 190;
  const padX = 24;
  const padTop = 16;
  const padBottom = 30;

  const validIdx = Math.min(Math.max(0, activeIdx), data.length - 1);
  const activeMonth = data[validIdx];

  const maxVal = Math.max(
    ...data.map((m) => Math.max(m.income, m.spends + m.investment)),
    1000
  );

  const groupWidth = (width - padX * 2) / Math.max(1, data.length);
  const barWidth = Math.min(14, Math.max(6, groupWidth * 0.35));

  return (
    <div className="space-y-3">
      {/* Active Callout */}
      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface-strong/70 px-3 py-2 text-xs">
        <span className="font-bold text-text">{activeMonth?.label}</span>
        <div className="flex items-center gap-3">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
            In: {masked ? MASKED_VALUE : formatCurrency(activeMonth?.income ?? 0)}
          </span>
          <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
            Out: {masked ? MASKED_VALUE : formatCurrency((activeMonth?.spends ?? 0) + (activeMonth?.investment ?? 0))}
          </span>
        </div>
      </div>

      <div className="relative rounded-xl border border-border/80 bg-surface/60 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" role="img">
          <line
            x1={padX}
            y1={height - padBottom}
            x2={width - padX}
            y2={height - padBottom}
            stroke="currentColor"
            strokeWidth="1"
            className="text-border"
          />

          {data.map((m, idx) => {
            const centerX = padX + idx * groupWidth + groupWidth / 2;
            const outflow = m.spends + m.investment;

            const inHeight = (m.income / maxVal) * (height - padTop - padBottom);
            const inY = height - padBottom - inHeight;

            const outHeight = (outflow / maxVal) * (height - padTop - padBottom);
            const outY = height - padBottom - outHeight;

            const isSelected = idx === validIdx;

            return (
              <g key={m.key}>
                {/* Income Bar (Green) */}
                <rect
                  x={centerX - barWidth - 1}
                  y={inY}
                  width={barWidth}
                  height={inHeight}
                  rx="3"
                  fill="#10b981"
                  opacity={isSelected ? 1 : 0.75}
                  className="transition-all duration-200"
                />

                {/* Outflow Bar (Rose/Red) */}
                <rect
                  x={centerX + 1}
                  y={outY}
                  width={barWidth}
                  height={outHeight}
                  rx="3"
                  fill="#f43f5e"
                  opacity={isSelected ? 1 : 0.75}
                  className="transition-all duration-200"
                />

                {/* Month Label */}
                <text
                  x={centerX}
                  y={height - 10}
                  textAnchor="middle"
                  className={isSelected ? 'fill-primary font-bold' : 'fill-text-muted'}
                  style={{ fontSize: isSelected ? '10px' : '8.5px' }}
                >
                  {m.label.split(' ')[0]}
                </text>

                {/* Interactive Touch Target */}
                <rect
                  x={centerX - groupWidth / 2}
                  y={0}
                  width={groupWidth}
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onSelectIdx(idx)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: Savings Rate Line Chart
// ----------------------------------------------------------------------
function SavingsRateLineChart({
  data,
  activeIdx,
  onSelectIdx,
}: {
  data: MonthlyKPI[];
  activeIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-xs text-text-muted">No savings rate data.</p>;
  }

  const width = 360;
  const height = 190;
  const padX = 24;
  const padTop = 16;
  const padBottom = 30;

  const validIdx = Math.min(Math.max(0, activeIdx), data.length - 1);
  const activeMonth = data[validIdx];

  const min = Math.min(0, ...data.map((m) => m.totalSavingsPct));
  const max = Math.max(60, ...data.map((m) => m.totalSavingsPct));
  const range = max - min || 1;

  const coords = data.map((m, idx) => {
    const x = padX + (idx / Math.max(1, data.length - 1)) * (width - padX * 2);
    const y = height - padBottom - ((m.totalSavingsPct - min) / range) * (height - padTop - padBottom);
    return { x, y, val: m.totalSavingsPct };
  });

  const path = coords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const target30Y = height - padBottom - ((30 - min) / range) * (height - padTop - padBottom);
  const activeX = coords[validIdx]?.x ?? padX;

  return (
    <div className="space-y-3">
      {/* Active Callout */}
      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface-strong/70 px-3 py-2 text-xs">
        <span className="font-bold text-text">{activeMonth?.label}</span>
        <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          Saved: {activeMonth?.totalSavingsPct.toFixed(1)}% of Credits
        </span>
      </div>

      <div className="relative rounded-xl border border-border/80 bg-surface/60 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" role="img">
          {/* 30% Healthy Savings Target line */}
          <line
            x1={padX}
            y1={target30Y}
            x2={width - padX}
            y2={target30Y}
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.4"
          />
          <text x={width - padX} y={target30Y - 4} textAnchor="end" className="fill-emerald-600 text-[8px] font-bold">
            30% Target
          </text>

          {/* Active Vertical Crosshair */}
          <line
            x1={activeX}
            y1={padTop}
            x2={activeX}
            y2={height - padBottom}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            className="text-primary/50"
          />

          {/* Line Path */}
          <path
            d={path}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {coords.map((pt, idx) => {
            const isSelected = idx === validIdx;
            const m = data[idx];

            return (
              <g key={m.key}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 5.5 : 3.5}
                  fill={isSelected ? '#10b981' : '#10b981'}
                  stroke="white"
                  strokeWidth={isSelected ? 2 : 1}
                />
                <text
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  className={isSelected ? 'fill-primary font-bold' : 'fill-text-muted'}
                  style={{ fontSize: isSelected ? '10px' : '8.5px' }}
                >
                  {m.label.split(' ')[0]}
                </text>
                <rect
                  x={pt.x - 14}
                  y={0}
                  width="28"
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onSelectIdx(idx)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: Cumulative Wealth Chart
// ----------------------------------------------------------------------
function CumulativeWealthChart({
  data,
  activeIdx,
  onSelectIdx,
  masked,
  formatCurrency,
  initialInvestments,
  openingBalance,
}: {
  data: MonthlyKPI[];
  activeIdx: number;
  onSelectIdx: (idx: number) => void;
  masked: boolean;
  formatCurrency: (val: number) => string;
  initialInvestments: { amount: number }[];
  openingBalance: number;
}) {
  const initInv = initialInvestments.reduce((s, r) => s + r.amount, 0);

  // Compute cumulative values for each month
  const cumulativePoints = useMemo(() => {
    let runningLiquid = openingBalance;
    let runningInvest = initInv;

    return data.map((m) => {
      runningLiquid += m.liquidSavings;
      runningInvest += m.investment;
      const netWorth = runningLiquid + runningInvest;
      return {
        label: m.label,
        liquid: runningLiquid,
        investment: runningInvest,
        netWorth,
      };
    });
  }, [data, openingBalance, initInv]);

  if (cumulativePoints.length === 0) {
    return <p className="py-10 text-center text-xs text-text-muted">No cumulative data.</p>;
  }

  const width = 560;
  const height = 200;
  const padX = 36;
  const padTop = 20;
  const padBottom = 32;

  const validIdx = Math.min(Math.max(0, activeIdx), cumulativePoints.length - 1);
  const activePt = cumulativePoints[validIdx];

  const maxVal = Math.max(...cumulativePoints.map((p) => p.netWorth), 1000);
  const minVal = Math.min(0, ...cumulativePoints.map((p) => Math.min(p.liquid, p.netWorth)));
  const range = maxVal - minVal || 1;

  const nwCoords = cumulativePoints.map((p, idx) => {
    const x = padX + (idx / Math.max(1, cumulativePoints.length - 1)) * (width - padX * 2);
    const y = height - padBottom - ((p.netWorth - minVal) / range) * (height - padTop - padBottom);
    return { x, y, val: p.netWorth };
  });

  const liqCoords = cumulativePoints.map((p, idx) => {
    const x = padX + (idx / Math.max(1, cumulativePoints.length - 1)) * (width - padX * 2);
    const y = height - padBottom - ((p.liquid - minVal) / range) * (height - padTop - padBottom);
    return { x, y, val: p.liquid };
  });

  const nwPath = nwCoords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const liqPath = liqCoords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

  return (
    <div className="space-y-3">
      {/* Active Callout */}
      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface-strong/70 px-3.5 py-2 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Closing Position
          </span>
          <p className="font-display text-sm font-bold text-text">{activePt?.label}</p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] text-text-muted font-semibold">Net Balance:</span>
            <p className="font-bold tabular-nums text-primary">
              {masked ? MASKED_VALUE : formatCurrency(activePt?.netWorth ?? 0)}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted font-semibold">Liquid Cash:</span>
            <p className="font-bold tabular-nums text-teal-600 dark:text-teal-400">
              {masked ? MASKED_VALUE : formatCurrency(activePt?.liquid ?? 0)}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted font-semibold">Invested:</span>
            <p className="font-bold tabular-nums text-violet-600 dark:text-violet-400">
              {masked ? MASKED_VALUE : formatCurrency(activePt?.investment ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="relative rounded-xl border border-border/80 bg-surface/60 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img">
          {/* Net Worth Path (Primary) */}
          <path
            d={nwPath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Liquid Path (Teal) */}
          <path
            d={liqPath}
            fill="none"
            stroke="#0d9488"
            strokeWidth="2"
            strokeDasharray="4 2"
            strokeLinecap="round"
          />

          {/* Month labels and circles */}
          {cumulativePoints.map((p, idx) => {
            const isSelected = idx === validIdx;
            const pt = nwCoords[idx];

            return (
              <g key={p.label}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 5.5 : 3}
                  fill="var(--color-primary)"
                  stroke="white"
                  strokeWidth="1.5"
                />
                <text
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  className={isSelected ? 'fill-primary font-bold' : 'fill-text-muted'}
                  style={{ fontSize: isSelected ? '10px' : '9px' }}
                >
                  {p.label.split(' ')[0]}
                </text>
                <rect
                  x={pt.x - 16}
                  y={0}
                  width="32"
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onSelectIdx(idx)}
                />
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="mt-1 flex items-center justify-center gap-4 text-[11px] font-semibold text-text-muted border-t border-border/40 pt-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>Net Balance (Cumulative)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-600" />
            <span>Liquid Cash (Closing)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: Interactive Donut and Breakdown List
// ----------------------------------------------------------------------
function InteractiveDonutAndList({
  title,
  entries,
  total,
  colors,
  selectedIndex,
  onSelectIndex,
  masked,
  formatCurrency,
}: {
  title: string;
  entries: { name: string; total: number; share: number; count?: number }[];
  total: number;
  colors: string[];
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  masked: boolean;
  formatCurrency: (val: number) => string;
}) {
  const activeIdx = Math.min(Math.max(0, selectedIndex), entries.length - 1);
  const active = entries[activeIdx] ?? entries[0];
  const activeColor = colors[activeIdx % colors.length];

  const maxTotal = useMemo(() => {
    if (!entries.length) return 1;
    return Math.max(...entries.map((e) => e.total), 1);
  }, [entries]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="space-y-4">
      {/* Selected Item Callout */}
      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface-strong/70 p-3 shadow-warm-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: activeColor }} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-text">{active?.name}</p>
            <p className="text-[11px] font-medium text-text-muted">
              {active?.share.toFixed(1)}% of total {title.toLowerCase()}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-sm font-bold tabular-nums text-text">
            {masked ? MASKED_VALUE : formatCurrency(active?.total ?? 0)}
          </p>
        </div>
      </div>

      {/* Donut and Horizontal Bars Grid */}
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-5">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center sm:col-span-2">
          <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
            {entries.slice(0, 10).map((entry, index) => {
              const fraction = total > 0 ? entry.total / total : 0;
              const dash = fraction * circumference;
              const color = colors[index % colors.length];
              const isSelected = index === activeIdx;

              const seg = (
                <circle
                  key={entry.name}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? 24 : 18}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  className="cursor-pointer transition-all duration-300"
                  style={{
                    opacity: isSelected ? 1 : 0.75,
                  }}
                  onClick={() => onSelectIndex(index)}
                />
              );
              offset += dash;
              return seg;
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
              Total
            </span>
            <span className="font-display text-xs font-bold text-text tabular-nums">
              {masked ? MASKED_VALUE : formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Ranked Horizontal Bar List */}
        <div className="max-h-56 overflow-y-auto space-y-2 pr-1 sm:col-span-3">
          {entries.map((entry, index) => {
            const isSelected = index === activeIdx;
            const color = colors[index % colors.length];
            const relativeShare = maxTotal > 0 ? (entry.total / maxTotal) * 100 : 0;

            return (
              <button
                key={entry.name}
                type="button"
                onClick={() => onSelectIndex(index)}
                className={`w-full rounded-xl p-2 text-left transition-all ${
                  isSelected
                    ? 'border border-primary/40 bg-surface-strong shadow-warm-xs'
                    : 'hover:bg-surface-muted/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="truncate font-semibold text-text max-w-[130px]">
                    {entry.name}
                  </span>
                  <span className="font-bold tabular-nums text-text">
                    {masked ? `${entry.share.toFixed(0)}%` : formatCurrency(entry.total)}
                  </span>
                </div>
                {/* Horizontal progress bar */}
                <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${relativeShare}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: Monthly Investment Volume Bar Chart
// ----------------------------------------------------------------------
function MonthlyInvestmentVolumeChart({
  data,
  masked,
  formatCurrency,
}: {
  data: MonthlyKPI[];
  masked: boolean;
  formatCurrency: (val: number) => string;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number>(data.length > 0 ? data.length - 1 : 0);

  if (data.length === 0) {
    return <p className="py-10 text-center text-xs text-text-muted">No investment flow.</p>;
  }

  const width = 360;
  const height = 180;
  const padX = 24;
  const padTop = 16;
  const padBottom = 28;

  const validIdx = Math.min(Math.max(0, selectedIdx), data.length - 1);
  const activeMonth = data[validIdx];

  const maxVal = Math.max(...data.map((m) => m.investment), 1000);
  const groupWidth = (width - padX * 2) / Math.max(1, data.length);
  const barWidth = Math.min(18, Math.max(8, groupWidth * 0.5));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface-strong/70 px-3 py-2 text-xs">
        <span className="font-bold text-text">{activeMonth?.label}</span>
        <span className="font-bold tabular-nums text-violet-600 dark:text-violet-400">
          Invested: {masked ? MASKED_VALUE : formatCurrency(activeMonth?.investment ?? 0)}
        </span>
      </div>

      <div className="relative rounded-xl border border-border/80 bg-surface/60 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img">
          <line
            x1={padX}
            y1={height - padBottom}
            x2={width - padX}
            y2={height - padBottom}
            stroke="currentColor"
            strokeWidth="1"
            className="text-border"
          />

          {data.map((m, idx) => {
            const centerX = padX + idx * groupWidth + groupWidth / 2;
            const barHeight = (m.investment / maxVal) * (height - padTop - padBottom);
            const y = height - padBottom - barHeight;
            const isSelected = idx === validIdx;

            return (
              <g key={m.key}>
                <rect
                  x={centerX - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  fill="#8b5cf6"
                  opacity={isSelected ? 1 : 0.7}
                  className="transition-all duration-200"
                />
                <text
                  x={centerX}
                  y={height - 8}
                  textAnchor="middle"
                  className={isSelected ? 'fill-primary font-bold' : 'fill-text-muted'}
                  style={{ fontSize: isSelected ? '10px' : '8.5px' }}
                >
                  {m.label.split(' ')[0]}
                </text>
                <rect
                  x={centerX - groupWidth / 2}
                  y={0}
                  width={groupWidth}
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => setSelectedIdx(idx)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
