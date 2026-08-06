import { FormEvent, useEffect, useMemo, useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import type {
  CSSObjectWithLabel,
  ControlProps,
  GroupBase,
  OptionProps,
  StylesConfig,
} from 'react-select';
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from '../lib/api';
import { useTheme } from '../hooks/useTheme';
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
  /** Existing investment-type labels from sheet transactions. */
  investmentTypeOptions?: string[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

type InvestmentTypeOption = {
  value: string;
  label: string;
};

const TYPE_TO_TAB: Record<TransactionType, SheetTabName> = {
  income: 'Income',
  expense: 'Expense',
  investment: 'Investment',
};

const fieldClass =
  'w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-text outline-none transition-colors duration-200 focus:border-primary disabled:opacity-60';
const labelClass = 'mb-1 block text-xs font-semibold text-text-muted';
const closeBtnClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-text-secondary shadow-warm-sm transition-colors duration-200 active:scale-95 disabled:opacity-50';

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

function buildSelectStyles(
  isDark: boolean
): StylesConfig<InvestmentTypeOption, false> {
  const border = isDark ? '#423024' : '#e5d3b3';
  const borderFocus = isDark ? '#f59e0b' : '#d97706';
  const surface = isDark ? '#291d15' : '#fffaf5';
  const menuBg = isDark ? '#34261c' : '#fffaf5';
  const text = isDark ? '#f3e8dc' : '#3d2314';
  const muted = isDark ? '#b89c88' : '#7c5a43';
  const optionHover = isDark ? '#423024' : '#f3e8dc';
  const optionSelected = isDark ? '#d97706' : '#d97706';

  return {
    control: (
      base: CSSObjectWithLabel,
      state: ControlProps<InvestmentTypeOption, false>
    ) => ({
      ...base,
      minHeight: 42,
      borderRadius: 12,
      borderColor: state.isFocused ? borderFocus : border,
      backgroundColor: surface,
      boxShadow: state.isFocused ? `0 0 0 1px ${borderFocus}` : 'none',
      '&:hover': { borderColor: borderFocus },
    }),
    valueContainer: (base: CSSObjectWithLabel) => ({
      ...base,
      padding: '2px 10px',
    }),
    input: (base: CSSObjectWithLabel) => ({
      ...base,
      color: text,
      margin: 0,
      padding: 0,
    }),
    singleValue: (base: CSSObjectWithLabel) => ({
      ...base,
      color: text,
    }),
    placeholder: (base: CSSObjectWithLabel) => ({
      ...base,
      color: muted,
    }),
    menu: (base: CSSObjectWithLabel) => ({
      ...base,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: menuBg,
      border: `1px solid ${border}`,
      boxShadow: isDark
        ? '0 8px 24px rgba(0,0,0,0.4)'
        : '0 8px 24px rgba(61,35,20,0.12)',
      zIndex: 60,
    }),
    menuList: (base: CSSObjectWithLabel) => ({
      ...base,
      padding: 4,
      maxHeight: 200,
    }),
    option: (
      base: CSSObjectWithLabel,
      state: OptionProps<InvestmentTypeOption, false, GroupBase<InvestmentTypeOption>>
    ) => ({
      ...base,
      borderRadius: 8,
      backgroundColor: state.isSelected
        ? optionSelected
        : state.isFocused
          ? optionHover
          : 'transparent',
      color: state.isSelected ? '#fffaf5' : text,
      cursor: 'pointer',
      fontSize: 14,
    }),
    dropdownIndicator: (base: CSSObjectWithLabel) => ({
      ...base,
      color: muted,
      padding: 8,
      '&:hover': { color: text },
    }),
    clearIndicator: (base: CSSObjectWithLabel) => ({
      ...base,
      color: muted,
      padding: 8,
      '&:hover': { color: text },
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    noOptionsMessage: (base: CSSObjectWithLabel) => ({
      ...base,
      color: muted,
      fontSize: 13,
    }),
  };
}

export function ManageTransactionModal({
  open,
  mode,
  transaction,
  investmentTypeOptions = [],
  onClose,
  onSuccess,
}: ManageTransactionModalProps) {
  const { isDark } = useTheme();
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [amountText, setAmountText] = useState('');
  const [comment, setComment] = useState('');
  const [investmentType, setInvestmentType] = useState('');
  const [investmentTypeInput, setInvestmentTypeInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeOptions = useMemo<InvestmentTypeOption[]>(() => {
    const seen = new Set<string>();
    const ordered: InvestmentTypeOption[] = [];
    for (const label of investmentTypeOptions) {
      const trimmed = label.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push({ value: trimmed, label: trimmed });
    }
    return ordered.sort((a, b) => a.label.localeCompare(b.label));
  }, [investmentTypeOptions]);

  const selectStyles = useMemo(() => buildSelectStyles(isDark), [isDark]);

  const selectedOption = useMemo(() => {
    const trimmed = investmentType.trim();
    if (!trimmed) return null;
    return (
      typeOptions.find(
        (opt) => opt.value.toLowerCase() === trimmed.toLowerCase()
      ) ?? { value: trimmed, label: trimmed }
    );
  }, [investmentType, typeOptions]);

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
      setInvestmentTypeInput('');
    } else {
      setDate(todayIso());
      setType('expense');
      setCategory('');
      setAmountText('');
      setComment('');
      setInvestmentType('');
      setInvestmentTypeInput('');
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

    const resolvedInvestmentType =
      investmentType.trim() || investmentTypeInput.trim();
    if (type === 'investment' && !resolvedInvestmentType) {
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
      resolvedInvestmentType
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
        className="absolute inset-0 bg-muffin-chocolate/50 backdrop-blur-[2px] transition-colors duration-200"
        aria-label="Dismiss transaction dialog"
        onClick={onClose}
        disabled={saving}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-tx-title"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface-strong p-5 shadow-warm transition-colors duration-200"
        style={{ animation: 'manageTxFade 180ms ease-out' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              {mode === 'add' ? 'New' : 'Edit'}
            </p>
            <h2
              id="manage-tx-title"
              className="mt-1 font-display text-base font-bold text-text"
            >
              {mode === 'add' ? 'Add transaction' : 'Edit transaction'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={closeBtnClass}
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
              <span className={labelClass}>Date</span>
              <input
                type="date"
                required
                value={date}
                disabled={saving}
                onChange={(e) => setDate(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Type</span>
              <select
                value={type}
                disabled={saving}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className={fieldClass}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="investment">Investment</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Category</span>
              <input
                type="text"
                required
                placeholder="e.g. Rent"
                value={category}
                disabled={saving}
                onChange={(e) => setCategory(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Amount</span>
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
                className={fieldClass}
              />
            </label>
          </div>

          {type === 'investment' && (
            <div className="block">
              <span className={labelClass}>Investment Type</span>
              <CreatableSelect<InvestmentTypeOption, false>
                inputId="investment-type-select"
                instanceId="investment-type-select"
                isClearable
                isDisabled={saving}
                isSearchable
                options={typeOptions}
                value={selectedOption}
                inputValue={investmentTypeInput}
                placeholder="Select or type a type"
                noOptionsMessage={() =>
                  typeOptions.length === 0
                    ? 'No types yet — type to create one'
                    : 'No types'
                }
                formatCreateLabel={(input) => `Use “${input.trim()}”`}
                filterOption={() => true}
                openMenuOnFocus={false}
                openMenuOnClick
                blurInputOnSelect
                menuPlacement="auto"
                menuShouldScrollIntoView={false}
                styles={selectStyles}
                onChange={(option) => {
                  setInvestmentType(option?.value ?? '');
                  setInvestmentTypeInput('');
                }}
                onCreateOption={(inputValue) => {
                  const next = inputValue.trim();
                  setInvestmentType(next);
                  setInvestmentTypeInput('');
                }}
                onInputChange={(inputValue, meta) => {
                  if (meta.action === 'input-change') {
                    setInvestmentTypeInput(inputValue);
                  }
                  if (
                    meta.action === 'menu-close' ||
                    meta.action === 'input-blur' ||
                    meta.action === 'set-value'
                  ) {
                    return investmentTypeInput;
                  }
                  return inputValue;
                }}
              />
              <span className="mt-1 block text-[11px] leading-snug text-text-muted">
                Pick from existing types or type a new one. Use “Provident Fund”,
                “PF”, or “EPF” to track PF separately (excluded from net worth).
              </span>
            </div>
          )}

          <label className="block">
            <span className={labelClass}>Comment</span>
            <input
              type="text"
              placeholder="Optional note"
              value={comment}
              disabled={saving}
              onChange={(e) => setComment(e.target.value)}
              className={fieldClass}
            />
          </label>

          {error && (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 transition-colors duration-200 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-warm-sm transition-colors duration-200 active:scale-[0.98] disabled:opacity-60 dark:text-muffin-chocolate"
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
