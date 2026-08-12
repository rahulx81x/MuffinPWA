import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  createEmptyInvestment,
  type RecipeInvestment,
} from '../../config';
import { useRecipeConfig } from '../../hooks/useRecipeConfig';
import {
  backdropVariants,
  popoverVariants,
  springSoft,
} from '../../lib/motion';
import { SoftButton } from '../../components/ui/SoftButton';

interface RecipeModalProps {
  open: boolean;
  onClose: () => void;
  spreadsheetId: string | null;
  spreadsheetTitle: string | null;
  investmentTypeSuggestions?: string[];
}

const labelClass =
  'mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted';
const fieldClass =
  'w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-text outline-none transition-theme focus:border-primary/50 focus:ring-2 focus:ring-primary/25 disabled:opacity-60';

function parseAmountInput(value: string): number {
  const cleaned = value.replace(/,/g, '').trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function RecipeModal({
  open,
  onClose,
  spreadsheetId,
  spreadsheetTitle,
  investmentTypeSuggestions = [],
}: RecipeModalProps) {
  const titleId = useId();
  const { config, persistConfig } = useRecipeConfig();
  const [openingBalance, setOpeningBalance] = useState('0');
  const [investments, setInvestments] = useState<RecipeInvestment[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOpeningBalance(String(config.openingBalance || 0));
    setInvestments(
      config.investments.length > 0
        ? config.investments.map((row) => ({ ...row }))
        : [createEmptyInvestment()]
    );
    setCopied(false);
    setError(null);
  }, [open, config]);

  async function handleCopyId() {
    if (!spreadsheetId) return;
    try {
      await navigator.clipboard.writeText(spreadsheetId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not copy sheet ID.');
    }
  }

  function updateInvestment(
    id: string,
    patch: Partial<Pick<RecipeInvestment, 'type' | 'amount'>>
  ) {
    setInvestments((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function removeInvestment(id: string) {
    setInvestments((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createEmptyInvestment()];
    });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const cleaned = investments
      .map((row) => ({
        ...row,
        type: row.type.trim(),
        amount: Number.isFinite(row.amount) ? Math.max(0, row.amount) : 0,
      }))
      .filter((row) => row.type || row.amount > 0);

    for (const row of cleaned) {
      if (row.amount > 0 && !row.type) {
        setError('Give each investment amount a type label.');
        return;
      }
    }

    setSaving(true);
    try {
      await persistConfig({
        openingBalance: parseAmountInput(openingBalance),
        investments: cleaned.map((row) => ({
          ...row,
          type: row.type || 'Investment',
        })),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save recipe. Try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  const suggestionList = Array.from(
    new Set(
      [
        ...investmentTypeSuggestions,
        'Regular Deposits',
        'Fixed Deposits',
        'Mutual Funds',
      ].map((s) => s.trim()).filter(Boolean)
    )
  );

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
            aria-label="Dismiss recipe dialog"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            variants={popoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springSoft}
            className="relative z-10 max-h-[88dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl rounded-b-2xl border border-border bg-surface-strong p-5 shadow-elevate sm:rounded-2xl"
          >
            <div className="mx-auto -mt-1 mb-3 h-1.5 w-12 shrink-0 rounded-full bg-border/80" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Configuration
                </p>
                <h2
                  id={titleId}
                  className="mt-1 font-display text-base font-bold text-text"
                >
                  Recipe Starting Balances
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Configure initial cash & investments synced to your account across all devices.
                </p>
              </div>
              <SoftButton
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-text-secondary shadow-warm-sm"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </SoftButton>
            </div>

            <div className="mt-3.5 rounded-2xl border border-primary/25 bg-primary/10 p-3 text-xs text-text">
              <p className="font-semibold text-primary">🍳 Welcome to Recipe Setup!</p>
              <p className="mt-0.5 text-[11px] text-text-secondary leading-snug">
                Enter your starting liquid cash balance and initial investments below to seed your Net Worth dashboard.
              </p>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <span className={labelClass}>Spreadsheet</span>
                <p className="truncate text-sm font-medium text-text">
                  {spreadsheetTitle || 'Linked Google Sheet'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-canvas px-3 py-2 font-mono text-[11px] text-text-secondary">
                    {spreadsheetId || 'Not linked'}
                  </code>
                  <SoftButton
                    type="button"
                    onClick={() => void handleCopyId()}
                    disabled={!spreadsheetId}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-text-secondary shadow-warm-sm disabled:opacity-50"
                    aria-label={copied ? 'Copied' : 'Copy sheet ID'}
                    title={copied ? 'Copied' : 'Copy sheet ID'}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" strokeWidth={2.5} />
                    ) : (
                      <Copy className="h-4 w-4" strokeWidth={2} />
                    )}
                  </SoftButton>
                </div>
              </div>

              <label className="block">
                <span className={labelClass}>Initial opening balance</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className={fieldClass}
                  placeholder="0"
                  disabled={saving}
                />
                <span className="mt-1 block text-[11px] text-text-muted">
                  Liquid cash on hand before tracked months begin.
                </span>
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={labelClass + ' mb-0'}>
                    Initial investments
                  </span>
                  <SoftButton
                    type="button"
                    onClick={() =>
                      setInvestments((prev) => [...prev, createEmptyInvestment()])
                    }
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary"
                    glow={false}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Add
                  </SoftButton>
                </div>

                <div className="space-y-2">
                  {investments.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1fr_6.5rem_auto] gap-2"
                    >
                      <input
                        type="text"
                        list="recipe-investment-types"
                        value={row.type}
                        onChange={(e) =>
                          updateInvestment(row.id, { type: e.target.value })
                        }
                        className={fieldClass}
                        placeholder="Type"
                        aria-label="Investment type"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={row.amount || ''}
                        onChange={(e) =>
                          updateInvestment(row.id, {
                            amount: parseAmountInput(e.target.value),
                          })
                        }
                        className={fieldClass}
                        placeholder="0"
                        aria-label="Investment amount"
                      />
                      <SoftButton
                        type="button"
                        onClick={() => removeInvestment(row.id)}
                        className="inline-flex h-[42px] w-9 items-center justify-center rounded-xl border border-border bg-canvas text-text-secondary"
                        aria-label="Remove investment"
                        glow={false}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </SoftButton>
                    </div>
                  ))}
                </div>
                <datalist id="recipe-investment-types">
                  {suggestionList.map((label) => (
                    <option key={label} value={label} />
                  ))}
                </datalist>
                <p className="mt-1.5 text-[11px] text-text-muted">
                  Add one row per investment type (FD, mutual funds, etc.).
                </p>
              </div>

              {error && (
                <p
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <SoftButton
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm font-medium text-text-secondary disabled:opacity-60"
                  glow={false}
                >
                  Cancel
                </SoftButton>
                <SoftButton
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save recipe'}
                </SoftButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
