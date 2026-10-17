import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
import { monthKey } from '../../domain/metrics';
import type { Transaction, TransactionType } from '../../domain/types';
import { SmartAmountInput } from '../../features/ledger/SmartAmountInput';
import { SoftButton } from '../ui/SoftButton';

/** Canonical name used for allowance-deduction matching. */
export const ALLOWANCE_SELF_CATEGORY = 'Allowance - Self';

/** Returns true if category matches 'Allowance - Self' regardless of dash character (hyphen, en-dash, em-dash), spacing, or 'Allowance' shorthand. */
export function isAllowanceSelfCategory(category?: string | null): boolean {
  if (!category) return false;
  const c = category.toLowerCase().trim();
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\u2013\u2014\u2212\-]/g, '-')
      .replace(/\s*-\s*/g, ' - ')
      .replace(/\s+/g, ' ')
      .trim();
  if (norm(c) === norm(ALLOWANCE_SELF_CATEGORY)) return true;
  if (/^allowance\s*[-:—–(]\s*self\)?$/i.test(c)) return true;
  if (c === 'allowance' || c === 'self allowance') return true;
  return false;
}

export interface TransactionFormData {
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  comment: string;
  investmentType: string;
  redemptionPL?: {
    type: 'profit' | 'loss';
    amount: number;
  } | null;
  /** When true, the caller should deduct this expense amount from the month's Allowance - Self expense entry. */
  deductFromAllowance?: boolean;
}

