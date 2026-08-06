import { FormEvent, useMemo, useState } from 'react';
import { INITIAL_LIQUID_BALANCE } from '../config';
import { useMask } from '../hooks/useMask';
import { createId } from '../lib/parseSheet';
import { buildMonthlyKPIs, currentMonthKey, monthKey } from '../lib/metrics';
import type { NewTransactionInput, Transaction, TransactionType } from '../types';

interface PlannerViewProps {
  sheetTransactions: Transaction[];
  plannerTransactions: Transaction[];
  onAdd: (input: NewTransactionInput) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}

export function PlannerView({
  sheetTransactions,
  plannerTransactions,
  onAdd,
  onRemove,
  onClear,
}: PlannerViewProps) {
  const { masked, formatCurrency } = useMask();
  const thisMonth = currentMonthKey();
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [amountText, setAmountText] = useState('');
  const [comment, setComment] = useState('');

  const monthTx = useMemo(() => {
    const combined = [...sheetTransactions, ...plannerTransactions];
    return combined.filter((t) => monthKey(t.date) === thisMonth);
  }, [sheetTransactions, plannerTransactions, thisMonth]);

  const income = monthTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expenses = monthTx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const investment = monthTx
    .filter((t) => t.type === 'investment')
    .reduce((s, t) => s + t.amount, 0);
  const liquid = income - expenses - investment;
  const savingsPct = pct(investment + liquid, income);

  const previousClose = useMemo(() => {
    const monthly = buildMonthlyKPIs(sheetTransactions);
    const prior = monthly.filter((m) => m.key < thisMonth);
    return prior.length > 0
      ? prior[prior.length - 1].closingLiquid
      : INITIAL_LIQUID_BALANCE;
  }, [sheetTransactions, thisMonth]);
  const closingBalance = previousClose + liquid;

  const plannerThisMonth = plannerTransactions.filter(
    (t) => monthKey(t.date) === thisMonth
  );

  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthTx
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = parseFloat(amountText);
    if (!category.trim() || Number.isNaN(amount) || amount <= 0) return;

    onAdd({
      date,
      type,
      category: category.trim(),
      amount,
      comment: comment.trim(),
    });

    setCategory('');
    setAmountText('');
    setComment('');
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          Planner
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          What-if entries for this month stay in-memory on this device only.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Income" value={formatCurrency(income)} tone="text-emerald-600 dark:text-emerald-400" />
        <Stat label="Expenses" value={formatCurrency(expenses)} tone="text-rose-600 dark:text-rose-400" />
        <Stat label="Investment" value={formatCurrency(investment)} tone="text-violet-600 dark:text-violet-400" />
        <Stat label="Liquid" value={formatCurrency(liquid)} tone="text-teal-600 dark:text-teal-400" />
        <Stat
          label="Savings %"
          value={`${savingsPct.toFixed(1)}%`}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <Stat
          label="Closing Balance"
          value={formatCurrency(closingBalance)}
          tone="text-teal-600 dark:text-teal-400"
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
          Add mock entry
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-500">Date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-500">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="investment">Investment</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-500">Category</span>
            <input
              type="text"
              required
              placeholder="e.g. Rent"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-500">Amount</span>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-500">Comment</span>
          <input
            type="text"
            placeholder="Optional note"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <button
          type="submit"
          className="w-full min-h-11 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add to plan
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">
          Expense categories
        </h3>
        {expenseBreakdown.length === 0 ? (
          <p className="text-sm text-zinc-500">No expenses this month yet.</p>
        ) : (
          <ul className="space-y-2">
            {expenseBreakdown.map(([name, amount]) => (
              <li key={name} className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{name}</span>
                <span className="tabular-nums text-rose-600 dark:text-rose-400">
                  {masked ? (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {pct(amount, expenses).toFixed(1)}%
                    </span>
                  ) : (
                    <>
                      {formatCurrency(amount)}
                      <span className="ml-2 text-zinc-400">
                        {pct(amount, expenses).toFixed(1)}%
                      </span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Mock entries
          </h3>
          {plannerThisMonth.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400"
            >
              Clear all
            </button>
          )}
        </div>
        {plannerThisMonth.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
            No planning transactions yet. Add one above to model this month.
          </div>
        ) : (
          <ul className="space-y-2">
            {plannerThisMonth.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {t.category}
                    <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] uppercase text-zinc-500 dark:bg-zinc-800">
                      {t.type}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatCurrency(t.amount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(t.id)}
                  className="shrink-0 text-xs font-semibold text-rose-600 active:scale-95 dark:text-rose-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  className = '',
}: {
  label: string;
  value: string;
  tone: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

/** Helper kept for callers that still construct planner rows. */
export function toPlannerTransaction(input: NewTransactionInput): Transaction {
  return {
    id: createId(input.type),
    date: input.date,
    category: input.category,
    type: input.type,
    amount: input.amount,
    comment: input.comment,
    investmentType: input.type === 'investment' ? input.category : undefined,
  };
}
