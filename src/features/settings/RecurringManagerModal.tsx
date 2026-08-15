import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  CalendarSync,
  Check,
  ChevronLeft,
  Loader2,
  Pause,
  Play,
  Plus,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import CreatableSelect from 'react-select/creatable';
import type {
  CSSObjectWithLabel,
  ControlProps,
  GroupBase,
  OptionProps,
  StylesConfig,
} from 'react-select';
import { newRecurringRuleId, type RecurrenceType, type RecurringRule, type Transaction } from '@shared';
import { FocusTrap } from '../../components/atoms/FocusTrap';
import { SoftButton } from '../../components/ui/SoftButton';
import {
  calculateRecurringDueSummary,
  formatRecurrenceDay,
  formatRuleEndDate,
} from '../../domain/recurring';
import { useMask } from '../../hooks/useMask';
import { useRecipeConfig } from '../../hooks/useRecipeConfig';
import { backdropVariants, popoverVariants, springSoft } from '../../lib/motion';

interface RecurringManagerModalProps {
  open: boolean;
  onClose: () => void;
  onLogSingleRule?: (rule: RecurringRule) => Promise<boolean>;
  onLogAllDue?: () => Promise<boolean>;
  logging?: boolean;
  transactions?: Transaction[];
  investmentTypeOptions?: string[];
}

type InvestmentTypeOption = {
  value: string;
  label: string;
};

const labelClass =
  'mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted';
const fieldClass =
  'w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-text outline-none transition-theme focus:border-primary/50 focus:ring-2 focus:ring-primary/25 disabled:opacity-60';

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

