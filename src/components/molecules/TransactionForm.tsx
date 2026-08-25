import { useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import CreatableSelect from 'react-select/creatable';
import type {
  CSSObjectWithLabel,
  ControlProps,
  GroupBase,
  OptionProps,
  StylesConfig,
} from 'react-select';
import {
  evaluateAmountExpression,
  looksLikeAmountExpression,
} from '../../domain/evaluateAmount';
import type { Transaction, TransactionType } from '../../domain/types';
import { SmartAmountInput } from '../../features/ledger/SmartAmountInput';
import { SoftButton } from '../ui/SoftButton';

export interface TransactionFormData {
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  comment: string;
  investmentType: string;
}

export interface TransactionFormProps {
  initialValues?: {
    date?: string;
    type?: TransactionType;
    category?: string;
    amountText?: string;
    comment?: string;
    investmentType?: string;
  };
  transactions?: Transaction[];
  categoryChips?: string[];
  investmentTypeOptions?: string[];
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void> | void;
  busy?: boolean;
  externalError?: string | null;
  className?: string;
  layout?: 'modal' | 'inline';
}

type InvestmentTypeOption = {
  value: string;
  label: string;
};

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const labelClass = 'mb-1 block text-xs font-semibold text-text-muted';
const fieldClass = 'field-cozy';

function buildSelectStyles(): StylesConfig<InvestmentTypeOption, false> {
  return {
    control: (
      base: CSSObjectWithLabel,
      state: ControlProps<InvestmentTypeOption, false>
    ) => ({
      ...base,
      minHeight: 42,
      borderRadius: 12,
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      backgroundColor: 'var(--color-canvas)',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(var(--accent-rgb), 0.25)' : 'none',
      '&:hover': {
        borderColor: 'var(--color-primary)',
      },
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }),
    valueContainer: (base: CSSObjectWithLabel) => ({
      ...base,
      padding: '2px 12px',
    }),
    input: (base: CSSObjectWithLabel) => ({
      ...base,
      color: 'var(--color-text)',
      fontFamily: 'var(--font-body)',
    }),
    placeholder: (base: CSSObjectWithLabel) => ({
      ...base,
      color: 'var(--color-text-muted)',
      fontSize: 14,
      fontFamily: 'var(--font-body)',
    }),
    singleValue: (base: CSSObjectWithLabel) => ({
      ...base,
      color: 'var(--color-text)',
      fontSize: 14,
      fontFamily: 'var(--font-body)',
    }),
    menu: (base: CSSObjectWithLabel) => ({
      ...base,
      borderRadius: 12,
      border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-strong)',
      boxShadow: 'var(--shadow-elevate)',
      overflow: 'hidden',
      zIndex: 50,
    }),
    menuList: (base: CSSObjectWithLabel) => ({
      ...base,
      padding: 4,
    }),
    option: (
      base: CSSObjectWithLabel,
      state: OptionProps<InvestmentTypeOption, false, GroupBase<InvestmentTypeOption>>
    ) => ({
      ...base,
      borderRadius: 8,
      backgroundColor: state.isSelected
        ? 'var(--color-primary)'
        : state.isFocused
          ? 'var(--color-surface)'
          : 'transparent',
      color: state.isSelected ? 'var(--color-on-primary)' : 'var(--color-text)',
      cursor: 'pointer',
      fontSize: 14,
      fontFamily: 'var(--font-body)',
    }),
    dropdownIndicator: (base: CSSObjectWithLabel) => ({
      ...base,
      color: 'var(--color-text-secondary)',
      padding: 8,
      '&:hover': { color: 'var(--color-text)' },
    }),
    clearIndicator: (base: CSSObjectWithLabel) => ({
      ...base,
      color: 'var(--color-text-secondary)',
      padding: 8,
      '&:hover': { color: 'var(--color-text)' },
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    noOptionsMessage: (base: CSSObjectWithLabel) => ({
      ...base,
      color: 'var(--color-text-secondary)',
      fontSize: 13,
    }),
  };
}

export function TransactionForm({
  initialValues,
  transactions = [],
  categoryChips = [],
  investmentTypeOptions = [],
  submitLabel = 'Save transaction',
  cancelLabel = 'Cancel',
  onCancel,
  onSubmit,
  busy = false,
  externalError = null,
  className = '',
  layout = 'modal',
}: TransactionFormProps) {
  const [date, setDate] = useState(initialValues?.date || todayIso());
  const [type, setType] = useState<TransactionType>(initialValues?.type || 'expense');
  const [category, setCategory] = useState(initialValues?.category || '');
  const [amountText, setAmountText] = useState(initialValues?.amountText || '');
  const [comment, setComment] = useState(initialValues?.comment || '');
  const [investmentType, setInvestmentType] = useState(initialValues?.investmentType || '');
  const [investmentTypeInput, setInvestmentTypeInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeCategoryChips = useMemo(() => {
    if (transactions && transactions.length > 0) {
      const counts: Record<string, number> = {};
      for (const tx of transactions) {
        if (tx.type !== type) continue;
        const cat = tx.category?.trim();
        if (!cat) continue;
        counts[cat] = (counts[cat] || 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([cat]) => cat)
        .slice(0, 8);
    }
    return categoryChips;
  }, [transactions, categoryChips, type]);

  const selectStyles = useMemo(() => buildSelectStyles(), []);

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

  const selectedOption = useMemo(() => {
    const trimmed = investmentType.trim();
    if (!trimmed) return null;
    return (
      typeOptions.find(
        (opt) => opt.value.toLowerCase() === trimmed.toLowerCase()
      ) ?? { value: trimmed, label: trimmed }
    );
  }, [investmentType, typeOptions]);

  const activeError = externalError || error;

  function resolveAmountField(): number | null {
    const result = evaluateAmountExpression(amountText);
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    return result.value;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const amountValue = resolveAmountField();
    if (amountValue == null) return;
    if (amountValue < 0) {
      setError('Amount cannot be negative.');
      return;
    }
    if (!date.trim()) {
      setError('Date is required.');
      return;
    }
    if (!category.trim()) {
      setError('Category is required.');
      return;
    }
    if (type === 'investment' && !investmentType.trim()) {
      setError('Investment Type is required for investment entries.');
      return;
    }

    try {
      await onSubmit({
        date: date.trim(),
        type,
        category: category.trim(),
        amount: amountValue,
        comment: comment.trim(),
        investmentType: type === 'investment' ? investmentType.trim() : '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3.5 ${className}`}>
      <div>
        <span className={labelClass}>Transaction Type</span>
        <div className="relative flex rounded-xl border border-border/80 bg-canvas/80 p-1">
          {(
            [
              { id: 'expense', label: 'Expense' },
              { id: 'income', label: 'Income' },
              { id: 'investment', label: 'Investment' },
            ] as const
          ).map((item) => {
            const active = type === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id)}
                disabled={busy}
                className={`relative flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors duration-200 ${
                  active ? 'text-primary-foreground' : 'text-text-muted hover:text-text'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="txTypeActive"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary-muted to-primary shadow-warm-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className={labelClass}>Date</span>
        <input
          type="date"
          required
          value={date}
          disabled={busy}
          onChange={(e) => setDate(e.target.value)}
          className={fieldClass}
        />
      </label>

      <div>
        <label className="block">
          <span className={labelClass}>Category</span>
          <input
            type="text"
            required
            placeholder="e.g. Groceries, Rent, Salary"
            value={category}
            disabled={busy}
            onChange={(e) => setCategory(e.target.value)}
            className={fieldClass}
          />
        </label>

        {activeCategoryChips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activeCategoryChips.map((cat) => (
              <button
                key={cat}
                type="button"
                disabled={busy}
                onClick={() => {
                  setCategory(cat);
                  navigator.vibrate?.(8);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                  category.toLowerCase() === cat.toLowerCase()
                    ? 'border border-primary/50 bg-primary/20 text-primary font-bold shadow-warm-sm'
                    : 'border border-border/80 bg-surface text-text-secondary hover:bg-surface-muted/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block">
          <span className={labelClass}>Amount</span>
          <SmartAmountInput
            required
            placeholder="0 or 1200 + 450 or 1000 * 18%"
            value={amountText}
            disabled={busy}
            onChange={(v) => {
              setAmountText(v);
              setError(null);
            }}
            className={fieldClass}
          />
        </label>
        {looksLikeAmountExpression(amountText) && (
          <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
            <span>Formula preview</span>
            <span className="font-mono font-semibold text-primary">
              {(() => {
                const res = evaluateAmountExpression(amountText);
                return res.ok ? `= ${res.value}` : '…';
              })()}
            </span>
          </div>
        )}
      </div>

      {type === 'investment' && (
        <div>
          <label className={labelClass}>Investment Type</label>
          <CreatableSelect
            isClearable
            isDisabled={busy}
            styles={selectStyles}
            options={typeOptions}
            value={selectedOption}
            inputValue={investmentTypeInput}
            onInputChange={(val) => setInvestmentTypeInput(val)}
            onChange={(opt) => {
              setInvestmentType(opt?.value ?? '');
            }}
            onCreateOption={(custom) => {
              const label = custom.trim();
              if (!label) return;
              setInvestmentType(label);
              setInvestmentTypeInput('');
            }}
            placeholder="e.g. Mutual Fund, Fixed Deposit, Stocks, PF"
            formatCreateLabel={(inputValue) => `Use "${inputValue}"`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && investmentTypeInput.trim()) {
                e.preventDefault();
                setInvestmentType(investmentTypeInput.trim());
                setInvestmentTypeInput('');
              }
            }}
            noOptionsMessage={({ inputValue }) => {
              if (!inputValue) return 'Type to add custom investment type';
              return inputValue;
            }}
          />
          <span className="mt-1 block text-[11px] leading-snug text-text-muted">
            Pick from existing types or type a new one. Use “Provident Fund”,
            “PF”, or “EPF” to track PF on its own card (excluded from net
            worth and investment breakup).
          </span>
        </div>
      )}

      <label className="block">
        <span className={labelClass}>Comment</span>
        <input
          type="text"
          placeholder="Optional note"
          value={comment}
          disabled={busy}
          onChange={(e) => setComment(e.target.value)}
          className={fieldClass}
        />
      </label>

      {activeError && (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 transition-theme dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
          role="alert"
        >
          {activeError}
        </p>
      )}

      <div className={`flex gap-2 pt-1 ${layout === 'inline' ? 'justify-end' : ''}`}>
        {onCancel && (
          <SoftButton
            type="button"
            onClick={onCancel}
            disabled={busy}
            glow={false}
            className="flex-1 rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm font-semibold text-text-secondary disabled:opacity-60"
          >
            {cancelLabel}
          </SoftButton>
        )}
        <SoftButton
          type="submit"
          disabled={busy}
          loading={busy}
          className={`${
            onCancel ? 'flex-1' : 'w-full'
          } min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60`}
        >
          {submitLabel}
        </SoftButton>
      </div>
    </form>
  );
}
