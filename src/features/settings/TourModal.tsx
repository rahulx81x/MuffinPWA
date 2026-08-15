import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CalendarSync,
  ChevronRight,
  LayoutDashboard,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  backdropVariants,
  popoverVariants,
  springSoft,
} from '../../lib/motion';
import { SoftButton } from '../../components/ui/SoftButton';
import { MuffinIcon } from '../../components/ui/MuffinIcon';
import { FocusTrap } from '../../components/atoms/FocusTrap';

interface TourModalProps {
  open: boolean;
  onComplete: (openRecipe?: boolean) => void | Promise<void>;
}

const STEPS = [
  {
    id: 'welcome',
    eyebrow: 'Welcome',
    title: 'Your sheet, baked into an app',
    body: 'Muffin reads Income, Expense, and Investment tabs from your Google Sheet and turns them into a live dashboard on your phone — installable as a PWA. New workbooks get a stable Id column so edits stay accurate even if rows move.',
    Icon: Sparkles,
  },
  {
    id: 'features',
    eyebrow: 'Main features',
    title: 'Home, Insights, Ledger & Settings',
    body: 'Home shows net worth and KPIs. Insights breaks down trends, categories, and what-if planning. Ledger tracks every transaction with quick log. Settings houses themes, typography, amount masking, and rules.',
    Icon: LayoutDashboard,
  },
  {
    id: 'recurring',
    eyebrow: 'Recurring Automation',
    title: 'Monthly bills, SIPs & reminders',
    body: 'Automate regular expenses, salary, and investment SIPs. Muffin prompts you with a smart 1-tap batch logging banner whenever scheduled payments are due in the current month.',
    Icon: CalendarSync,
  },
  {
    id: 'recipe',
    eyebrow: 'Starting Balances Setup',
    title: 'Set your starting balances',
    body: 'Add your initial liquid cash balance and starting investments (FDs, mutual funds, etc.). These seed net worth before sheet transactions and sync across your account via your Google Sheet (Recipe tab).',
    Icon: BookOpen,
  },
] as const;

export function TourModal({ open, onComplete }: TourModalProps) {
  const titleId = useId();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        void finish(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy]);

  async function finish(openRecipe: boolean = false) {
    if (busy) return;
    setBusy(true);
    try {
      await onComplete(openRecipe);
    } finally {
      setBusy(false);
    }
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const StepIcon = current.Icon;

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
            className="absolute inset-0 bg-black/55"
            aria-label="Skip tour"
            disabled={busy}
            onClick={() => void finish(false)}
          />

          <FocusTrap active={open}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              variants={popoverVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springSoft}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface-strong shadow-elevate"
          >
            <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,rgba(var(--accent-rgb),0.22),transparent_65%)] px-5 pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <MuffinIcon className="muffin-icon h-9 w-9 text-primary" />                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                      Setup tour
                    </p>
                    <p className="text-xs text-text-secondary">
                      Step {step + 1} of {STEPS.length}
                    </p>
                  </div>
                </div>
                <SoftButton
                  type="button"
                  onClick={() => void finish(false)}
                  disabled={busy}
                  className="inline-flex min-h-11 min-w-11 h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas/90 text-text-secondary shadow-warm-sm disabled:opacity-60"
                  aria-label="Skip tour"
                  glow={false}
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </SoftButton>
              </div>

              <div className="mt-4 flex gap-1.5" aria-hidden="true">
                {STEPS.map((s, i) => (
                  <span
                    key={s.id}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= step ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="px-5 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-canvas text-primary">
                    <StepIcon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                    {current.eyebrow}
                  </p>
                  <h2
                    id={titleId}
                    className="mt-1 font-display text-lg font-bold tracking-[-0.02em] text-text"
                  >
                    {current.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {current.body}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-5 flex items-center gap-2">
                {step > 0 ? (
                  <SoftButton
                    type="button"
                    onClick={() => {
                      if (isLast) {
                        void finish(false);
                      } else {
                        setStep((s) => Math.max(0, s - 1));
                      }
                    }}
                    disabled={busy}
                    className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-xs font-medium text-text-secondary disabled:opacity-60"
                    glow={false}
                  >
                    {isLast ? 'Skip Setup' : 'Back'}
                  </SoftButton>
                ) : (
                  <SoftButton
                    type="button"
                    onClick={() => void finish(false)}
                    disabled={busy}
                    className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm font-medium text-text-secondary disabled:opacity-60"
                    glow={false}
                  >
                    Skip
                  </SoftButton>
                )}

                <SoftButton
                  type="button"
                  onClick={() => {
                    if (isLast) {
                      void finish(true);
                      return;
                    }
                    setStep((s) => Math.min(STEPS.length - 1, s + 1));
                  }}
                  disabled={busy}
                  className="ml-auto inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
                >
                  {busy ? 'Saving…' : isLast ? 'Set Up Recipe Balances 🍳' : 'Next'}
                  {!busy && !isLast ? (
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                  ) : null}
                </SoftButton>
              </div>
            </div>
          </motion.div>
        </FocusTrap>
      </div>
    )}
  </AnimatePresence>,
    document.body
  );
}
