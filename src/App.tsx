import { useEffect, useMemo, useState } from 'react';
import { AboutModal } from './components/AboutModal';
import { FloatingNav } from './components/FloatingNav';
import { HomeView } from './components/HomeView';
import { LedgerView } from './components/LedgerView';
import { MonthlyView } from './components/MonthlyView';
import { PlannerView, toPlannerTransaction } from './components/PlannerView';
import { useMask } from './hooks/useMask';
import { useTheme } from './hooks/useTheme';
import { buildFinancialMetrics, EMPTY_METRICS } from './lib/metrics';
import { fetchSheetTransactions } from './lib/parseSheet';
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

  const ledgerTransactions = useMemo(
    () =>
      [...sheetTransactions].sort((a, b) => a.date.localeCompare(b.date)),
    [sheetTransactions]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFinances() {
      setLoading(true);
      setError(null);

      try {
        const transactions = await fetchSheetTransactions();
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

  return (
    <div className="min-h-dvh bg-zinc-100 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-zinc-100/90 backdrop-blur-md safe-pt transition-colors duration-300 dark:border-zinc-800/80 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-1.5">
          <div className="min-w-0">
            <h1 className="font-display text-[1.15rem] font-extrabold leading-none tracking-[-0.04em] text-zinc-900 dark:text-zinc-50">
              My{' '}
              <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">
                Finances
              </span>
            </h1>
            <p className="mt-0.5 flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              <span
                className="inline-block h-1 w-1 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_2px] shadow-emerald-500/15 dark:bg-emerald-400 dark:shadow-emerald-400/20"
                aria-hidden="true"
              />
              Synced from your Google Sheet
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMask}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            role="status"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Loading your finances…
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
          <LedgerView transactions={ledgerTransactions} />
        ) : (
          <MonthlyView transactions={ledgerTransactions} />
        )}
      </main>

      <FloatingNav activeTab={activeTab} onTabChange={setActiveTab} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