export interface TransactionFormProps {
  initialValues?: {
    date?: string;
    type?: TransactionType;
    category?: string;
    amountText?: string;
    comment?: string;
    investmentType?: string;
    redemptionPL?: {
      type: 'profit' | 'loss';
      amount: number;
    } | null;
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
  showDate?: boolean;
  requireDate?: boolean;
  resetOnSubmit?: boolean;
  /** Show the 'Deduct from Allowance – Self' toggle (only meaningful for add-mode expense). */
  showAllowanceDeduct?: boolean;
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
  showDate = true,
  requireDate = true,
  resetOnSubmit = false,
  showAllowanceDeduct = false,
}: TransactionFormProps) {
  const initialAmountRaw = initialValues?.amountText ?? '';
  const initialIsRedeem =
    initialValues?.type === 'investment' &&
    (initialAmountRaw.trim().startsWith('-') ||
      (Number(initialAmountRaw) < 0));

  const [date, setDate] = useState(initialValues?.date || todayIso());
  const [type, setType] = useState<TransactionType>(initialValues?.type || 'expense');
  const [investmentAction, setInvestmentAction] = useState<'invest' | 'redeem'>(
    initialIsRedeem ? 'redeem' : 'invest'
  );
  const [category, setCategory] = useState(initialValues?.category || '');
  const [amountText, setAmountText] = useState(
    initialIsRedeem
      ? initialAmountRaw.replace(/^-+\s*/, '')
      : initialAmountRaw
  );
  const [comment, setComment] = useState(initialValues?.comment || '');
  const [investmentType, setInvestmentType] = useState(initialValues?.investmentType || '');
  const [investmentTypeInput, setInvestmentTypeInput] = useState('');
  const [plType, setPlType] = useState<'none' | 'profit' | 'loss'>(
    initialValues?.redemptionPL?.type ?? 'none'
  );
  const [plAmountText, setPlAmountText] = useState(
    initialValues?.redemptionPL?.amount != null
      ? String(initialValues.redemptionPL.amount)
      : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [deductFromAllowance, setDeductFromAllowance] = useState(false);

  // Reset deduct toggle when type changes away from expense
  useEffect(() => {
    if (type !== 'expense') setDeductFromAllowance(false);
  }, [type]);

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
        .slice(0, 4);
    }
    return categoryChips.slice(0, 4);
  }, [transactions, categoryChips, type]);

  /** Chips shown: 'Allowance - Self' is always pinned first for expense, deduped from the rest. */
  const pinnedChips = useMemo(() => {
    if (type !== 'expense') return activeCategoryChips.slice(0, 4);
    const rest = activeCategoryChips
      .filter((c) => !isAllowanceSelfCategory(c))
      .slice(0, 4);
    return [ALLOWANCE_SELF_CATEGORY, ...rest];
  }, [type, activeCategoryChips]);

  /** Pre-computed total of all Allowance - Self expense transactions for the selected month. */
  const allowanceTotalForMonth = useMemo(() => {
    if (!showAllowanceDeduct || type !== 'expense') return 0;
    const targetMonth = monthKey(date);
    return transactions
      .filter(
        (tx) =>
          tx.type === 'expense' &&
          isAllowanceSelfCategory(tx.category) &&
          monthKey(tx.date) === targetMonth
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [showAllowanceDeduct, type, date, transactions]);

  /** Parsed current amount value (or 0 if invalid). */
  const currentAmountValue = useMemo(() => {
    const res = evaluateAmountExpression(amountText);
    return res.ok ? Math.abs(res.value) : 0;
  }, [amountText]);

  const deductWouldOverflow =
    deductFromAllowance &&
    allowanceTotalForMonth > 0 &&
    currentAmountValue > allowanceTotalForMonth;

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

    let finalAmount = amountValue;
    if (type === 'investment') {
      if (finalAmount === 0) {
        finalAmount = 0;
      } else if (investmentAction === 'redeem' || finalAmount < 0) {
        finalAmount = -Math.abs(finalAmount);
      } else {
        finalAmount = Math.abs(finalAmount);
      }
    } else {
      if (finalAmount < 0) {
        setError('Amount cannot be negative.');
        return;
      }
    }

    const finalDate = date.trim() || todayIso();
    if (showDate && requireDate && !date.trim()) {
      setError('Date is required.');
      return;
    }
    if (!category.trim()) {
      setError('Title / Category is required.');
      return;
    }
    if (type === 'investment' && !investmentType.trim()) {
      setError('Investment Type is required for investment entries.');
      return;
    }

    let redemptionPL: { type: 'profit' | 'loss'; amount: number } | null = null;
    if (type === 'investment' && finalAmount < 0 && plType !== 'none') {
      const plResult = evaluateAmountExpression(plAmountText);
      if (!plResult.ok) {
        setError(`Realized P/L: ${plResult.error}`);
        return;
      }
      const plVal = Math.abs(plResult.value);
      if (plVal <= 0) {
        setError('Realized P/L amount must be greater than zero.');
        return;
      }
      redemptionPL = {
        type: plType,
        amount: plVal,
      };
    }

    if (deductWouldOverflow) {
      setError(
        `Cannot deduct ₹${currentAmountValue.toLocaleString()} from Allowance – Self: only ₹${allowanceTotalForMonth.toLocaleString()} available this month.`
      );
      return;
    }

    try {
      await onSubmit({
        date: finalDate,
        type,
        category: category.trim(),
        amount: finalAmount,
        comment: comment.trim(),
        investmentType: type === 'investment' ? investmentType.trim() : '',
        redemptionPL,
        deductFromAllowance: type === 'expense' && deductFromAllowance,
      });

      if (resetOnSubmit) {
        setCategory('');
        setAmountText('');
        setComment('');
        setInvestmentType('');
        setInvestmentTypeInput('');
        setInvestmentAction('invest');
        setPlType('none');
        setPlAmountText('');
        setDeductFromAllowance(false);
        setDate(initialValues?.date || todayIso());
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3.5 ${className}`}>
      <div>
        <span className={labelClass}>Transaction Type</span>
        <div className="relative flex rounded-2xl border border-border/80 bg-canvas/80 p-1">
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
                className={`relative flex-1 rounded-[12px] py-1.5 text-xs font-semibold transition-colors duration-200 ${
                  active ? 'text-primary-foreground font-bold' : 'text-text-muted hover:text-text'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="txTypeActive"
                    className="absolute inset-0 rounded-[12px] bg-gradient-to-r from-primary-muted to-primary shadow-warm-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {type === 'investment' && (
        <div className="space-y-1.5">
          <span className={labelClass}>Investment Action</span>
          <div className="grid grid-cols-2 rounded-xl border border-border/80 bg-canvas/80 p-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setInvestmentAction('invest');
                if (amountText.trim().startsWith('-')) {
                  setAmountText(amountText.replace(/^-+\s*/, ''));
                }
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                investmentAction === 'invest'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold shadow-warm-sm border border-emerald-500/30'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <span>+ Invest / Buy</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setInvestmentAction('redeem');
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                investmentAction === 'redeem'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold shadow-warm-sm border border-amber-500/30'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <span>− Redeem / Sell</span>
            </button>
          </div>
        </div>
      )}

      {showDate && (
        <label className="block">
          <span className={labelClass}>Date</span>
          <input
            type="date"
            required={requireDate}
            value={date}
            disabled={busy}
            onChange={(e) => setDate(e.target.value)}
            className={fieldClass}
          />
        </label>
      )}

      <div>
        <label className="block">
          <span className={labelClass}>Title / Category</span>
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

        {pinnedChips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pinnedChips.map((cat) => {
              const isAllowance = isAllowanceSelfCategory(cat);
              const isActive = isAllowance
                ? isAllowanceSelfCategory(category)
                : category.toLowerCase().trim() === cat.toLowerCase().trim();
              return (
                <button
                  key={cat}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setCategory(cat);
                    navigator.vibrate?.(8);
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs transition-all ${
                    isActive
                      ? 'border border-primary/50 bg-primary/20 text-primary font-bold shadow-warm-sm'
                      : isAllowance
                        ? 'chip-allowance border bg-surface/80 text-text-secondary hover:bg-surface-muted/60'
                        : 'font-medium border border-border/80 bg-surface text-text-secondary hover:bg-surface-muted/60'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block">
          <span className={labelClass}>
            {type === 'investment' && investmentAction === 'redeem'
              ? 'Redeemed Amount'
              : 'Amount'}
          </span>
          <SmartAmountInput
            required
            placeholder={
              type === 'investment' && investmentAction === 'redeem'
                ? '0 or 50000'
                : '0 or 1200 + 450 or 1000 * 18%'
            }
            value={amountText}
            disabled={busy}
            onChange={(v) => {
              setAmountText(v);
              setError(null);
              if (type === 'investment' && v.trim().startsWith('-')) {
                setInvestmentAction('redeem');
              }
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

      {/* Deduct from Allowance - Self toggle (expense + add mode only) */}
      {type === 'expense' && showAllowanceDeduct && (
        <div
          className={`rounded-2xl border p-3 transition-colors ${
            deductFromAllowance
              ? 'border-primary/40 bg-primary/10 shadow-warm-sm'
              : 'border-border/60 bg-canvas/60'
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={deductFromAllowance}
                disabled={busy}
                onChange={(e) => setDeductFromAllowance(e.target.checked)}
              />
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${
                  deductFromAllowance
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-surface'
                }`}
              >
                {deductFromAllowance && (
                  <svg viewBox="0 0 12 10" className="h-3 w-3 stroke-current" fill="none" strokeWidth={2.5}>
                    <path d="M1 5l3.5 3.5L11 1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold transition-colors ${
                deductFromAllowance ? 'text-primary' : 'text-text'
              }`}>
                Deduct from Allowance - Self
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                Marks this expense as paid from your monthly allowance instead of liquid cash.
              </p>
            </div>
          </label>

          {deductFromAllowance && (
            <div className={`mt-2.5 rounded-xl border px-3 py-2 text-[11px] leading-relaxed transition-colors ${
              deductWouldOverflow
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-primary/25 bg-surface text-text-secondary'
            }`}>
              {deductWouldOverflow ? (
                <span>
                  ⚠️ <strong>Exceeds allowance:</strong> ₹{currentAmountValue.toLocaleString()} &gt; ₹{allowanceTotalForMonth.toLocaleString()} available this month.
                </span>
              ) : allowanceTotalForMonth > 0 && currentAmountValue > 0 ? (
                <span>
                  Will reduce <strong>Allowance - Self</strong> for{' '}
                  <strong>{new Date(date + 'T00:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>{' '}
                  by{' '}
                  <strong className="text-primary font-bold">₹{currentAmountValue.toLocaleString()}</strong>
                  {' '}(effective: ₹{(allowanceTotalForMonth - currentAmountValue).toLocaleString()})
                </span>
              ) : (
                <span>
                  {allowanceTotalForMonth === 0
                    ? '⚠️ No Allowance - Self transaction found for this month — will save expense normally.'
                    : 'Enter an amount to preview the deduction.'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

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
            placeholder="e.g. SIP, FD, Stocks"
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

      {type === 'investment' && investmentAction === 'redeem' && (
        <div className="rounded-2xl border border-border/80 bg-surface-muted/50 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-text-muted">
              Realized Profit / Loss (P/L)
            </span>
            <span className="text-[11px] text-text-muted">Auto-logs to Sheet</span>
          </div>

          <div className="grid grid-cols-3 rounded-xl border border-border/70 bg-canvas/80 p-1 gap-1">
            {(
              [
                { id: 'none', label: 'No P/L / Par' },
                { id: 'profit', label: '+ Profit' },
                { id: 'loss', label: '− Loss' },
              ] as const
            ).map((tab) => {
              const active = plType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={busy}
                  onClick={() => setPlType(tab.id)}
                  className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                    active
                      ? tab.id === 'profit'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-warm-sm border border-emerald-500/30'
                        : tab.id === 'loss'
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 shadow-warm-sm border border-rose-500/30'
                        : 'bg-surface text-text shadow-warm-sm border border-border/60'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {plType !== 'none' && (
            <div className="space-y-2 pt-1">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-text-secondary">
                  {plType === 'profit' ? 'Profit Amount' : 'Loss Amount'}
                </span>
                <SmartAmountInput
                  required
                  placeholder="e.g. 5000"
                  value={plAmountText}
                  disabled={busy}
                  onChange={(v) => {
                    setPlAmountText(v);
                    setError(null);
                  }}
                  className={fieldClass}
                />
              </label>

              <div className="rounded-xl border border-primary/25 bg-primary/5 p-2.5 text-[11px] leading-relaxed text-text-secondary">
                <p>
                  <span className="font-bold text-text">
                    {plType === 'profit' ? '📈 Will log to Income:' : '📉 Will log to Expense:'}
                  </span>{' '}
                  Title / Category:{' '}
                  <span className="font-semibold text-primary">
                    &ldquo;{category.trim() || 'Investment'} &ndash; {plType === 'profit' ? 'Profit' : 'Loss'}&rdquo;
                  </span>
                  {comment.trim() && (
                    <>
                      {' · Note: '}
                      <span className="font-semibold text-primary">
                        &ldquo;{comment.trim()} &ndash; {plType === 'profit' ? 'Profit' : 'Loss'}&rdquo;
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <label className="block">
        <span className={labelClass}>Comment</span>
        <textarea
          rows={2}
          placeholder="Optional note (supports multiple lines)"
          value={comment}
          disabled={busy}
          onChange={(e) => setComment(e.target.value)}
          className={`${fieldClass} leading-relaxed`}
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
