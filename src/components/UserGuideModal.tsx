import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  ChevronRight,
  Database,
  HelpCircle,
  PieChart,
  RotateCcw,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { evaluateAmountExpression } from '../lib/evaluateAmount';
import { backdropVariants, popoverVariants } from '../lib/motion';
import { MuffinIcon } from './MuffinIcon';
import { SoftButton } from './SoftButton';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayTour?: () => void;
}

export function UserGuideModal({
  isOpen,
  onClose,
  onReplayTour,
}: UserGuideModalProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'sheets' | 'calculator' | 'charts' | 'faq'
  >('overview');

  // Interactive Calculator Demo State
  const [calcInput, setCalcInput] = useState('1000 * 18%');
  const calcResult = evaluateAmountExpression(calcInput);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          variants={popoverVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border/80 bg-surface-strong shadow-elevate"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                <MuffinIcon className="muffin-icon h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-text">
                  Interactive User Guide
                </h2>
                <p className="text-xs text-text-muted">
                  Learn the essentials here — open the full web guide for tabs, Recipe,
                  install, and deeper FAQs.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-surface-muted/50 text-text-muted transition hover:bg-surface-muted hover:text-text"
              aria-label="Close user guide"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Bar */}
          <div className="flex border-b border-border/60 bg-surface/50 px-3 py-2 overflow-x-auto gap-1.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'overview'
                  ? 'bg-primary text-on-primary shadow-warm-sm'
                  : 'text-text-muted hover:bg-surface-muted hover:text-text'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sheets')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'sheets'
                  ? 'bg-primary text-on-primary shadow-warm-sm'
                  : 'text-text-muted hover:bg-surface-muted hover:text-text'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Sheet Setup
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'calculator'
                  ? 'bg-primary text-on-primary shadow-warm-sm'
                  : 'text-text-muted hover:bg-surface-muted hover:text-text'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              Calculator Demo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('charts')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'charts'
                  ? 'bg-primary text-on-primary shadow-warm-sm'
                  : 'text-text-muted hover:bg-surface-muted hover:text-text'
              }`}
            >
              <PieChart className="h-3.5 w-3.5" />
              Touch Charts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'faq'
                  ? 'bg-primary text-on-primary shadow-warm-sm'
                  : 'text-text-muted hover:bg-surface-muted hover:text-text'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              FAQ
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-text">
                    <h3 className="font-display font-bold text-primary mb-1 flex items-center gap-2">
                      <MuffinIcon className="muffin-icon h-4 w-4 text-primary" /> Welcome to Muffin!
                    </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Muffin connects your Google Sheet to a mobile dashboard. Log income,
                    expenses, and investments with category chips, amount math, and live
                    net-worth tracking. Installable as a PWA — balances always load from
                    your sheet over the network.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="cozy-card p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <Tag className="h-4 w-4" /> Quick 1-Tap Category Badges
                    </div>
                    <p className="text-xs text-text-muted">
                      Top frequent categories are auto-extracted as color-coded chips for instant form entry.
                    </p>
                  </div>

                  <div className="cozy-card p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <Calculator className="h-4 w-4" /> BODMAS & Percent Math
                    </div>
                    <p className="text-xs text-text-muted">
                      Type arithmetic expressions like <code className="text-primary font-bold">1000 * 18%</code> directly into amount fields.
                    </p>
                  </div>
                </div>

                {onReplayTour && (
                  <div className="pt-2">
                    <SoftButton
                      type="button"
                      onClick={() => {
                        onClose();
                        onReplayTour();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-primary"
                    >
                      <RotateCcw className="h-4 w-4" /> Replay First-Run Tour
                    </SoftButton>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sheets' && (
              <div className="space-y-4">
                <h3 className="font-display text-sm font-bold text-text">
                  Google Sheet Workbook Structure
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  One Google Sheet workbook with three fixed tabs. Prefer{' '}
                  <code className="text-primary">YYYY-MM-DD</code> dates and keep the header
                  row. Sample CSVs: <code className="text-primary">templates/</code>.
                </p>

                <div className="space-y-2 text-xs font-mono">
                  <div className="rounded-xl border border-border/80 bg-surface p-3 space-y-1">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      📄 Income Tab
                    </div>
                    <div className="text-text-muted">
                      Headers: Date | Category | Amount | Comment
                    </div>
                    <div className="text-text font-sans">
                      Sample: <code>2026-08-01, Salary, 75000, Paycheck</code>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-surface p-3 space-y-1">
                    <div className="font-bold text-rose-600 dark:text-rose-400">
                      📄 Expense Tab
                    </div>
                    <div className="text-text-muted">
                      Headers: Date | Category | Amount | Comment
                    </div>
                    <div className="text-text font-sans">
                      Sample: <code>2026-08-02, Groceries, 3500, Supermarket</code>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-surface p-3 space-y-1">
                    <div className="font-bold text-violet-600 dark:text-violet-400">
                      📄 Investment Tab
                    </div>
                    <div className="text-text-muted">
                      Headers: Date | Category | Amount | Investment Type | Comment
                    </div>
                    <div className="text-text font-sans">
                      Sample: <code>2026-08-05, SIP, 10000, Mutual Fund, Index</code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'calculator' && (
              <div className="space-y-4">
                <h3 className="font-display text-sm font-bold text-text flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" /> Live Calculator Interactive Playground
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Type math in Amount fields or open the calculator button beside them.
                  Try formulas below (same evaluator as the app):
                </p>

                <div className="cozy-card p-4 space-y-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-text-secondary">
                      Expression Input
                    </span>
                    <input
                      type="text"
                      value={calcInput}
                      onChange={(e) => setCalcInput(e.target.value)}
                      placeholder="e.g. 1200 + 350 * 2 or 1000 * 18%"
                      className="field-cozy text-sm font-mono"
                    />
                  </label>

                  <div className="flex items-center justify-between rounded-xl bg-surface p-3 border border-border/60">
                    <span className="text-xs font-bold text-text-muted">Evaluated Output</span>
                    <span className="font-display text-lg font-bold text-primary tabular-nums">
                      {calcResult && calcResult.ok ? calcResult.value : 'Invalid Formula'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCalcInput('1000 * 18%')}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-muted"
                  >
                    1000 * 18%
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcInput('1500 + 250 * 4')}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-muted"
                  >
                    1500 + 250 * 4
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcInput('50000 - 15%')}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-muted"
                  >
                    50000 - 15%
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'charts' && (
              <div className="space-y-4">
                <h3 className="font-display text-sm font-bold text-text">
                  Interactive Donut & Trend Graphs
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  On the Home view, tapping KPI tiles opens interactive charts:
                </p>

                <div className="space-y-2">
                  <div className="cozy-card p-3.5 space-y-1">
                    <h4 className="text-xs font-bold text-text flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-primary" /> Donut Slice Expansion
                    </h4>
                    <p className="text-xs text-text-muted">
                      Tap any slice on the portfolio breakdown pie chart to expand the slice with a glowing outline and show exact category amounts in the center callout.
                    </p>
                  </div>

                  <div className="cozy-card p-3.5 space-y-1">
                    <h4 className="text-xs font-bold text-text flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-emerald-500" /> Line Trend Guidelines & MoM Tooltips
                    </h4>
                    <p className="text-xs text-text-muted">
                      Tap data points on monthly trend lines to reveal crosshair guidelines, active aura rings, and Month-over-Month (MoM) growth cards.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/80 bg-surface p-3.5 space-y-1">
                  <h4 className="text-xs font-bold text-text">
                    Is my financial data private?
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Yes. Transactions stay in your personal Google Sheet. Muffin does not
                    sell data or train AI models on it. See Privacy Policy and Terms in the
                    gear menu.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-surface p-3.5 space-y-1">
                  <h4 className="text-xs font-bold text-text">
                    How is Provident Fund (PF) tracked?
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Investment rows tagged Provident Fund / PF / EPF / PPF appear on Home →
                    More Details. They are excluded from counted investment, the breakup
                    pie, and net worth.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-surface p-3.5 space-y-1">
                  <h4 className="text-xs font-bold text-text">
                    Does Muffin work fully offline?
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed">
                    The app shell can install as a PWA. Live KPIs and ledger data need a
                    network connection to your sheet. Planner what-if rows stay on this
                    device only.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 bg-surface/50 px-5 py-3.5 flex items-center justify-between text-xs">
            <a
              href="/guide.html"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary hover:underline"
            >
              Open Full User Guide ↗
            </a>
            <SoftButton type="button" onClick={onClose} className="px-4 py-1.5 font-semibold">
              Got it
            </SoftButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
