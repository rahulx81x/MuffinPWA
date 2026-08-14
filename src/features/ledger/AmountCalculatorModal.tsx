import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Delete, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  evaluateAmountExpression,
  looksLikeAmountExpression,
} from '../../domain/evaluateAmount';
import { backdropVariants, popoverVariants, springSoft } from '../../lib/motion';
import { SoftButton } from '../../components/ui/SoftButton';
import { FocusTrap } from '../../components/atoms/FocusTrap';

interface AmountCalculatorModalProps {
  open: boolean;
  /** Seed expression when the modal opens (plain number or empty). */
  initialExpression?: string;
  onClose: () => void;
  onApply: (value: number) => void;
}

const KEYS: { label: string; insert: string; accent?: boolean }[][] = [
  [
    { label: 'C', insert: 'C', accent: true },
    { label: '(', insert: '(' },
    { label: ')', insert: ')' },
    { label: '%', insert: '%' },
  ],
  [
    { label: '7', insert: '7' },
    { label: '8', insert: '8' },
    { label: '9', insert: '9' },
    { label: '÷', insert: '/' },
  ],
  [
    { label: '4', insert: '4' },
    { label: '5', insert: '5' },
    { label: '6', insert: '6' },
    { label: '×', insert: '*' },
  ],
  [
    { label: '1', insert: '1' },
    { label: '2', insert: '2' },
    { label: '3', insert: '3' },
    { label: '−', insert: '-' },
  ],
  [
    { label: '0', insert: '0' },
    { label: '.', insert: '.' },
    { label: '=', insert: '=', accent: true },
    { label: '+', insert: '+' },
  ],
];

function formatResult(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(value);
}

export function AmountCalculatorModal({
  open,
  initialExpression = '',
  onClose,
  onApply,
}: AmountCalculatorModalProps) {
  const [expression, setExpression] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [committed, setCommitted] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const seed = initialExpression.trim();
    setExpression(seed);
    setError(null);
    setCommitted(null);
  }, [open, initialExpression]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const evaluated = useMemo(
    () => evaluateAmountExpression(expression),
    [expression]
  );

  const canUse = committed != null || evaluated.ok;

  function appendToken(token: string) {
    setCommitted(null);
    setError(null);
    setExpression((prev) => prev + token);
  }

  function clearAll() {
    setExpression('');
    setError(null);
    setCommitted(null);
  }

  function backspace() {
    setCommitted(null);
    setError(null);
    setExpression((prev) => prev.slice(0, -1));
  }

  function evaluateEquals() {
    if (!evaluated.ok) {
      setError(evaluated.error);
      setCommitted(null);
      return;
    }
    setCommitted(evaluated.value);
    setExpression(formatResult(evaluated.value));
    setError(null);
  }

  function handleKey(insert: string) {
    if (insert === 'C') {
      clearAll();
      return;
    }
    if (insert === '=') {
      evaluateEquals();
      return;
    }
    appendToken(insert);
  }

  function handleUseResult() {
    const value = committed ?? (evaluated.ok ? evaluated.value : null);

    if (value == null) {
      setError(evaluated.ok ? 'Enter a valid expression.' : evaluated.error);
      return;
    }
    onApply(value);
    onClose();
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
          <motion.button
            type="button"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-black/50"
            aria-label="Dismiss calculator"
            onClick={onClose}
          />

          <FocusTrap active={open}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="amount-calc-title"
              variants={popoverVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springSoft}
              className="relative z-10 w-full max-w-sm rounded-t-3xl rounded-b-2xl border border-border bg-surface-strong p-4 shadow-elevate sm:rounded-2xl"
            >
              <div className="mx-auto -mt-1 mb-3 h-1.5 w-12 shrink-0 rounded-full bg-border/80 sm:hidden" />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    Calculator
                  </p>
                  <h2
                    id="amount-calc-title"
                    className="mt-1 font-display text-base font-bold text-text"
                  >
                    Amount
                  </h2>
                </div>
                <SoftButton
                  onClick={onClose}
                  className="inline-flex min-h-11 min-w-11 h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-canvas/90 text-text-secondary shadow-warm-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="Close calculator"
                >
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </SoftButton>
              </div>

              <div className="mt-4 rounded-xl border border-border/80 bg-canvas/80 px-3.5 py-3">
                <p
                  className="min-h-[1.5rem] break-all text-right font-mono text-lg font-semibold tabular-nums text-text"
                  aria-live="polite"
                >
                  {expression || '0'}
                </p>
                {evaluated.ok && looksLikeAmountExpression(expression) && (
                  <p className="mt-1 text-right text-xs font-semibold tabular-nums text-primary">
                    = {formatResult(evaluated.value)}
                  </p>
                )}
                {error && (
                  <p className="mt-1 text-right text-xs font-medium text-rose-600 dark:text-rose-400">
                    {error}
                  </p>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={backspace}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/70 bg-canvas/70 px-3 text-xs font-semibold text-text-secondary transition hover:border-primary/50 hover:bg-primary/10 hover:text-primary active:scale-95"
                  aria-label="Backspace"
                >
                  <Delete className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Delete
                </button>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {KEYS.flat().map((key) => (
                  <button
                    key={key.label + key.insert}
                    type="button"
                    onClick={() => handleKey(key.insert)}
                    className={`min-h-11 rounded-xl border text-base font-bold transition active:scale-95 ${
                      key.accent
                        ? 'border-primary/40 bg-primary/15 text-primary hover:bg-primary/25'
                        : 'border-border/70 bg-canvas/70 text-text-secondary hover:border-primary/50 hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    {key.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={!canUse}
                onClick={handleUseResult}
                className="mt-4 w-full min-h-11 rounded-xl bg-gradient-to-r from-primary-muted to-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm-sm transition active:scale-[0.98] disabled:opacity-40"
              >
                Use result
              </button>
            </motion.div>
          </FocusTrap>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