export function RecurringManagerModal({
  open,
  onClose,
  onLogSingleRule,
  onLogAllDue,
  logging = false,
  transactions = [],
  investmentTypeOptions = [],
}: RecurringManagerModalProps) {
  const titleId = useId();
  const { formatCurrency } = useMask();
  const {
    recurringRules,
    addRecurringRule,
    editRecurringRule,
    removeRecurringRule,
    toggleRecurringRule,
  } = useRecipeConfig();

  const [formMode, setFormMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<RecurrenceType>('expense');
  const [category, setCategory] = useState('');
  const [investmentType, setInvestmentType] = useState('');
  const [investmentTypeInput, setInvestmentTypeInput] = useState('');
  const [amountText, setAmountText] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [comment, setComment] = useState('');
  const [autoPrompt, setAutoPrompt] = useState(true);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectStyles = useMemo(() => buildSelectStyles(), []);

  // Derive category chips strictly from user's real transactions
  const categoryChips = useMemo(() => {
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
      .slice(0, 10)
      .map(([cat]) => cat);
  }, [transactions, type]);

  // Derive investment types strictly from user's real options
  const typeOptions = useMemo<InvestmentTypeOption[]>(() => {
    const seen = new Set<string>();
    const ordered: InvestmentTypeOption[] = [];
    for (const label of investmentTypeOptions || []) {
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

  const dueSummary = useMemo(() => {
    return calculateRecurringDueSummary(recurringRules);
  }, [recurringRules]);

  const activeMonthlyTotal = useMemo(() => {
    return recurringRules
      .filter((r) => r.active && !dueSummary.expiredItems.some((e) => e.id === r.id))
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurringRules, dueSummary.expiredItems]);

  useEffect(() => {
    if (!open) {
      setFormMode('list');
      setEditingRuleId(null);
      setError(null);
    }
  }, [open]);

  function startAdd() {
    setName('');
    setType('expense');
    setCategory('');
    setInvestmentType('');
    setInvestmentTypeInput('');
    setAmountText('');
    setDayOfMonth(1);
    setComment('');
    setAutoPrompt(true);
    setHasEndDate(false);
    setEndDate('');
    setError(null);
    setFormMode('add');
  }

  function startEdit(rule: RecurringRule) {
    setEditingRuleId(rule.id);
    setName(rule.name);
    setType(rule.type);
    setCategory(rule.category);
    setInvestmentType(rule.investmentType || '');
    setInvestmentTypeInput('');
    setAmountText(String(rule.amount));
    setDayOfMonth(rule.dayOfMonth);
    setComment(rule.comment || '');
    setAutoPrompt(rule.autoPrompt !== false);
    setHasEndDate(Boolean(rule.endDate));
    setEndDate(rule.endDate || '');
    setError(null);
    setFormMode('edit');
  }

  async function handleSaveForm() {
    setError(null);
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please provide a name for this recurring transaction.');
      return;
    }

    const cleanAmount = Number(amountText.replace(/,/g, '').trim());
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    const cleanCategory = category.trim() || (type === 'income' ? 'Income' : type === 'investment' ? 'Investment' : 'Expense');
    const cleanDay = Math.max(1, Math.min(31, Math.round(dayOfMonth || 1)));
    const cleanEndDate = hasEndDate && endDate.trim() ? endDate.trim() : undefined;

    setSaving(true);
    try {
      if (formMode === 'add') {
        const newRule: RecurringRule = {
          id: newRecurringRuleId(),
          name: cleanName,
          type,
          category: cleanCategory,
          investmentType: type === 'investment' ? (investmentType.trim() || cleanCategory) : undefined,
          amount: cleanAmount,
          dayOfMonth: cleanDay,
          comment: comment.trim() || undefined,
          active: true,
          autoPrompt: true,
          endDate: cleanEndDate,
          createdAt: new Date().toISOString(),
        };
        await addRecurringRule(newRule);
      } else if (formMode === 'edit' && editingRuleId) {
        const existing = recurringRules.find((r) => r.id === editingRuleId);
        const updatedRule: RecurringRule = {
          id: editingRuleId,
          name: cleanName,
          type,
          category: cleanCategory,
          investmentType: type === 'investment' ? (investmentType.trim() || cleanCategory) : undefined,
          amount: cleanAmount,
          dayOfMonth: cleanDay,
          comment: comment.trim() || undefined,
          active: existing ? existing.active : true,
          autoPrompt,
          endDate: cleanEndDate,
          lastLoggedMonth: existing?.lastLoggedMonth,
          createdAt: existing?.createdAt || new Date().toISOString(),
        };
        await editRecurringRule(updatedRule);
      }
      setFormMode('list');
    } catch (err) {
      console.error('Failed to save recurring rule:', err);
      setError('Failed to save rule. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ruleId: string) {
    setSaving(true);
    try {
      await removeRecurringRule(ruleId);
      if (editingRuleId === ruleId) {
        setFormMode('list');
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
      setError('Failed to delete rule.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(ruleId: string) {
    try {
      await toggleRecurringRule(ruleId);
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  }

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          key="backdrop"
          variants={backdropVariants}
          initial="closed"
          animate="open"
          exit="closed"
          onClick={() => !saving && onClose()}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          key="modal"
          variants={popoverVariants}
          initial="closed"
          animate="open"
          exit="closed"
          transition={springSoft}
          className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-warm-xl"
        >
          <FocusTrap active={open}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 bg-surface-strong/40">
              <div className="flex items-center gap-2.5">
                {formMode !== 'list' && (
                  <button
                    type="button"
                    onClick={() => setFormMode('list')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-canvas hover:text-text active:scale-95 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <CalendarSync className="h-5 w-5" />
                </div>
                <div>
                  <h2 id={titleId} className="text-base font-bold text-text">
                    {formMode === 'list'
                      ? 'Recurring Rules & SIPs'
                      : formMode === 'add'
                      ? 'Add Recurring Rule'
                      : 'Edit Recurring Rule'}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {formMode === 'list'
                      ? `${recurringRules.filter((r) => r.active).length} active (${formatCurrency(activeMonthlyTotal)}/mo)`
                      : 'Auto-schedule monthly transactions'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {formMode === 'list' && (
                  <button
                    type="button"
                    onClick={startAdd}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-warm-sm hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-text-muted hover:bg-surface-strong hover:text-text active:scale-95 transition-all disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs font-medium text-danger">
                  {error}
                </div>
              )}

              {/* LIST MODE */}
              {formMode === 'list' && (
                <div className="space-y-4">
                  {/* Due Action Header Banner if items due */}
                  {dueSummary.dueItems.length > 0 && onLogAllDue && (
                    <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 p-3.5">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary fill-current" />
                        <div>
                          <p className="text-xs font-bold text-text">
                            {dueSummary.dueItems.length} Due Now ({formatCurrency(dueSummary.totalDueAmount)})
                          </p>
                          <p className="text-[11px] text-text-muted">
                            Scheduled up to today in this billing cycle
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={logging}
                        onClick={() => void onLogAllDue()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
                      >
                        {logging ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        <span>Log All</span>
                      </button>
                    </div>
                  )}

                  {/* Empty state */}
                  {recurringRules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-strong text-text-muted shadow-warm-sm">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-text">
                        No recurring rules yet
                      </h3>
                      <p className="mt-1 max-w-xs text-xs text-text-muted">
                        Automate monthly expenses, utility bills, salary, and mutual fund SIPs with 1-tap logging.
                      </p>
                      <button
                        type="button"
                        onClick={startAdd}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm-sm hover:brightness-110 active:scale-95 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add First Recurring Rule</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {recurringRules.map((rule) => {
                        const isDue = dueSummary.dueItems.some((d) => d.id === rule.id);
                        const isLoggedThisMonth = dueSummary.loggedThisMonthItems.some((l) => l.id === rule.id);
                        const isExpired = dueSummary.expiredItems.some((e) => e.id === rule.id);

                        return (
                          <div
                            key={rule.id}
                            className={`group relative flex flex-col gap-2 rounded-2xl border p-3.5 transition-all ${
                              !rule.active || isExpired
                                ? 'border-border/50 bg-surface/40 opacity-70'
                                : isDue
                                ? 'border-primary/40 bg-primary/5 shadow-warm-sm'
                                : isLoggedThisMonth
                                ? 'border-success/30 bg-success/5'
                                : 'border-border/80 bg-surface/90 hover:border-border hover:bg-surface-strong/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <div
                                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                    rule.type === 'income'
                                      ? 'bg-success/15 text-success'
                                      : rule.type === 'investment'
                                      ? 'bg-accent/15 text-accent'
                                      : 'bg-primary/15 text-primary'
                                  }`}
                                >
                                  {rule.type === 'income' ? (
                                    <TrendingUp className="h-3.5 w-3.5" />
                                  ) : rule.type === 'investment' ? (
                                    <Sparkles className="h-3.5 w-3.5" />
                                  ) : (
                                    <CalendarSync className="h-3.5 w-3.5" />
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="text-xs font-bold text-text">
                                      {rule.name}
                                    </h4>

                                    {/* Status Badge */}
                                    {!rule.active ? (
                                      <span className="inline-flex items-center rounded-md bg-surface-strong px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                                        Paused
                                      </span>
                                    ) : isExpired ? (
                                      <span className="inline-flex items-center rounded-md bg-surface-strong px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                                        Ended ({formatRuleEndDate(rule.endDate)})
                                      </span>
                                    ) : isDue ? (
                                      <span className="inline-flex items-center rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                        Due Now
                                      </span>
                                    ) : isLoggedThisMonth ? (
                                      <span className="inline-flex items-center gap-0.5 rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                                        <Check className="h-2.5 w-2.5" />
                                        Logged this month
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-md bg-surface-strong px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                                        Scheduled
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-0.5 text-[11px] text-text-muted">
                                    {rule.category}
                                    {rule.investmentType ? ` • ${rule.investmentType}` : ''}
                                    {' • '}
                                    {formatRecurrenceDay(rule.dayOfMonth)}
                                    {rule.endDate && !isExpired ? ` • Ends ${formatRuleEndDate(rule.endDate)}` : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-xs font-bold text-text">
                                  {formatCurrency(rule.amount)}
                                </span>
                              </div>
                            </div>

                            {/* Actions bar on card */}
                            <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px]">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handleToggle(rule.id)}
                                  className="inline-flex items-center gap-1 text-text-muted hover:text-text transition-colors"
                                >
                                  {rule.active ? (
                                    <>
                                      <Pause className="h-3 w-3" />
                                      <span>Pause</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3" />
                                      <span>Resume</span>
                                    </>
                                  )}
                                </button>
                                <span className="text-border">•</span>
                                <button
                                  type="button"
                                  onClick={() => startEdit(rule)}
                                  className="text-text-muted hover:text-text transition-colors"
                                >
                                  Edit
                                </button>
                                <span className="text-border">•</span>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(rule.id)}
                                  className="text-danger/80 hover:text-danger transition-colors"
                                >
                                  Delete
                                </button>
                              </div>

                              {rule.active && onLogSingleRule && (
                                <button
                                  type="button"
                                  disabled={logging}
                                  onClick={() => void onLogSingleRule(rule)}
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                    isDue
                                      ? 'bg-primary text-primary-foreground shadow-xs hover:brightness-110 active:scale-95'
                                      : 'border border-border/80 bg-surface-strong/60 text-text-secondary hover:bg-surface-strong active:scale-95'
                                  }`}
                                >
                                  <Zap className="h-3 w-3 fill-current" />
                                  <span>{isLoggedThisMonth ? 'Log Again' : 'Log Now'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ADD / EDIT FORM MODE */}
              {formMode !== 'list' && (
                <div className="space-y-4">
                  {/* Type Segmented Control */}
                  <div>
                    <label className={labelClass}>Transaction Type</label>
                    <div className="relative flex rounded-xl border border-border/80 bg-canvas/90 p-1">
                      {(
                        [
                          { id: 'expense', label: 'Expense' },
                          { id: 'investment', label: 'Investment' },
                          { id: 'income', label: 'Income' },
                        ] as const
                      ).map((item) => {
                        const active = type === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setType(item.id);
                            }}
                            className={`relative flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition-colors duration-200 ${
                              active
                                ? 'text-primary-foreground font-bold'
                                : 'text-text-muted hover:text-text'
                            }`}
                          >
                            {active && (
                              <motion.span
                                layoutId="recurringModalTypePill"
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

                  {/* Name Input */}
                  <div>
                    <label className={labelClass}>Rule Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={
                        type === 'income'
                          ? 'e.g. Monthly Salary'
                          : type === 'investment'
                          ? 'e.g. HDFC Nifty 50 SIP'
                          : 'e.g. Apartment Rent'
                      }
                      className={fieldClass}
                    />
                  </div>

                  {/* Category & Investment Type */}
                  {type === 'investment' ? (
                    <div className="space-y-3">
                      <div>
                        <label className={labelClass}>Investment Asset / Fund Name (Category)</label>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="e.g. HDFC Nifty 50 Index Fund, PPF, Sovereign Gold Bond"
                          className={fieldClass}
                        />
                        {categoryChips.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {categoryChips.map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => setCategory(chip)}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-all ${
                                  category.toLowerCase() === chip.toLowerCase()
                                    ? 'border border-primary/50 bg-primary/20 text-primary font-bold shadow-warm-xs'
                                    : 'border border-border/80 bg-surface text-text-muted hover:text-text hover:bg-surface-muted/60'
                                }`}
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>Investment Type</label>
                        <CreatableSelect
                          isClearable
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
                          placeholder="Pick existing type or type a new one"
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
                        <span className="mt-1 block text-[10px] leading-snug text-text-muted">
                          Pick from existing types or type a new one. Use “Provident Fund”, “PF”, or “EPF” to track PF on its own card.
                        </span>
                      </div>

                      <div>
                        <label className={labelClass}>Amount (₹)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={amountText}
                          onChange={(e) => setAmountText(e.target.value)}
                          placeholder="0"
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className={labelClass}>Category</label>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder={type === 'income' ? 'e.g. Salary, Freelance' : 'e.g. Rent, Groceries, Electricity'}
                          className={fieldClass}
                        />
                        {categoryChips.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {categoryChips.map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => setCategory(chip)}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-all ${
                                  category.toLowerCase() === chip.toLowerCase()
                                    ? 'border border-primary/50 bg-primary/20 text-primary font-bold shadow-warm-xs'
                                    : 'border border-border/80 bg-surface text-text-muted hover:text-text hover:bg-surface-muted/60'
                                }`}
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>Amount (₹)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={amountText}
                          onChange={(e) => setAmountText(e.target.value)}
                          placeholder="0"
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  )}

                  {/* Day of Month Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={labelClass}>Day of Month</label>
                      <span className="text-xs font-bold text-primary">
                        {formatRecurrenceDay(dayOfMonth)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="31"
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Number(e.target.value))}
                        className="flex-1 accent-primary cursor-pointer"
                      />
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Number(e.target.value))}
                        className="w-14 rounded-xl border border-border bg-canvas px-2 py-1.5 text-center text-xs font-semibold text-text"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-text-muted">
                      For months with fewer days (e.g., Feb 28/29, Apr 30), it automatically triggers on the month's last day.
                    </p>
                  </div>

                  {/* Comment / Notes */}
                  <div>
                    <label className={labelClass}>Notes / Comment (Optional)</label>
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="e.g. Paid via Auto-debit"
                      className={fieldClass}
                    />
                  </div>

                  {/* End Date Configuration */}
                  <div className="space-y-2 rounded-xl border border-border/70 bg-canvas p-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="text-xs font-semibold text-text">Set End Date / Duration</p>
                        <p className="text-[10px] text-text-muted">
                          Automatically stop recurring after a fixed period (EMIs, subscriptions)
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={hasEndDate}
                        onChange={(e) => {
                          setHasEndDate(e.target.checked);
                          if (e.target.checked && !endDate) {
                            const nextYear = new Date();
                            nextYear.setFullYear(nextYear.getFullYear() + 1);
                            const y = nextYear.getFullYear();
                            const m = String(nextYear.getMonth() + 1).padStart(2, '0');
                            setEndDate(`${y}-${m}`);
                          }
                        }}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      />
                    </label>

                    {hasEndDate && (
                      <div className="pt-2.5 border-t border-border/40 space-y-1">
                        <label className={labelClass}>Recurring End Month (YYYY-MM)</label>
                        <input
                          type="month"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className={fieldClass}
                        />
                        <p className="text-[10px] text-text-muted">
                          Rule will cease to prompt or log after this month concludes.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Auto Prompt Switch (Editable only after creation) */}
                  {formMode === 'edit' ? (
                    <label className="flex items-center justify-between rounded-xl border border-border/60 bg-canvas p-3 cursor-pointer">
                      <div>
                        <p className="text-xs font-semibold text-text">Auto-prompt in Due Banner</p>
                        <p className="text-[10px] text-text-muted">
                          Display in the top due banner when scheduled date arrives
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoPrompt}
                        onChange={(e) => setAutoPrompt(e.target.checked)}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-border/40 bg-canvas/60 p-3 opacity-80">
                      <div>
                        <p className="text-xs font-semibold text-text">Auto-prompt in Due Banner</p>
                        <p className="text-[10px] text-text-muted">
                          Enabled on creation. Can be customized by editing the rule later.
                        </p>
                      </div>
                      <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Enabled
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border/60 px-5 py-3.5 bg-surface-strong/30">
              {formMode === 'list' ? (
                <div className="w-full flex justify-end">
                  <SoftButton
                    className="rounded-xl border border-border/80 bg-surface-strong px-4 py-2 text-xs font-semibold text-text shadow-warm-xs hover:bg-surface-muted/60"
                    glow={false}
                    onClick={onClose}
                  >
                    Done
                  </SoftButton>
                </div>
              ) : (
                <>
                  <SoftButton
                    className="rounded-xl border border-border/80 bg-surface-strong px-4 py-2 text-xs font-semibold text-text-secondary shadow-warm-xs hover:bg-surface-muted/60"
                    glow={false}
                    onClick={() => setFormMode('list')}
                    disabled={saving}
                  >
                    Cancel
                  </SoftButton>
                  <SoftButton
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm-sm hover:brightness-110"
                    onClick={() => void handleSaveForm()}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        Saving...
                      </>
                    ) : (
                      'Save Rule'
                    )}
                  </SoftButton>
                </>
              )}
            </div>
          </FocusTrap>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
