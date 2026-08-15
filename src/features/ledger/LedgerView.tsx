import { useEffect, useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  Coffee,
  CreditCard,
  Eye,
  Home as HomeIcon,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useMask } from '../../hooks/useMask';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import {
  backdropVariants,
  popoverVariants,
  springSoft,
} from '../../lib/motion';
import { monthKey, monthLabel } from '../../domain/metrics';
import type { NewTransactionInput, Transaction, TransactionType } from '../../domain/types';
import { FocusTrap } from '../../components/atoms/FocusTrap';
import { EmptyState } from '../../components/molecules/EmptyState';
import { SoftButton } from '../../components/ui/SoftButton';

interface LedgerViewProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  mutating?: boolean;
  initialMonthFilter?: string;
  onRefresh?: () => Promise<void>;
  onAddTransaction?: () => void;
  onQuickAdd?: (input: NewTransactionInput) => Promise<void> | void;
}

type TypeFilter = 'all' | TransactionType;
type DateMode = 'all' | 'month' | 'custom';

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expense' },
  { id: 'investment', label: 'Investment' },
];

interface ActiveChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface DateGroup {
  dateIso: string;
  displayTitle: string;
  totalExpense: number;
  totalIncome: number;
  totalInvestment: number;
  transactions: Transaction[];
}

function amountClass(type: Transaction['type']): string {
  if (type === 'income') return 'text-emerald-600 dark:text-emerald-400';
  if (type === 'expense') return 'text-rose-600 dark:text-rose-400';
  return 'text-violet-600 dark:text-violet-400';
}

function amountPrefix(type: Transaction['type'], masked: boolean): string {
  if (masked) return '';
  if (type === 'income') return '+';
  if (type === 'expense') return '−';
  return '';
}

