import { useEffect, useMemo, useState } from 'react';
import { AboutModal } from './components/AboutModal';
import { FloatingNav } from './components/FloatingNav';
import { HomeView } from './components/HomeView';
import { LedgerView } from './components/LedgerView';
import { ManageTransactionModal } from './components/ManageTransactionModal';
import { MonthlyView } from './components/MonthlyView';
import { MuffinIcon } from './components/MuffinIcon';
import { PlannerView, toPlannerTransaction } from './components/PlannerView';
import { useMask } from './hooks/useMask';
import { useTheme } from './hooks/useTheme';
import { deleteTransaction, getTransactions } from './lib/api';
import { buildFinancialMetrics, EMPTY_METRICS } from './lib/metrics';
import type {
  AppTab,
  FinancialMetrics,
  NewTransactionInput,
  Transaction,
} from './types';

const PLANNER_STORAGE_KEY = 'plannerTransactions';

function loadPlannerTransactions(): Transaction[] {
  try {
    const stored = localStorage.getItem(PLANNER_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Transaction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePlannerTransactions(items: Transaction[]): void {
  localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(items));
}

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const { masked, toggleMask } = useMask();
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [sheetTransactions, setSheetTransactions] = useState<Transaction[]>(
    []
  );
  const [plannerTransactions, setPlannerTransactions] = useState<
    Transaction[]
  >(() => loadPlannerTransactions());
  const [metrics, setMetrics] = useState<FinancialMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageMode, setManageMode] = useState<'add' | 'edit'>('add');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [mutating, setMutating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const ledgerTransactions = useMemo(
    () =>
      [...sheetTransactions].sort((a, b) => a.date.localeCompare(b.date)),
    [sheetTransactions]
  );

  const investmentTypeOptions = useMemo(() => {
    const labels = new Set<string>();
    for (const tx of sheetTransactions) {
      if (tx.type !== 'investment') continue;
      const label = (tx.investmentType || tx.category || '').trim();
      if (label) labels.add(label);
    }
    return Array.from(labels);
  }, [sheetTransactions]);

  async function refreshTransactions() {
    setError(null);
    try {
      const transactions = await getTransactions();
      setSheetTransactions(transactions);
    } catch (err) {
      console.error('Error loading sheet data', err);
      setError(
        "Couldn't load your sheet. Showing overview with configured starting balances."
      );
      setSheetTransactions([]);
      throw err;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadFinances() {
      setLoading(true);
      setError(null);

      try {
        const transactions = await getTransactions();
        if (cancelled) return;
        setSheetTransactions(transactions);
      } catch (err) {
        console.error('Error loading sheet data', err);
        if (!cancelled) {
          setError(
            "Couldn't load your sheet. Showing overview with configured starting balances."
          );
          setSheetTransactions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFinances();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMetrics(buildFinancialMetrics(sheetTransactions));
  }, [sheetTransactions]);

  function handleAddPlanner(input: NewTransactionInput) {
    setPlannerTransactions((prev) => {
      const updated = [...prev, toPlannerTransaction(input)];
      savePlannerTransactions(updated);
      return updated;
    });
  }

  function handleRemovePlanner(id: string) {
    setPlannerTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      savePlannerTransactions(updated);
      return updated;
    });
  }

  function handleClearPlanner() {
    setPlannerTransactions([]);
    savePlannerTransactions([]);
  }

  function openAddModal() {
    setManageMode('add');
    setEditingTx(null);
    setManageOpen(true);
  }

  function openEditModal(tx: Transaction) {
    setManageMode('edit');
    setEditingTx(tx);
    setManageOpen(true);
  }

  async function handleManageSuccess() {
    setStatusMessage(null);
    try {
      await refreshTransactions();
      setStatusMessage(
        manageMode === 'add' ? 'Transaction added.' : 'Transaction updated.'
      );
    } catch {
      setStatusMessage('Saved to sheet, but refresh failed. Pull to reload.');
    }
  }

  async function handleDelete(tx: Transaction) {
    if (tx.tabName == null || tx.rowIndex == null) return;
    const label = tx.category || 'this transaction';
    if (!window.confirm(`Delete ${label}?`)) return;

    setMutating(true);
    setStatusMessage(null);
    setError(null);

    try {
      await deleteTransaction(tx.tabName, tx.rowIndex);
      await refreshTransactions();
      setStatusMessage('Transaction deleted.');
    } catch (err) {
      console.error('Failed to delete transaction', err);
      setError(
        err instanceof Error ? err.message : 'Could not delete transaction.'
      );
    } finally {
      setMutating(false);
    }
  }

  const headerBtnClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-strong text-text-secondary shadow-warm-sm transition-colors duration-200 active:scale-95';

  return (
    <div className="min-h-dvh bg-canvas text-text transition-colors duration-200">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-md safe-pt transition-colors duration-200">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <MuffinIcon className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-500" />
              <h1 className="font-display text-[1.2rem] font-bold leading-none tracking-[-0.03em] text-text">
                <span className="bg-gradient-to-r from-amber-700 to-amber-500 bg-clip-text text-transparent dark:from-amber-400 dark:to-amber-300">
                  Muffin
                </span>
              </h1>
            </div>
            <p className="mt-1 flex items-center gap-1.5 pl-[2.125rem] text-[9px] font-medium uppercase tracking-[0.14em] text-text-muted">
              <span
                className="inline-block h-1 w-1 shrink-0 rounded-full bg-primary shadow-[0_0_0_2px] shadow-primary/20"
                aria-hidden="true"
              />
              Synced from your Google Sheet
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMask}
              className={headerBtnClass}
              title={masked ? 'Show amounts' : 'Hide amounts'}
              aria-label={masked ? 'Show amounts' : 'Hide amounts'}
              aria-pressed={masked}
            >
              {masked ? (
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
                    d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                  />
                </svg>
              ) : (
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
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className={headerBtnClass}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={
                isDark ? 'Switch to light mode' : 'Switch to dark mode'
              }
              aria-pressed={isDark}
            >
              {isDark ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path
                    strokeLinecap="round"
                    d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                  />
                </svg>
              ) : (
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
                    d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z"
                  />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className={headerBtnClass}
              title="About"
              aria-label="About this app"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16v-5M12 8h.01"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-3 main-bottom-pad">
        {error && (
          <div
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition-colors duration-200 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
            role="status"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-text-muted transition-colors duration-200">
            Baking your money muffins…
          </div>
        ) : activeTab === 'home' ? (
          <HomeView metrics={metrics} transactions={sheetTransactions} />
        ) : activeTab === 'planner' ? (
          <PlannerView
            sheetTransactions={sheetTransactions}
            plannerTransactions={plannerTransactions}
            onAdd={handleAddPlanner}
            onRemove={handleRemovePlanner}
            onClear={handleClearPlanner}
          />
        ) : activeTab === 'ledger' ? (
          <LedgerView
            transactions={ledgerTransactions}
            onEdit={openEditModal}
            onDelete={handleDelete}
            mutating={mutating}
          />
        ) : (
          <MonthlyView transactions={ledgerTransactions} />
        )}
      </main>

      {statusMessage && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[calc(env(safe-area-inset-top,0px)+3.75rem)]"
          role="status"
          aria-live="polite"
        >
          <div
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-amber-200/90 bg-surface-strong/95 px-4 py-3 text-sm text-amber-950 shadow-warm backdrop-blur-md transition-colors duration-200 dark:border-amber-800/60 dark:bg-surface/95 dark:text-amber-100"
            style={{ animation: 'toastIn 180ms ease-out' }}
          >
            <p className="min-w-0 flex-1 leading-snug">{statusMessage}</p>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-amber-800/80 transition-colors duration-200 active:scale-95 hover:bg-amber-50 dark:text-amber-200/90 dark:hover:bg-amber-950/60"
              aria-label="Dismiss notification"
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
        </div>
      )}

      <FloatingNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAdd={openAddModal}
        showAdd={!loading}
      />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ManageTransactionModal
        open={manageOpen}
        mode={manageMode}
        transaction={editingTx}
        investmentTypeOptions={investmentTypeOptions}
        onClose={() => setManageOpen(false)}
        onSuccess={handleManageSuccess}
      />
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
