import { useDeferredValue, useMemo, useState } from 'react';
import { useMask } from '../hooks/useMask';
import { monthKey, monthLabel } from '../lib/metrics';
import type { Transaction, TransactionType } from '../types';

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

function formatLedgerDate(iso: string): string {
  const date = new Date(iso + 'T00:00:00');
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortRange(from: string, to: string): string {
  if (from && to) return `${formatLedgerDate(from)} → ${formatLedgerDate(to)}`;
  if (from) return `From ${formatLedgerDate(from)}`;
  if (to) return `Until ${formatLedgerDate(to)}`;
  return 'Custom range';
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
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

  const customRangeActive =
    dateMode === 'custom' && Boolean(fromDate || toDate);

  const hasActiveFilters =
    typeFilter !== 'all' ||
    dateMode === 'month' ||
    customRangeActive;

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
    <section className="-mt-2 space-y-2">
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+2.75rem)] z-20 -mx-4 space-y-2 border-b border-border/80 bg-canvas/95 px-4 py-2 backdrop-blur-md transition-colors duration-200">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
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
              placeholder="Search category or comment"
              className="w-full rounded-2xl border border-zinc-200 bg-white py-2 pl-10 pr-10 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500"
              aria-label="Search ledger by category or comment"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition active:scale-95 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
            onClick={() => setFiltersOpen((open) => !open)}
            className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
              filtersOpen || hasActiveFilters
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
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
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white dark:bg-teal-400 dark:text-zinc-950">
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
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-95 dark:bg-zinc-100 dark:text-zinc-900"
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
              className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
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
                      onClick={() => setTypeFilter(filter.id)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                        active
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
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
                      ? 'bg-teal-700 text-white dark:bg-teal-400 dark:text-zinc-950'
                      : 'border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
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
                      ? 'bg-teal-700 text-white dark:bg-teal-400 dark:text-zinc-950'
                      : 'border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
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
                          ? 'bg-teal-700 text-white dark:bg-teal-400 dark:text-zinc-950'
                          : 'border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                      }`}
                      aria-pressed={active}
                    >
                      {monthLabel(key)}
                    </button>
                  );
                })}
              </div>

              {dateMode === 'custom' && (
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      From
                    </span>
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate || undefined}
                      onChange={(event) => setFromDate(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      To
                    </span>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(event) => setToDate(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                </div>
              )}

              {hasActiveFilters && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-zinc-700 transition active:scale-95 dark:text-zinc-200"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Transactions
          </h2>
          <p className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {filteredTransactions.length} of {sortedTransactions.length}
          </p>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500 transition-opacity duration-200 dark:border-zinc-700 dark:bg-zinc-900">
            {sortedTransactions.length === 0
              ? 'No transactions yet.'
              : 'No matches for these filters.'}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all duration-200 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {filteredTransactions.map((tx) => (
              <li
                key={tx.id}
                className="px-4 py-3.5 transition-opacity duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 flex-1 break-words text-[15px] font-bold leading-snug text-zinc-900 dark:text-zinc-50">
                    {tx.category || '—'}
                  </h3>
                  <div className="flex shrink-0 items-start gap-1.5">
                    <p
                      className={`pt-0.5 text-right text-[15px] font-bold tabular-nums leading-snug ${amountClass(tx.type)}`}
                    >
                      {amountPrefix(tx.type, masked)}
                      {formatCurrency(tx.amount)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onEdit(tx)}
                      disabled={mutating || tx.tabName == null || tx.rowIndex == null}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition active:scale-95 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      aria-label={`Edit ${tx.category || 'transaction'}`}
                      title="Edit"
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
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 7.125 16.875 4.5"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(tx)}
                      disabled={mutating || tx.tabName == null || tx.rowIndex == null}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-rose-500 transition active:scale-95 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      aria-label={`Delete ${tx.category || 'transaction'}`}
                      title="Delete"
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
                          d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
                        />
                        <path strokeLinecap="round" d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mt-1.5 space-y-1.5">
                  <p className="whitespace-normal break-words text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {tx.comment?.trim() ? tx.comment : 'No comment'}
                  </p>
                  <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {formatLedgerDate(tx.date)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
