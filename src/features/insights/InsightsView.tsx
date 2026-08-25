import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Layers,
  PieChart as PieChartIcon,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useRecipeConfig } from '../../hooks/useRecipeConfig';
import { useMask } from '../../hooks/useMask';
import { useTheme } from '../../hooks/useTheme';
import {
  buildMonthlyKPIs,
  currentMonthKey,
  monthKey,
  monthLabel,
} from '../../domain/metrics';
import { isCountedInvestment } from '../../domain/providentFund';
import type { NewTransactionInput, Transaction } from '../../domain/types';
import {
  TransactionForm,
  type TransactionFormData,
} from '../../components/molecules/TransactionForm';
import { EmptyState } from '../../components/molecules/EmptyState';
import { springSoft } from '../../lib/motion';

type InsightsSubTab = 'trends' | 'categories' | 'planner';

interface InsightsViewProps {
  transactions: Transaction[];
  plannerTransactions: Transaction[];
  onSelectMonth?: (monthKey: string) => void;
  onAddPlanner: (input: NewTransactionInput) => void;
  onRemovePlanner: (id: string) => void;
  onClearPlanner: () => void;
  onAddTransaction?: () => void;
}

function pct(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return (part / whole) * 100;
}

export function InsightsView({
  transactions,
  plannerTransactions,
  onSelectMonth,
  onAddPlanner,
  onRemovePlanner,
  onClearPlanner,
  onAddTransaction,
}: InsightsViewProps) {
  const [subTab, setSubTab] = useState<InsightsSubTab>('trends');
  const [categoryScope, setCategoryScope] = useState<'month' | 'year' | 'all'>('month');
  const { formatCurrency } = useMask();
  const { theme } = useTheme();
  const { config: recipeConfig } = useRecipeConfig();

  const thisMonth = currentMonthKey();
  const currentYear = String(new Date().getFullYear());

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.type === 'expense') {
        const k = monthKey(t.date);
        if (k) set.add(k);
      }
    }
    set.add(thisMonth);
    return Array.from(set).sort().reverse();
  }, [transactions, thisMonth]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.type === 'expense') {
        const y = t.date ? t.date.slice(0, 4) : '';
        if (/^\d{4}$/.test(y)) set.add(y);
      }
    }
    set.add(currentYear);
    return Array.from(set).sort().reverse();
  }, [transactions, currentYear]);

  const [selectedMonth, setSelectedMonth] = useState<string>(thisMonth);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);

  // Monthly KPIs for Trends
  const monthlyList = useMemo(
    () => buildMonthlyKPIs(transactions, recipeConfig.openingBalance).slice().reverse(),
    [transactions, recipeConfig.openingBalance]
  );

  // Category Breakdown calculations
  const categoryData = useMemo(() => {
    let targetTxs: Transaction[] = [];

    if (categoryScope === 'month') {
      targetTxs = transactions.filter(
        (t) => t.type === 'expense' && monthKey(t.date) === selectedMonth
      );
    } else if (categoryScope === 'year') {
      targetTxs = transactions.filter(
        (t) => t.type === 'expense' && (t.date ? t.date.slice(0, 4) === selectedYear : false)
      );
    } else {
      targetTxs = transactions.filter((t) => t.type === 'expense');
    }

    const counts: Record<string, { total: number; count: number }> = {};
    let totalExpense = 0;

    for (const tx of targetTxs) {
      const cat = (tx.category || 'Uncategorized').trim();
      if (!counts[cat]) counts[cat] = { total: 0, count: 0 };
      counts[cat].total += tx.amount;
      counts[cat].count += 1;
      totalExpense += tx.amount;
    }

    const sorted = Object.entries(counts)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        share: pct(data.total, totalExpense),
      }))
      .sort((a, b) => b.total - a.total);

    return { entries: sorted, totalExpense };
  }, [transactions, categoryScope, selectedMonth, selectedYear]);

  const scopeLabel = useMemo(() => {
    if (categoryScope === 'month') return monthLabel(selectedMonth);
    if (categoryScope === 'year') return `Year ${selectedYear}`;
    return 'All Time';
  }, [categoryScope, selectedMonth, selectedYear]);

  // Planner calculations
  const plannerMonthTx = useMemo(() => {
    const combined = [...transactions, ...plannerTransactions];
    return combined.filter((t) => monthKey(t.date) === thisMonth);
  }, [transactions, plannerTransactions, thisMonth]);

  const plannerIncome = plannerMonthTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const plannerExpenses = plannerMonthTx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const plannerInvestment = plannerMonthTx
    .filter(isCountedInvestment)
    .reduce((s, t) => s + t.amount, 0);
  const plannerLiquid = plannerIncome - plannerExpenses - plannerInvestment;
  const plannerSavingsPct = pct(plannerInvestment + plannerLiquid, plannerIncome);

  const previousClose = useMemo(() => {
    const monthly = buildMonthlyKPIs(transactions, recipeConfig.openingBalance);
    const prior = monthly.filter((m) => m.key < thisMonth);
    return prior.length > 0
      ? prior[prior.length - 1].closingLiquid
      : recipeConfig.openingBalance;
  }, [transactions, thisMonth, recipeConfig]);
  const plannerClosingBalance = previousClose + plannerLiquid;

  const plannerThisMonth = plannerTransactions.filter(
    (t) => monthKey(t.date) === thisMonth
  );

  function handlePlannerFormSubmit(data: TransactionFormData) {
    onAddPlanner({
      date: data.date,
      type: data.type,
      category: data.category,
      amount: data.amount,
      comment: data.comment,
      investmentType: data.investmentType,
    });
  }

  const chartColors = theme.chartColors;

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Sub-tab Pill Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
            Financial Insights
          </h2>
          <p className="text-xs text-text-muted">
            Trends, category breakdown, and scenario planner
          </p>
        </div>

        {/* Sub-tab Pills (Full width on mobile, inline on desktop) */}
        <div className="grid grid-cols-3 w-full sm:w-auto items-center gap-1 rounded-2xl border border-border/80 bg-surface/80 p-1 backdrop-blur-md shadow-warm-sm">
          <button
            type="button"
            onClick={() => setSubTab('trends')}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 py-2 sm:px-3 sm:py-1.5 text-xs font-bold transition-all outline-none active:scale-95 ${
              subTab === 'trends'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Trends</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('categories')}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 py-2 sm:px-3 sm:py-1.5 text-xs font-bold transition-all outline-none active:scale-95 ${
              subTab === 'categories'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <PieChartIcon className="h-3.5 w-3.5" />
            <span>Categories</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('planner')}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 py-2 sm:px-3 sm:py-1.5 text-xs font-bold transition-all outline-none active:scale-95 ${
              subTab === 'planner'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Planner</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: TRENDS */}
      {subTab === 'trends' && (
        <motion.div
          key="trends-tab"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSoft}
          className="space-y-4"
        >
          {monthlyList.length === 0 ? (
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
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  {monthlyList.length} Months Tracked
                </span>
                <span className="text-[11px] text-text-muted">
                  Tap any month to view Ledger entries
                </span>
              </div>

              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {monthlyList.map((m) => {
                  const isClickable = Boolean(onSelectMonth);

                  return (
                    <motion.li
                      key={m.key}
                      whileHover={isClickable ? { y: -2 } : undefined}
                      whileTap={isClickable ? { scale: 0.985 } : undefined}
                      transition={springSoft}
                      onClick={isClickable ? () => onSelectMonth?.(m.key) : undefined}
                      className={`cozy-card p-4 transition-all duration-200 ${
                        isClickable
                          ? 'cursor-pointer hover:border-primary/40 hover:shadow-warm'
                          : ''
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
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
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            m.totalSavingsPct >= 30
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : m.totalSavingsPct > 0
                              ? 'bg-primary/10 text-primary'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          Save {m.totalSavingsPct.toFixed(1)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 pt-1">
                        <div className="rounded-xl bg-surface/60 p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                            Income
                          </p>
                          <p className="mt-0.5 text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(m.income)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-surface/60 p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                            Spends
                          </p>
                          <p className="mt-0.5 text-xs font-bold tabular-nums text-rose-600 dark:text-rose-400">
                            {formatCurrency(m.spends)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-surface/60 p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                            Invest
                          </p>
                          <p className="mt-0.5 text-xs font-bold tabular-nums text-violet-600 dark:text-violet-400">
                            {formatCurrency(m.investment)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-surface/60 p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                            Closing
                          </p>
                          <p className="mt-0.5 text-xs font-bold tabular-nums text-teal-600 dark:text-teal-400">
                            {formatCurrency(m.closingLiquid)}
                          </p>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* SUB-TAB 2: CATEGORIES */}
      {subTab === 'categories' && (
        <motion.div
          key="categories-tab"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSoft}
          className="space-y-4"
        >
          {/* Time Range Filter Header */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between px-1">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Expense Distribution
              </span>
              <p className="text-xs font-bold text-text">
                {scopeLabel}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Segmented Scope Switcher */}
              <div className="flex items-center rounded-xl border border-border/80 bg-surface/90 p-1 shadow-warm-xs">
                <button
                  type="button"
                  onClick={() => setCategoryScope('month')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    categoryScope === 'month'
                      ? 'bg-primary text-primary-foreground shadow-warm-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryScope('year')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    categoryScope === 'year'
                      ? 'bg-primary text-primary-foreground shadow-warm-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Year
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryScope('all')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    categoryScope === 'all'
                      ? 'bg-primary text-primary-foreground shadow-warm-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  All Time
                </button>
              </div>

              {/* Month Picker */}
              {categoryScope === 'month' && availableMonths.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    aria-label="Select month"
                    className="h-8 rounded-xl border border-border/80 bg-surface/90 pl-2.5 pr-7 text-xs font-semibold text-text shadow-warm-xs transition hover:border-primary/40 focus:border-primary focus:outline-none cursor-pointer appearance-none"
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

              {/* Year Picker */}
              {categoryScope === 'year' && availableYears.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    aria-label="Select year"
                    className="h-8 rounded-xl border border-border/80 bg-surface/90 pl-2.5 pr-7 text-xs font-semibold text-text shadow-warm-xs transition hover:border-primary/40 focus:border-primary focus:outline-none cursor-pointer appearance-none"
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
            </div>
          </div>

          {categoryData.entries.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-6 w-6" />}
              title="No expense data"
              description={`No expenses found for ${
                categoryScope === 'month'
                  ? monthLabel(selectedMonth)
                  : categoryScope === 'year'
                  ? `the year ${selectedYear}`
                  : 'the entire dataset'
              }.`}
              action={
                onAddTransaction
                  ? { label: 'Add Transaction', onClick: onAddTransaction }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Category Donut & Total Summary */}
              <div className="cozy-card flex flex-col items-center justify-center p-5 text-center lg:col-span-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Total Expenses ({scopeLabel})
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-text tabular-nums">
                  {formatCurrency(categoryData.totalExpense)}
                </p>

                {/* SVG Visual Ring */}
                <div className="relative my-4 flex h-40 w-40 items-center justify-center">
                  <svg
                    className="h-full w-full -rotate-90"
                    viewBox="0 0 100 100"
                    role="img"
                    aria-label="Category expense distribution"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-surface-muted opacity-40"
                    />
                    {(() => {
                      let accumulatedPct = 0;
                      const circumference = 2 * Math.PI * 40;
                      return categoryData.entries.slice(0, 8).map((entry, idx) => {
                        const strokeDasharray = `${(entry.share / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -((accumulatedPct / 100) * circumference);
                        accumulatedPct += entry.share;
                        const color = chartColors[idx % chartColors.length];

                        return (
                          <circle
                            key={entry.name}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke={color}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-300"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-bold text-text-muted">
                      Categories
                    </span>
                    <span className="font-display text-lg font-bold text-text">
                      {categoryData.entries.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Breakdown Table / List */}
              <div className="cozy-card p-4 lg:col-span-2">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">
                  Category Breakdown
                </h3>
                <ul className="divide-y divide-border/60">
                  {categoryData.entries.map((entry, idx) => {
                    const color = chartColors[idx % chartColors.length];
                    return (
                      <li
                        key={entry.name}
                        className="flex items-center justify-between py-2.5 text-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full shadow-warm-sm"
                            style={{ backgroundColor: color }}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-text">
                              {entry.name}
                            </p>
                            <p className="text-[10px] text-text-muted">
                              {entry.count} transaction{entry.count > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                            {formatCurrency(entry.total)}
                          </p>
                          <p className="text-[11px] font-medium text-text-muted">
                            {entry.share.toFixed(1)}% of total
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* SUB-TAB 3: PLANNER */}
      {subTab === 'planner' && (
        <motion.div
          key="planner-tab"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSoft}
          className="space-y-4"
        >
          {/* Planner KPIs */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
            <StatCard
              label="Income"
              value={formatCurrency(plannerIncome)}
              tone="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Expenses"
              value={formatCurrency(plannerExpenses)}
              tone="text-rose-600 dark:text-rose-400"
            />
            <StatCard
              label="Investment"
              value={formatCurrency(plannerInvestment)}
              tone="text-violet-600 dark:text-violet-400"
            />
            <StatCard
              label="Net Liquid"
              value={formatCurrency(plannerLiquid)}
              tone={
                plannerLiquid >= 0
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-rose-600 dark:text-rose-400'
              }
            />
            <StatCard
              label="Savings %"
              value={`${plannerSavingsPct.toFixed(1)}%`}
              tone={
                plannerSavingsPct >= 0
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-rose-600 dark:text-rose-400'
              }
            />
            <StatCard
              label="Closing Cash"
              value={formatCurrency(plannerClosingBalance)}
              tone={
                plannerClosingBalance >= 0
                  ? 'text-text'
                  : 'text-rose-600 dark:text-rose-400'
              }
            />
          </div>

          {/* Add Planning Entry Form */}
          <div className="cozy-card border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-text">
                Simulate New Entry
              </h3>
              <span className="text-[11px] text-text-muted">In-memory only</span>
            </div>
            <TransactionForm
              transactions={transactions}
              submitLabel="Add to Plan"
              onSubmit={handlePlannerFormSubmit}
              layout="inline"
            />
          </div>

          {/* Staged Planning Entries */}
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Staged What-If Entries ({plannerThisMonth.length})
              </h3>
              {plannerThisMonth.length > 0 && (
                <button
                  type="button"
                  onClick={onClearPlanner}
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline active:scale-95"
                >
                  Clear all
                </button>
              )}
            </div>

            {plannerThisMonth.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-6 w-6" strokeWidth={2} />}
                title="No planning entries yet"
                description="Add what-if income, expenses, or investments above to simulate cash flow without altering your Google Sheet."
              />
            ) : (
              <ul className="space-y-2">
                {plannerThisMonth.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface-strong/90 px-4 py-3 shadow-warm-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">
                        {t.category}
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            t.type === 'income'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : t.type === 'expense'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                          }`}
                        >
                          {t.type}
                        </span>
                      </p>
                      <p className="text-xs font-bold text-text-secondary mt-0.5 tabular-nums">
                        {formatCurrency(t.amount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemovePlanner(t.id)}
                      className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 active:scale-95 dark:text-rose-400 hover:bg-rose-500/10"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="cozy-card border-border p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className={`mt-1 font-display text-base sm:text-lg font-bold tabular-nums ${tone}`}>
        {value}
      </p>
    </div>
  );
}
