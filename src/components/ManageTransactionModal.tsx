import { FormEvent, useEffect, useState } from 'react';
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from '../lib/api';
import type {
  SheetRowData,
  SheetTabName,
  Transaction,
  TransactionType,
} from '../types';

interface ManageTransactionModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  transaction?: Transaction | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

const TYPE_TO_TAB: Record<TransactionType, SheetTabName> = {
  income: 'Income',
  expense: 'Expense',
  investment: 'Investment',
};

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function buildRowData(
  type: TransactionType,
  date: string,
  category: string,
  amount: number,
  comment: string,
  investmentType: string
): SheetRowData {
  if (type === 'investment') {
    return {
      Date: date,
      Category: category,
      Amount: amount,
      'Investment Type': investmentType,
      Comment: comment,
    };
  }
  return {
    Date: date,
    Category: category,
    Amount: amount,
    Comment: comment,
  };
}

export function ManageTransactionModal({
  open,
  mode,
  transaction,
  onClose,
  onSuccess,
}: ManageTransactionModalProps) {
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [amountText, setAmountText] = useState('');
  const [comment, setComment] = useState('');
  const [investmentType, setInvestmentType] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setSaving(false);

    if (mode === 'edit' && transaction) {
      setDate(transaction.date);
      setType(transaction.type);
      setCategory(transaction.category);
      setAmountText(String(transaction.amount));
      setComment(transaction.comment || '');
      setInvestmentType(transaction.investmentType || '');
    } else {
      setDate(todayIso());
      setType('expense');
      setCategory('');
      setAmountText('');
      setComment('');
      setInvestmentType('');
    }
  }, [open, mode, transaction]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = parseFloat(amountText);
    if (!category.trim() || Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid category and amount.');
      return;
    }
    if (type === 'investment' && !investmentType.trim()) {
      setError('Investment type is required for investment rows.');
      return;
    }

    const tabName = TYPE_TO_TAB[type];
    const rowData = buildRowData(
      type,
      date,
      category.trim(),
      amount,
      comment.trim(),
      investmentType.trim()
    );

    setSaving(true);
    setError(null);

    try {
      if (mode === 'add') {
        await createTransaction(tabName, rowData);
      } else if (transaction?.tabName != null && transaction.rowIndex != null) {
        if (transaction.tabName === tabName) {
          await updateTransaction(tabName, transaction.rowIndex, rowData);
        } else {
          await deleteTransaction(transaction.tabName, transaction.rowIndex);
          await createTransaction(tabName, rowData);
        }
      } else {
        throw new Error('Missing sheet location for this transaction.');
      }

      await onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save transaction', err);
      setError(
        err instanceof Error ? err.message : 'Could not save transaction.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]"
        aria-label="Dismiss transaction dialog"
        onClick={onClose}
        disabled={saving}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-tx-title"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        style={{ animation: 'manageTxFade 180ms ease-out' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {mode === 'add' ? 'New' : 'Edit'}
            </p>
            <h2
              id="manage-tx-title"
              className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {mode === 'add' ? 'Add transaction' : 'Edit transaction'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 transition active:scale-95 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            aria-label="Close"
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
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-500">
                Date
              </span>
              <input
                type="date"
                required
                value={date}
                disabled={saving}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-500">
                Type
              </span>
              <select
                value={type}
                disabled={saving}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="investment">Investment</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-500">
                Category
              </span>
              <input
                type="text"
                required
                placeholder="e.g. Rent"
                value={category}
                disabled={saving}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-500">
                Amount
              </span>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0"
                value={amountText}
                disabled={saving}
                onChange={(e) => setAmountText(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>

          {type === 'investment' && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-500">
                Investment Type
              </span>
              <input
                type="text"
                required
                placeholder="e.g. Mutual Fund"
                value={investmentType}
                disabled={saving}
                onChange={(e) => setInvestmentType(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-500">
              Comment
            </span>
            <input
              type="text"
              placeholder="Optional note"
              value={comment}
              disabled={saving}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          {error && (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-11 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving
              ? 'Saving…'
              : mode === 'add'
                ? 'Add transaction'
                : 'Save changes'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes manageTxFade {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
