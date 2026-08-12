import { useDeferredValue, useMemo, useState } from 'react';
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
  ShoppingBag,
  Trash2,
  TrendingUp,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useMask } from '../../hooks/useMask';
import {
  backdropVariants,
  popoverVariants,
  springSoft,
} from '../../lib/motion';
import { monthKey, monthLabel } from '../../domain/metrics';
import type { Transaction, TransactionType } from '../../domain/types';
import { SoftButton } from '../../components/ui/SoftButton';

interface LedgerViewProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  mutating?: boolean;
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

export function LedgerView({
  transactions,
  onEdit,
  onDelete,
  mutating = false,
}: LedgerViewProps) {
  const { masked, formatCurrency } = useMask();
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateMode, setDateMode] = useState<DateMode>('all');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Action menu portal & View Modal state
  const [activeMenuTx, setActiveMenuTx] = useState<Transaction | null>(null);
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);

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
  }

  function selectAllDates() {
    setDateMode('all');
    setMonthFilter('');
    setFromDate('');
    setToDate('');
  }

  function selectMonth(key: string) {
    setDateMode('month');
    setMonthFilter(key);
    setFromDate('');
    setToDate('');
  }

  function selectCustom() {
    setDateMode('custom');
    setMonthFilter('');
  }

  return (
    <section className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="relative sticky top-[calc(env(safe-area-inset-top,0px)+3.75rem-2px)] z-20 -mx-4 space-y-2 border-b border-border/70 bg-surface/80 px-4 py-2 backdrop-blur-xl transition-theme before:pointer-events-none before:absolute before:inset-x-0 before:-top-2 before:h-2 before:bg-surface/80 before:backdrop-blur-xl before:content-['']">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search category or note"
              className="field-cozy pl-10 pr-10"
              aria-label="Search ledger by category or note"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                }}
                className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition active:scale-95 hover:bg-surface-muted/60"
                aria-label="Clear search"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
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
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFiltersOpen((open) => !open);
            }}
            className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
              filtersOpen || hasActiveFilters
                ? 'border-primary bg-primary text-primary-foreground shadow-glow'
                : 'border-border bg-surface-strong text-text-secondary shadow-warm-sm'
            }`}
            aria-expanded={filtersOpen}
            aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
            title={filtersOpen ? 'Hide filters' : 'Show filters'}
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
                d="M4 6h16M7 12h10M10 18h4"
              />
            </svg>
            {hasActiveFilters && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-warm-sm">
                {activeChips.length}
              </span>
            )}
          </button>
        </div>

        {!filtersOpen && hasActiveFilters && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition active:scale-95 shadow-warm-sm"
                aria-label={`Remove filter ${chip.label}`}
              >
                <span className="max-w-[12rem] truncate">{chip.label}</span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 shrink-0 opacity-80"
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
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 rounded-full border border-border bg-surface-strong px-3 py-1.5 text-xs font-semibold text-text-secondary transition active:scale-95"
            >
              Clear all
            </button>
          </div>
        )}

        <div
          className={`grid transition-all duration-300 ease-out ${
            filtersOpen
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-2 pb-0.5 pt-0.5">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TYPE_FILTERS.map((filter) => {
                  const active = typeFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => {
                        setTypeFilter(filter.id);
                      }}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-warm-sm'
                          : 'border border-border bg-surface-strong text-text-secondary'
                      }`}
                      aria-pressed={active}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={selectAllDates}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                    dateMode === 'all'
                      ? 'bg-primary/20 text-primary border border-primary/40'
                      : 'border border-border bg-surface-strong text-text-secondary'
                  }`}
                  aria-pressed={dateMode === 'all'}
                >
                  All dates
                </button>
                <button
                  type="button"
                  onClick={selectCustom}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                    dateMode === 'custom'
                      ? 'bg-primary/20 text-primary border border-primary/40'
                      : 'border border-border bg-surface-strong text-text-secondary'
                  }`}
                  aria-pressed={dateMode === 'custom'}
                >
                  Custom
                </button>
                {monthOptions.map((key) => {
                  const active = dateMode === 'month' && monthFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectMonth(key)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                        active
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'border border-border bg-surface-strong text-text-secondary'
                      }`}
                      aria-pressed={active}
                    >
                      {monthLabel(key)}
                    </button>
                  );
                })}
              </div>

              {dateMode === 'custom' && (
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface-strong p-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      From
                    </span>
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate || undefined}
                      onChange={(event) => setFromDate(event.target.value)}
                      className="field-cozy py-1.5 text-xs"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      To
                    </span>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(event) => setToDate(event.target.value)}
                      className="field-cozy py-1.5 text-xs"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
          <p className="rounded-2xl border border-dashed border-border bg-surface-strong/80 px-4 py-12 text-center text-sm text-text-muted">
            {sortedTransactions.length === 0
              ? 'No transactions logged yet.'
              : 'No transactions match your search filters.'}
          </p>
        ) : (
          <div className="space-y-4">
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
                <motion.div
                  whileHover={{ y: -1 }}
                  transition={springSoft}
                  className="cozy-card overflow-hidden divide-y divide-border/60 p-0 shadow-warm-sm border-border/80"
                >
                  {group.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => {
                        setViewingTx(tx);
                      }}
                      className="group flex cursor-pointer items-center justify-between gap-3 p-3.5 transition-colors hover:bg-surface-muted/30"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <TransactionIcon
                          type={tx.type}
                          category={tx.category}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-display text-sm font-bold text-text">
                            {tx.category || '—'}
                          </h4>
                          {tx.comment?.trim() ? (
                            <p className="truncate text-xs text-text-muted">
                              {tx.comment}
                            </p>
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

                        {/* 3 Dots Action Trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuTx(tx);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-muted transition active:scale-95 hover:bg-surface-muted/80 hover:text-text"
                          aria-label="Transaction options"
                          title="Options"
                        >
                          <MoreVertical className="h-4.5 w-4.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
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
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-text-secondary shadow-warm-sm"
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
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}