function formatDateSectionTitle(dateIso: string): string {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateIso === todayStr) return 'Today';
  if (dateIso === yesterdayStr) return 'Yesterday';

  const [y, m, d] = dateIso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatShortRange(from: string, to: string): string {
  const f = new Date(from + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  const t = new Date(to + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  if (from && to) return `${f} → ${t}`;
  if (from) return `From ${f}`;
  if (to) return `Until ${t}`;
  return 'Custom range';
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function TransactionIcon({
  type,
  category,
}: {
  type: TransactionType;
  category: string;
}) {
  const cat = category.toLowerCase();
  const size = 'h-4 w-4';

  if (type === 'income') {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
        <ArrowUpRight className={size} strokeWidth={2.5} />
      </div>
    );
  }

  if (type === 'investment') {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
        <TrendingUp className={size} strokeWidth={2.5} />
      </div>
    );
  }

  let IconComponent = ArrowDownRight;
  if (
    cat.includes('food') ||
    cat.includes('restaurant') ||
    cat.includes('dining')
  ) {
    IconComponent = Utensils;
  } else if (
    cat.includes('coffee') ||
    cat.includes('tea') ||
    cat.includes('cafe')
  ) {
    IconComponent = Coffee;
  } else if (
    cat.includes('rent') ||
    cat.includes('home') ||
    cat.includes('housing')
  ) {
    IconComponent = HomeIcon;
  } else if (
    cat.includes('grocer') ||
    cat.includes('supermarket') ||
    cat.includes('shop')
  ) {
    IconComponent = ShoppingBag;
  } else if (
    cat.includes('bill') ||
    cat.includes('electricity') ||
    cat.includes('utility') ||
    cat.includes('wifi')
  ) {
    IconComponent = Zap;
  } else if (
    cat.includes('card') ||
    cat.includes('loan') ||
    cat.includes('emi')
  ) {
    IconComponent = CreditCard;
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
      <IconComponent className={size} strokeWidth={2.2} />
    </div>
  );
}

function SwipeableTransactionRow({
  tx,
  onView,
  onEdit,
  onDelete,
  onOpenMenu,
  mutating,
  masked,
  formatCurrency,
}: {
  tx: Transaction;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenMenu: () => void;
  mutating?: boolean;
  masked: boolean;
  formatCurrency: (amount: number) => string;
}) {
  const [swiped, setSwiped] = useState(false);
  const THRESHOLD = 60;

  return (
    <div className="relative overflow-hidden bg-surface-muted/50 first:rounded-t-2xl last:rounded-b-2xl">
      {/* Revealed action buttons */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-2.5 z-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          disabled={mutating || tx.tabName == null || tx.rowIndex == null}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary transition active:scale-95 disabled:opacity-40"
          aria-label="Edit transaction"
          title="Edit"
        >
          <Pencil className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={mutating || tx.tabName == null || tx.rowIndex == null}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 transition active:scale-95 disabled:opacity-40"
          aria-label="Delete transaction"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>

      {/* Draggable Row Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -106, right: 0 }}
        dragElastic={0.08}
        onDragEnd={(_, info) => {
          if (info.offset.x < -THRESHOLD) {
            setSwiped(true);
            navigator.vibrate?.(8);
          } else {
            setSwiped(false);
          }
        }}
        animate={{ x: swiped ? -100 : 0 }}
        transition={springSoft}
        onClick={onView}
        className="relative z-10 flex cursor-pointer items-center justify-between gap-3 bg-surface-strong p-3.5 transition-colors hover:bg-surface-muted/30"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <TransactionIcon type={tx.type} category={tx.category} />
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-display text-sm font-bold text-text">
              {tx.category || '—'}
            </h4>
            {tx.comment?.trim() ? (
              <p className="truncate text-xs text-text-muted">{tx.comment}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <p
            className={`font-display text-base font-bold tabular-nums ${amountClass(tx.type)}`}
          >
            {amountPrefix(tx.type, masked)}
            {formatCurrency(tx.amount)}
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMenu();
            }}
            className="inline-flex min-h-9 min-w-9 h-9 w-9 items-center justify-center rounded-xl text-text-muted transition active:scale-95 hover:bg-surface-muted/80 hover:text-text"
            aria-label="Transaction options"
            title="Options"
          >
            <MoreVertical className="h-4.5 w-4.5" strokeWidth={2} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function QuickAddStrip({
  onQuickAdd,
  onOpenFullModal,
  existingTransactions,
  disabled,
}: {
  onQuickAdd: (input: NewTransactionInput) => Promise<void> | void;
  onOpenFullModal?: () => void;
  existingTransactions: Transaction[];
  disabled?: boolean;
}) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Derive frequent categories based on type
  const frequentCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tx of existingTransactions) {
      if (tx.type !== type) continue;
      const cat = tx.category?.trim();
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    }
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c)
      .slice(0, 5);
    if (top.length > 0) return top;
    return type === 'expense'
      ? ['Food', 'Groceries', 'Transport', 'Shopping', 'Bills']
      : ['Salary', 'Freelance', 'Dividends', 'Cashback'];
  }, [existingTransactions, type]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || !category.trim()) return;

    setSubmitting(true);
    try {
      const now = new Date();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      await onQuickAdd({
        type,
        category: category.trim(),
        amount: num,
        date: todayIso,
        comment: '',
      });
      setAmount('');
      setCategory('');
    } finally {
      setSubmitting(false);
    }
  }

  const isValid = parseFloat(amount) > 0 && category.trim().length > 0;

  return (
    <div className="cozy-card border border-border/80 bg-surface-strong/95 p-3 sm:p-4 shadow-warm-sm backdrop-blur-md">
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Type Switcher */}
          <div className="flex items-center gap-1 rounded-xl bg-surface/80 p-0.5 border border-border/60">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Income
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Quick Log (Today)
            </span>
            {onOpenFullModal && (
              <button
                type="button"
                onClick={onOpenFullModal}
                className="text-[11px] font-semibold text-primary hover:underline"
                title="Open detailed transaction modal"
              >
                Detailed &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Input strip */}
        <div className="flex items-center gap-2">
          {/* Category Input */}
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (e.g. Food)"
              className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-text placeholder-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Amount Input */}
          <div className="relative w-24 sm:w-32 shrink-0">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
              ₹
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full min-h-10 rounded-xl border border-border bg-surface pl-6 pr-2.5 py-2 text-xs font-bold text-text tabular-nums placeholder-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Submit Button */}
          <SoftButton
            type="submit"
            disabled={!isValid || disabled || submitting}
            loading={submitting}
            className="inline-flex min-h-10 min-w-10 h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-warm-sm disabled:opacity-40 active:scale-95"
            aria-label="Add transaction"
            glow={false}
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
          </SoftButton>
        </div>

        {/* Category quick-select chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted shrink-0">
            Recent:
          </span>
          {frequentCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`shrink-0 min-h-[28px] rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95 ${
                category === cat
                  ? 'border-primary bg-primary/15 text-primary font-bold shadow-xs'
                  : 'border-border/60 bg-surface/60 text-text-muted hover:border-border hover:text-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}

export function LedgerView({
  transactions,
  onEdit,
  onDelete,
  mutating = false,
  initialMonthFilter = '',
  onRefresh,
  onAddTransaction,
  onQuickAdd,
}: LedgerViewProps) {
  const { masked, formatCurrency } = useMask();
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateMode, setDateMode] = useState<DateMode>(
    initialMonthFilter ? 'month' : 'all'
  );
  const [monthFilter, setMonthFilter] = useState<string>(initialMonthFilter);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Action menu portal & View Modal state
  const [activeMenuTx, setActiveMenuTx] = useState<Transaction | null>(null);
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);

  const { containerRef, pullDistance, refreshing } = usePullToRefresh<HTMLDivElement>({
    onRefresh: onRefresh || (() => {}),
    disabled: !onRefresh,
  });

  useEffect(() => {
    if (initialMonthFilter) {
      setDateMode('month');
      setMonthFilter(initialMonthFilter);
    }
  }, [initialMonthFilter]);

  // Escape key handlers for active popovers
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (activeMenuTx) setActiveMenuTx(null);
        if (viewingTx) setViewingTx(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeMenuTx, viewingTx]);

  const deferredQuery = useDeferredValue(query);
  const searchTerm = normalizeSearch(deferredQuery);

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        if (byDate !== 0) return byDate;
        return b.id.localeCompare(a.id);
      }),
    [transactions]
  );

  const monthOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const tx of sortedTransactions) {
      keys.add(monthKey(tx.date));
    }
    return [...keys].sort((a, b) => b.localeCompare(a));
  }, [sortedTransactions]);

  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      if (dateMode === 'month' && monthFilter) {
        if (monthKey(tx.date) !== monthFilter) return false;
      }

      if (dateMode === 'custom') {
        if (fromDate && tx.date < fromDate) return false;
        if (toDate && tx.date > toDate) return false;
      }

      if (!searchTerm) return true;
      const category = tx.category.toLowerCase();
      const comment = tx.comment.toLowerCase();
      return category.includes(searchTerm) || comment.includes(searchTerm);
    });
  }, [
    sortedTransactions,
    typeFilter,
    dateMode,
    monthFilter,
    fromDate,
    toDate,
    searchTerm,
  ]);

  const groupedTransactions = useMemo<DateGroup[]>(() => {
    const groupsMap = new Map<string, Transaction[]>();
    for (const tx of filteredTransactions) {
      const list = groupsMap.get(tx.date) || [];
      list.push(tx);
      groupsMap.set(tx.date, list);
    }

    const groups: DateGroup[] = [];
    groupsMap.forEach((txs, dateIso) => {
      let totalExpense = 0;
      let totalIncome = 0;
      let totalInvestment = 0;
      for (const t of txs) {
        if (t.type === 'expense') totalExpense += t.amount;
        else if (t.type === 'income') totalIncome += t.amount;
        else if (t.type === 'investment') totalInvestment += t.amount;
      }

      groups.push({
        dateIso,
        displayTitle: formatDateSectionTitle(dateIso),
        totalExpense,
        totalIncome,
        totalInvestment,
        transactions: txs,
      });
    });

    return groups.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [filteredTransactions]);

  const customRangeActive =
    dateMode === 'custom' && Boolean(fromDate || toDate);

  const hasActiveFilters =
    typeFilter !== 'all' || dateMode === 'month' || customRangeActive;

  const activeChips = useMemo<ActiveChip[]>(() => {
    const chips: ActiveChip[] = [];

    if (typeFilter !== 'all') {
      const label =
        TYPE_FILTERS.find((f) => f.id === typeFilter)?.label ?? typeFilter;
      chips.push({
        id: 'type',
        label,
        onRemove: () => setTypeFilter('all'),
      });
    }

    if (dateMode === 'month' && monthFilter) {
      chips.push({
        id: 'month',
        label: monthLabel(monthFilter),
        onRemove: () => {
          setDateMode('all');
          setMonthFilter('');
        },
      });
    }

    if (customRangeActive) {
      chips.push({
        id: 'custom',
        label: formatShortRange(fromDate, toDate),
        onRemove: () => {
          setDateMode('all');
          setFromDate('');
          setToDate('');
        },
      });
    }

    return chips;
  }, [typeFilter, dateMode, monthFilter, customRangeActive, fromDate, toDate]);

  function clearFilters() {
    setTypeFilter('all');
    setDateMode('all');
    setMonthFilter('');
    setFromDate('');
    setToDate('');
    setQuery('');
  }

  function selectMonth(key: string) {
    if (dateMode === 'month' && monthFilter === key) {
      setDateMode('all');
      setMonthFilter('');
      return;
    }
    setDateMode('month');
    setMonthFilter(key);
  }

  return (
    <section ref={containerRef} className="space-y-4">
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
            <span>{refreshing ? 'Refreshing transactions…' : 'Pull down to refresh'}</span>
          </div>
        </div>
      )}

      {/* Search & Filter Header Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search category or note…"
              className="w-full rounded-2xl border border-border bg-surface-strong pl-10 pr-9 py-2.5 text-sm text-text placeholder-text-muted outline-none transition-theme focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-text-muted hover:text-text"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters Toggle Button */}
          <SoftButton
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`inline-flex min-h-10 min-w-10 h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-theme ${
              filtersOpen || hasActiveFilters
                ? 'border-primary/50 bg-primary/20 text-primary'
                : 'border-border bg-surface-strong text-text-secondary'
            }`}
            aria-label="Toggle filters"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2.2} />
          </SoftButton>
        </div>

        {/* Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {activeChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-bold text-text-muted hover:text-text hover:underline ml-1"
            >
              Reset all
            </button>
          </div>
        )}

        {/* Expandable Filter Panel */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-cozy ${
            filtersOpen
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-3 rounded-2xl border border-border bg-surface-strong p-3.5 shadow-warm-sm">
              {/* Type Filter Buttons */}
              <div>
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Type
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TYPE_FILTERS.map((f) => {
                    const active = typeFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTypeFilter(f.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                          active
                            ? 'bg-primary text-primary-foreground shadow-warm-sm font-bold'
                            : 'border border-border bg-canvas text-text-secondary hover:bg-surface-muted/60'
                        }`}
                        aria-pressed={active}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Month Selector Pills */}
              <div>
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Date Mode
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  <button
                    type="button"
                    onClick={() => {
                      setDateMode('all');
                      setMonthFilter('');
                    }}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                      dateMode === 'all'
                        ? 'bg-primary text-primary-foreground shadow-warm-sm font-bold'
                        : 'border border-border bg-canvas text-text-secondary'
                    }`}
                    aria-pressed={dateMode === 'all'}
                  >
                    All Dates
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateMode('custom');
                      setMonthFilter('');
                    }}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                      dateMode === 'custom'
                        ? 'bg-primary text-primary-foreground shadow-warm-sm font-bold'
                        : 'border border-border bg-canvas text-text-secondary'
                    }`}
                    aria-pressed={dateMode === 'custom'}
                  >
                    Custom Range
                  </button>
                  {monthOptions.map((key) => {
                    const active = dateMode === 'month' && monthFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectMonth(key)}
                        className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                          active
                            ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                            : 'border border-border bg-canvas text-text-secondary'
                        }`}
                        aria-pressed={active}
                      >
                        {monthLabel(key)}
                      </button>
                    );
                  })}
                </div>

                {dateMode === 'custom' && (
                  <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-canvas p-2.5">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        From
                      </span>
                      <input
                        type="date"
                        value={fromDate}
                        max={toDate || undefined}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="field-cozy py-1.5 text-xs"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        To
                      </span>
                      <input
                        type="date"
                        value={toDate}
                        min={fromDate || undefined}
                        onChange={(e) => setToDate(e.target.value)}
                        className="field-cozy py-1.5 text-xs"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Strip */}
      {onQuickAdd && (
        <QuickAddStrip
          onQuickAdd={onQuickAdd}
          onOpenFullModal={onAddTransaction}
          existingTransactions={transactions}
          disabled={mutating}
        />
      )}

      {/* Transactions List Grouped by Date */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-bold text-text">
            Ledger Timeline
          </h2>
          <p className="shrink-0 text-xs tabular-nums text-text-muted">
            {filteredTransactions.length} of {sortedTransactions.length} entries
          </p>
        </div>

        {groupedTransactions.length === 0 ? (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title={
              sortedTransactions.length === 0
                ? 'No transactions yet'
                : 'No matching entries'
            }
            description={
              sortedTransactions.length === 0
                ? 'Transactions logged from your Google Sheet or added using the + button will appear here in chronological order.'
                : 'Try adjusting your search terms or clearing your date/type filters to view more transactions.'
            }
            action={
              sortedTransactions.length === 0 && onAddTransaction
                ? { label: 'Add First Transaction', onClick: onAddTransaction }
                : hasActiveFilters || query
                  ? { label: 'Clear Filters', onClick: clearFilters }
                  : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            <p className="text-[11px] text-text-muted text-right pr-1">
              Tip: Swipe left on any row for quick actions
            </p>
            {groupedTransactions.map((group) => (
              <div key={group.dateIso} className="space-y-1.5">
                {/* Date Section Header */}
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    {group.displayTitle}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] font-bold tabular-nums">
                    {group.totalIncome > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(group.totalIncome)}
                      </span>
                    )}
                    {group.totalExpense > 0 && (
                      <span className="text-rose-600 dark:text-rose-400">
                        −{formatCurrency(group.totalExpense)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Grouped Transactions Card */}
                <div className="cozy-card overflow-hidden divide-y divide-border/60 p-0 shadow-warm-sm border-border/80">
                  {group.transactions.map((tx) => (
                    <SwipeableTransactionRow
                      key={tx.id}
                      tx={tx}
                      onView={() => setViewingTx(tx)}
                      onEdit={() => onEdit(tx)}
                      onDelete={() => onDelete(tx)}
                      onOpenMenu={() => setActiveMenuTx(tx)}
                      mutating={mutating}
                      masked={masked}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Menu Portal */}
      {createPortal(
        <AnimatePresence>
          {activeMenuTx && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
              <motion.button
                type="button"
                variants={backdropVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                aria-label="Dismiss action menu"
                onClick={() => setActiveMenuTx(null)}
              />

              <FocusTrap active={Boolean(activeMenuTx)}>
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Transaction options"
                  variants={popoverVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={springSoft}
                  className="relative z-10 w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-surface-strong p-2.5 shadow-elevate"
                >
                  <div className="mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full bg-border/80 sm:hidden" />
                  <div className="mb-1.5 border-b border-border/50 pb-2.5 px-3 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Options
                    </span>
                    <p className="truncate font-display text-xs font-bold text-text">
                      {activeMenuTx.category || 'Transaction'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        const tx = activeMenuTx;
                        setActiveMenuTx(null);
                        setViewingTx(tx);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-text transition active:scale-98 hover:bg-surface-muted/60"
                    >
                      <Eye className="h-4 w-4 text-primary" strokeWidth={2.2} />
                      <span>View Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const tx = activeMenuTx;
                        setActiveMenuTx(null);
                        onEdit(tx);
                      }}
                      disabled={
                        mutating ||
                        activeMenuTx.tabName == null ||
                        activeMenuTx.rowIndex == null
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-text transition active:scale-98 hover:bg-surface-muted/60 disabled:opacity-40"
                    >
                      <Pencil className="h-4 w-4 text-text-secondary" strokeWidth={2.2} />
                      <span>Edit Transaction</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const tx = activeMenuTx;
                        setActiveMenuTx(null);
                        onDelete(tx);
                      }}
                      disabled={
                        mutating ||
                        activeMenuTx.tabName == null ||
                        activeMenuTx.rowIndex == null
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-rose-600 transition active:scale-98 hover:bg-rose-500/10 dark:text-rose-400 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" strokeWidth={2.2} />
                      <span>Delete Transaction</span>
                    </button>
                  </div>
                </motion.div>
              </FocusTrap>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* View Transaction Details Modal */}
      {createPortal(
        <AnimatePresence>
          {viewingTx && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
              <motion.button
                type="button"
                variants={backdropVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 bg-black/50"
                aria-label="Dismiss transaction details"
                onClick={() => setViewingTx(null)}
              />

              <FocusTrap active={Boolean(viewingTx)}>
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="view-tx-title"
                  variants={popoverVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={springSoft}
                  className="relative z-10 w-full max-w-sm overflow-hidden rounded-t-3xl rounded-b-2xl border border-border bg-surface-strong p-5 shadow-elevate sm:max-w-md sm:rounded-2xl"
                >
                  <div className="mx-auto -mt-1 mb-3 h-1.5 w-12 shrink-0 rounded-full bg-border/80 sm:hidden" />

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                        Transaction Details
                      </p>
                      <h2
                        id="view-tx-title"
                        className="mt-1 font-display text-base font-bold text-text"
                      >
                        {viewingTx.category || 'Transaction'}
                      </h2>
                    </div>
                    <SoftButton
                      onClick={() => {
                        setViewingTx(null);
                      }}
                      className="inline-flex min-h-11 min-w-11 h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-text-secondary shadow-warm-sm"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    </SoftButton>
                  </div>

                  {/* Main Details Body */}
                  <div className="mt-4 space-y-4">
                    {/* Amount Pill */}
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-canvas/90 p-4 text-center">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Amount
                      </span>
                      <p
                        className={`mt-1 font-display text-2xl font-bold tabular-nums ${amountClass(viewingTx.type)}`}
                      >
                        {amountPrefix(viewingTx.type, masked)}
                        {formatCurrency(viewingTx.amount)}
                      </p>
                    </div>

                    <div className="space-y-2.5 rounded-2xl border border-border/70 bg-surface-strong p-4 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-muted">
                          Category
                        </span>
                        <span className="font-bold text-text">
                          {viewingTx.category}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-muted">
                          Date
                        </span>
                        <span className="font-bold text-text">
                          {formatFullDate(viewingTx.date)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-muted">
                          Type
                        </span>
                        <span className="capitalize font-bold text-text">
                          {viewingTx.type}
                        </span>
                      </div>

                      {viewingTx.investmentType && (
                        <div className="flex items-center justify-between border-t border-border/50 pt-2">
                          <span className="font-semibold text-primary">
                            Investment Type
                          </span>
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-bold text-primary">
                            {viewingTx.investmentType}
                          </span>
                        </div>
                      )}

                      {viewingTx.comment?.trim() && (
                        <div className="border-t border-border/50 pt-2">
                          <span className="block font-semibold text-text-muted">
                            Notes / Comment
                          </span>
                          <p className="mt-1 leading-relaxed text-text">
                            {viewingTx.comment}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Modal Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const tx = viewingTx;
                          setViewingTx(null);
                          onEdit(tx);
                        }}
                        disabled={
                          mutating ||
                          viewingTx.tabName == null ||
                          viewingTx.rowIndex == null
                        }
                        className="soft-glow flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface-strong px-4 py-2.5 text-xs font-semibold text-text shadow-warm-sm active:scale-95 disabled:opacity-40"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tx = viewingTx;
                          setViewingTx(null);
                          onDelete(tx);
                        }}
                        disabled={
                          mutating ||
                          viewingTx.tabName == null ||
                          viewingTx.rowIndex == null
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 active:scale-95 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              </FocusTrap>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}
