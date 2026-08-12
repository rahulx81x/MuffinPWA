import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
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
  AuthRequiredError,
  updateTransaction,
  type MutationResult,
} from '../../api/client';
import {
  evaluateAmountExpression,
  looksLikeAmountExpression,
} from '../../domain/evaluateAmount';
import { useTheme } from '../../hooks/useTheme';
import { backdropVariants, popoverVariants, springSoft } from '../../lib/motion';
import { TAB_BY_TYPE } from '@shared';
import type {
  SheetRowData,
  Transaction,
  TransactionType,
} from '../../domain/types';
import { SmartAmountInput } from './SmartAmountInput';
import { SoftButton } from '../../components/ui/SoftButton';

interface ManageTransactionModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  transaction?: Transaction | null;
  /** Sheet transactions to derive top category chips. */
  transactions?: Transaction[];
  /** Existing investment-type labels from sheet transactions. */
  investmentTypeOptions?: string[];
  onClose: () => void;
  onSuccess: (result?: MutationResult) => Promise<void> | void;
}

type InvestmentTypeOption = {
  value: string;
  label: string;
};

const fieldClass = 'field-cozy';
const labelClass = 'mb-1 block text-xs font-semibold text-text-muted';
const closeBtnClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-canvas/90 text-text-secondary shadow-warm-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50';

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
  investmentType: string,
  rowId?: string
): SheetRowData {
  const idFields = rowId ? { Id: rowId } : {};
  if (type === 'investment') {
    return {
      ...idFields,
      Date: date,
      Category: category,
      Amount: amount,
      'Investment Type': investmentType,
      Comment: comment,
    };
  }
  return {
    ...idFields,
    Date: date,
    Category: category,
    Amount: amount,
    Comment: comment,
  };
}

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
      backgroundColor: 'var(--color-surface-strong)',
      boxShadow: state.isFocused ? '0 0 0 1px var(--color-primary)' : 'none',
      fontFamily: 'var(--font-body)',
      '&:hover': { borderColor: 'var(--color-primary)' },
    }),
    valueContainer: (base: CSSObjectWithLabel) => ({
      ...base,
      padding: '2px 10px',
    }),
    input: (base: CSSObjectWithLabel) => ({
      ...base,
      color: 'var(--color-text)',
      margin: 0,
      padding: 0,
      fontFamily: 'var(--font-body)',
    }),
    singleValue: (base: CSSObjectWithLabel) => ({
      ...base,
      color: 'var(--color-text)',
      fontFamily: 'var(--font-body)',
    }),
    placeholder: (base: CSSObjectWithLabel) => ({
      ...base,
      color: 'var(--color-text-secondary)',
    }),
    menu: (base: CSSObjectWithLabel) => ({
      ...base,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: 'var(--color-surface-strong)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-warm)',
      zIndex: 60,
      fontFamily: 'var(--font-body)',
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

export function ManageTransactionModal({
  open,
  mode,
  transaction,
  transactions = [],
  investmentTypeOptions = [],
  onClose,
  onSuccess,
}: ManageTransactionModalProps) {
  const { themeId } = useTheme();
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [amountText, setAmountText] = useState('');
  const [comment, setComment] = useState('');
  const [investmentType, setInvestmentType] = useState('');
  const [investmentTypeInput, setInvestmentTypeInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dynamicCategoryChips = useMemo(() => {
    if (!transactions || !transactions.length) return [];
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
  }, [transactions, type]);

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

  const selectStyles = useMemo(() => buildSelectStyles(), []);

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

  function resolveAmountField(): number | null {
    const result = evaluateAmountExpression(amountText);
    if (!result.ok || result.value <= 0) return null;
    return result.value;
  }

  function handleAmountBlur() {
    if (!looksLikeAmountExpression(amountText)) return;
    const result = evaluateAmountExpression(amountText);
    if (result.ok) {
      setAmountText(String(result.value));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!open) return;
    const amount = resolveAmountField();
    if (!category.trim() || amount == null) {
      setError(
        looksLikeAmountExpression(amountText)
          ? 'Enter a valid category and amount expression (e.g. 1200+350-50).'
          : 'Enter a valid category and amount.'
      );
      return;
    }

    const resolvedInvestmentType =
      investmentType.trim() || investmentTypeInput.trim();
    if (type === 'investment' && !resolvedInvestmentType) {
      setError('Investment type is required for investment rows.');
      return;
    }

    const tabName = TAB_BY_TYPE[type];
    const rowData = buildRowData(
      type,
      date,
      category.trim(),
      amount,
      comment.trim(),
      resolvedInvestmentType,
      mode === 'edit' ? transaction?.rowId : undefined
    );

    setSaving(true);
    setError(null);

    try {
      let result: MutationResult | undefined;
      if (mode === 'add') {
        result = await createTransaction(tabName, rowData);
      } else if (transaction?.tabName != null && transaction.rowIndex != null) {
        const expected = {
          date: transaction.date,
          category: transaction.category,
          amount: transaction.amount,
        };
        if (transaction.tabName === tabName) {
          result = await updateTransaction(
            tabName,
            transaction.rowIndex,
            rowData,
            expected,
            transaction.rowId
          );
        } else {
          await deleteTransaction(
            transaction.tabName,
            transaction.rowIndex,
            expected,
            transaction.rowId
          );
          result = await createTransaction(tabName, rowData);
        }
      } else {
        throw new Error('Missing sheet location for this transaction.');
      }

      await onSuccess(result);
      onClose();
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setError('Session expired — please sign in again.');
        return;
      }
      console.error('Failed to save transaction', err);
      setError(
        err instanceof Error ? err.message : 'Could not save transaction.'
      );
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
          <motion.button
            type="button"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-black/50"
            aria-label="Dismiss transaction dialog"
            onClick={onClose}
            disabled={saving}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-tx-title"
            variants={popoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springSoft}
            className="relative z-10 w-full max-w-sm rounded-t-3xl rounded-b-2xl border border-border bg-surface-strong p-5 shadow-elevate sm:rounded-2xl"
          >
            <div className="mx-auto -mt-1 mb-3 h-1.5 w-12 shrink-0 rounded-full bg-border/80" />

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
              <SoftButton
                onClick={onClose}
                disabled={saving}
                className={closeBtnClass}
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </SoftButton>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
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
                        disabled={saving}
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
                  disabled={saving}
                  onChange={(e) => setDate(e.target.value)}
                  className={fieldClass}
                />
              </label>

              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelClass}>Category</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rent, Salary"
                      value={category}
                      disabled={saving}
                      onChange={(e) => setCategory(e.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Amount</span>
                    <SmartAmountInput
                      required
                      placeholder="0"
                      value={amountText}
                      disabled={saving}
                      onChange={setAmountText}
                      onBlur={handleAmountBlur}
                      className={fieldClass}
                    />
                  </label>
                </div>

                {dynamicCategoryChips.length > 0 && (
                  <div>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Frequent Categories (1-Tap)
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {dynamicCategoryChips.map((chip) => {
                        const active = category.trim().toLowerCase() === chip.toLowerCase();
                        const c = chip.toLowerCase();
                        let colorStyle = 'border-border/80 bg-canvas/80 text-text-secondary hover:border-primary/50 hover:text-text';
                        
                        if (active) {
                          colorStyle = 'border-primary bg-primary/20 text-primary shadow-warm-sm ring-1 ring-primary/40';
                        } else if (c.includes('food') || c.includes('coffee') || c.includes('dine')) {
                          colorStyle = 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20';
                        } else if (c.includes('groc') || c.includes('shop') || c.includes('market')) {
                          colorStyle = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20';
                        } else if (c.includes('fuel') || c.includes('travel') || c.includes('cab')) {
                          colorStyle = 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20';
                        } else if (c.includes('rent') || c.includes('bill') || c.includes('house')) {
                          colorStyle = 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20';
                        } else if (c.includes('sip') || c.includes('stock') || c.includes('invest') || c.includes('fund')) {
                          colorStyle = 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20';
                        } else if (c.includes('sal') || c.includes('bonus') || c.includes('income')) {
                          colorStyle = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20';
                        }

                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setCategory(chip)}
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${colorStyle}`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

          {type === 'investment' && (
            <div className="block">
              <span className={labelClass}>Investment Type</span>
              <CreatableSelect<InvestmentTypeOption, false>
                key={themeId}
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
                filterOption={(option, inputValue) => {
                  if (!inputValue) return true;
                  return option.label.toLowerCase().includes(inputValue.toLowerCase());
                }}
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
              disabled={saving}
              onChange={(e) => setComment(e.target.value)}
              className={fieldClass}
            />
          </label>

          {error && (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 transition-theme dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              role="alert"
            >
              {error}
            </p>
          )}

          <motion.button
            type="submit"
            disabled={saving}
            whileHover={saving ? undefined : { scale: 1.015 }}
            whileTap={saving ? undefined : { scale: 0.97 }}
            transition={springSoft}
            className="soft-glow w-full min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
          >
            {saving
              ? 'Saving…'
              : mode === 'add'
                ? 'Add transaction'
                : 'Save changes'}
          </motion.button>
        </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
