import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AboutModal } from './components/AboutModal';
import { FloatingNav } from './components/FloatingNav';
import { HeaderMenu } from './components/HeaderMenu';
import { HomeView } from './components/HomeView';
import { LedgerView } from './components/LedgerView';
import { ManageTransactionModal } from './components/ManageTransactionModal';
import { MonthlyView } from './components/MonthlyView';
import { PlannerView, toPlannerTransaction } from './components/PlannerView';
import { PrivacyModal } from './components/PrivacyModal';
import { RecipeModal } from './components/RecipeModal';
import { SheetOnboarding } from './components/SheetOnboarding';
import { ShimmerSkeleton } from './components/ShimmerSkeleton';
import { TermsModal } from './components/TermsModal';
import { SignInScreen } from './components/SignInScreen';
import { SoftButton } from './components/SoftButton';
import { TourModal } from './components/TourModal';
import { UserGuideModal } from './components/UserGuideModal';
import { useRecipeConfig } from './hooks/useRecipeConfig';
import { useTheme } from './hooks/useTheme';
import {
  clearRecipeConfig,
  getRecipeConfig,
  hasMeaningfulRecipe,
  hydrateRecipeConfig,
} from './config';
import {
  AuthRequiredError,
  NeedsSheetError,
  checkSessionHealth,
  completeTour,
  deleteTransaction,
  getMe,
  getTransactions,
  logout,
  saveRecipe,
  unlinkSheet,
  type AuthMeResponse,
} from './lib/api';
import { buildFinancialMetrics, EMPTY_METRICS } from './lib/metrics';
import { pageTransition, pageVariants, springSoft } from './lib/motion';
import type {
  AppTab,
  FinancialMetrics,
  NewTransactionInput,
  Transaction,
} from './types';

const PLANNER_STORAGE_KEY = 'plannerTransactions';
const SESSION_PROBE_MIN_INTERVAL_MS = 30_000;

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

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  denied: 'Google sign-in was denied.',
  missing_code: 'Missing authorization code. Try signing in again.',
  invalid_state: 'Invalid OAuth state. Try signing in again.',
  invalid_method: 'Invalid sign-in method.',
  failed: 'Google sign-in failed. Try again.',
};

const OAUTH_QUERY_KEYS = [
  'authError',
  'code',
  'state',
  'scope',
  'error',
  'error_description',
  'prompt',
  'authuser',
  'hd',
  'session_state',
] as const;

/** Strip OAuth junk from the address bar and map short auth error codes. */
function readAuthErrorFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('authError');
    const message = raw
      ? AUTH_ERROR_MESSAGES[raw] ||
        (raw.length > 120 ? AUTH_ERROR_MESSAGES.failed : raw)
      : null;

    let dirty = Boolean(raw);
    for (const key of OAUTH_QUERY_KEYS) {
      if (params.has(key)) {
        params.delete(key);
        dirty = true;
      }
    }

    const onFunctionPath = window.location.pathname.includes(
      '/.netlify/functions/'
    );
    if (dirty || onFunctionPath) {
      const path = onFunctionPath ? '/' : window.location.pathname;
      const query = params.toString();
      window.history.replaceState(
        {},
        '',
        `${path}${query ? `?${query}` : ''}`
      );
    }

    return message;
  } catch {
    return null;
  }
}

export default function App() {
  const { themeId } = useTheme();
  const { config: recipeConfig } = useRecipeConfig();
  const [authBooting, setAuthBooting] = useState(true);
  const [auth, setAuth] = useState<AuthMeResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(() =>
    readAuthErrorFromUrl()
  );
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [sheetTransactions, setSheetTransactions] = useState<Transaction[]>(
    []
  );
  const [plannerTransactions, setPlannerTransactions] = useState<
    Transaction[]
  >(() => loadPlannerTransactions());
  const [metrics, setMetrics] = useState<FinancialMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageMode, setManageMode] = useState<'add' | 'edit'>('add');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [mutating, setMutating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const needsSheet = Boolean(auth && auth.needsSheet);
  const ready = Boolean(auth && !auth.needsSheet);

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
    for (const row of recipeConfig.investments) {
      const label = row.type.trim();
      if (label) labels.add(label);
    }
    return Array.from(labels);
  }, [sheetTransactions, recipeConfig.investments]);

  async function refreshAuth() {
    const me = await getMe();
    setAuth(me);
    if (me) await syncRecipeFromAuth(me);
    return me;
  }

  async function syncRecipeFromAuth(me: AuthMeResponse) {
    if (me.recipe) {
      hydrateRecipeConfig(me.recipe);
      return;
    }

    // One-time migrate: push existing localStorage recipe into Blobs.
    const local = getRecipeConfig();
    if (!hasMeaningfulRecipe(local)) return;
    try {
      const saved = await saveRecipe(local);
      hydrateRecipeConfig(saved);
    } catch (err) {
      console.warn('Could not migrate local recipe to Blobs', err);
    }
  }

  async function refreshTransactions() {
    setError(null);
    try {
      const transactions = await getTransactions();
      setSheetTransactions(transactions);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setAuth(null);
        throw err;
      }
      if (err instanceof NeedsSheetError) {
        setAuth((prev) =>
          prev
            ? {
                ...prev,
                needsSheet: true,
                spreadsheetId: null,
                spreadsheetTitle: null,
              }
            : prev
        );
        throw err;
      }
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

    async function boot() {
      setAuthBooting(true);
      try {
        const me = await getMe();
        if (cancelled) return;
        setAuth(me);
        if (me) await syncRecipeFromAuth(me);
      } catch (err) {
        console.error('Auth bootstrap failed', err);
        if (!cancelled) {
          setAuth(null);
          setAuthError(
            err instanceof Error
              ? err.message
              : 'Could not check sign-in status.'
          );
        }
      } finally {
        if (!cancelled) setAuthBooting(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !auth?.showTour) return;
    setTourOpen(true);
  }, [ready, auth?.showTour]);

  useEffect(() => {
    if (!ready) {
      setSheetTransactions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadFinances() {
      setLoading(true);
      setError(null);
      try {
        const transactions = await getTransactions();
        if (cancelled) return;
        setSheetTransactions(transactions);
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          if (!cancelled) setAuth(null);
          return;
        }
        if (err instanceof NeedsSheetError) {
          if (!cancelled) {
            setAuth((prev) =>
              prev
                ? {
                    ...prev,
                    needsSheet: true,
                    spreadsheetId: null,
                    spreadsheetTitle: null,
                  }
                : prev
            );
          }
          return;
        }
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
  }, [ready, auth?.spreadsheetId]);

  useEffect(() => {
    if (!ready || loading) return;

    let lastProbeAt = Date.now();
    let hiddenAt: number | null = null;
    let probing = false;

    async function probeSession(force = false) {
      if (document.visibilityState !== 'visible') return;
      if (probing) return;
      const now = Date.now();
      if (!force && now - lastProbeAt < SESSION_PROBE_MIN_INTERVAL_MS) return;

      probing = true;
      try {
        await checkSessionHealth();
        lastProbeAt = Date.now();
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          setAuth(null);
          setStatusMessage('Signed out — please sign in again.');
          return;
        }
        console.warn('[muffin] Session health probe failed', err);
      } finally {
        probing = false;
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      const awayMs = hiddenAt == null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      void probeSession(awayMs >= SESSION_PROBE_MIN_INTERVAL_MS);
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        void probeSession(true);
      }
    }

    function onFocus() {
      const awayMs = hiddenAt == null ? 0 : Date.now() - hiddenAt;
      if (awayMs >= SESSION_PROBE_MIN_INTERVAL_MS) {
        void probeSession(true);
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', onFocus);
    };
  }, [ready, loading]);

  useEffect(() => {
    setMetrics(buildFinancialMetrics(sheetTransactions));
  }, [sheetTransactions, recipeConfig]);

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
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setStatusMessage('Signed out — please sign in again.');
        return;
      }
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
      await deleteTransaction(tx.tabName, tx.rowIndex, {
        category: tx.category,
        amount: tx.amount,
      });
      await refreshTransactions();
      setStatusMessage('Transaction deleted.');
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setAuth(null);
        setStatusMessage('Signed out — please sign in again.');
        return;
      }
      console.error('Failed to delete transaction', err);
      setError(
        err instanceof Error ? err.message : 'Could not delete transaction.'
      );
    } finally {
      setMutating(false);
    }
  }

  async function handleTourComplete(openRecipe: boolean = false) {
    try {
      await completeTour();
    } catch (err) {
      console.warn('Could not persist tour completion', err);
    }
    setTourOpen(false);
    setAuth((prev) => (prev ? { ...prev, showTour: false } : prev));
    if (openRecipe) {
      setRecipeOpen(true);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.warn('Logout request failed', err);
    }
    clearRecipeConfig();
    setAuth(null);
    setSheetTransactions([]);
    setStatusMessage(null);
  }

  async function handleChangeSheet() {
    if (
      !window.confirm(
        'Unlink this spreadsheet from Muffin on this account? You can link another one next.'
      )
    ) {
      return;
    }
    try {
      await unlinkSheet();
      await refreshAuth();
      setSheetTransactions([]);
      setStatusMessage('Spreadsheet unlinked.');
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setAuth(null);
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not unlink sheet.');
    }
  }

  const headerBtnClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-surface-strong/90 text-text-secondary shadow-warm-sm backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  if (authBooting) {
    return (
      <div className="relative min-h-dvh bg-canvas py-8 text-text transition-theme">
        <ShimmerSkeleton />
      </div>
    );
  }

  if (!auth) {
    return <SignInScreen authError={authError} />;
  }

  if (needsSheet) {
    return (
      <SheetOnboarding
        userName={auth.user.name || auth.user.email}
        onLinked={(info) => {
          setAuth({
            ...auth,
            spreadsheetId: info.spreadsheetId,
            spreadsheetTitle: info.spreadsheetTitle,
            needsSheet: false,
            showTour: Boolean(auth.showTour),
          });
          setStatusMessage(
            info.spreadsheetTitle
              ? `Linked “${info.spreadsheetTitle}”.`
              : 'Spreadsheet linked.'
          );
        }}
      />
    );
  }

  return (
    <div className="relative min-h-dvh bg-canvas text-text transition-theme">
      <motion.div
        key={themeId}
        aria-hidden="true"
        initial={{ opacity: 0.3, scale: 0.95 }}
        animate={{ opacity: 0.8, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-primary-muted/15 blur-3xl" />
        <div className="absolute bottom-10 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </motion.div>

      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/80 backdrop-blur-xl safe-pt transition-theme">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-2 sm:max-w-3xl lg:max-w-5xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-[1.2rem] font-bold leading-none tracking-[-0.03em] text-text">
                <span className="bg-gradient-to-r from-primary-muted to-primary bg-clip-text text-transparent">
                  Muffin
                </span>
              </h1>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-text-muted">
              <span
                className="inline-block h-1 w-1 shrink-0 rounded-full bg-primary shadow-[0_0_0_2px] shadow-primary/20"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => void handleChangeSheet()}
                className="truncate text-left outline-none hover:text-text-secondary"
                title="Change linked spreadsheet"
              >
                {auth.spreadsheetTitle || 'Synced from your Google Sheet'}
              </button>
            </p>
          </div>
          <HeaderMenu
            buttonClassName={headerBtnClass}
            onAbout={() => setAboutOpen(true)}
            onRecipe={() => setRecipeOpen(true)}
            onGuide={() => setGuideOpen(true)}
            onPrivacy={() => setPrivacyOpen(true)}
            onTerms={() => setTermsOpen(true)}
            onLogout={() => void handleLogout()}
          />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-lg px-4 pt-3 main-bottom-pad sm:max-w-3xl lg:max-w-5xl">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={springSoft}
              className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-warm-sm backdrop-blur-sm transition-theme dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
              role="status"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="py-16 text-center text-sm text-text-muted"
            >
              Baking your money muffins…
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              {activeTab === 'home' ? (
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {statusMessage && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={springSoft}
            className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[calc(env(safe-area-inset-top,0px)+3.75rem)]"
            role="status"
            aria-live="polite"
          >
            <div className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-primary/25 bg-surface-strong/95 px-4 py-3 text-sm text-text shadow-elevate backdrop-blur-xl">
              <p className="min-w-0 flex-1 leading-snug">{statusMessage}</p>
              <SoftButton
                onClick={() => setStatusMessage(null)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-text-secondary outline-none hover:bg-surface-muted/70"
                aria-label="Dismiss notification"
                glow={false}
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </SoftButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAdd={openAddModal}
        showAdd={!loading}
      />
      <AboutModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        onPrivacy={() => setPrivacyOpen(true)}
        onTerms={() => setTermsOpen(true)}
      />
      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
      <UserGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        onReplayTour={() => setTourOpen(true)}
      />
      <TourModal open={tourOpen} onComplete={handleTourComplete} />
      <RecipeModal
        open={recipeOpen}
        onClose={() => setRecipeOpen(false)}
        spreadsheetId={auth.spreadsheetId}
        spreadsheetTitle={auth.spreadsheetTitle}
        investmentTypeSuggestions={investmentTypeOptions}
      />
      <ManageTransactionModal
        open={manageOpen}
        mode={manageMode}
        transaction={editingTx}
        transactions={sheetTransactions}
        investmentTypeOptions={investmentTypeOptions}
        onClose={() => setManageOpen(false)}
        onSuccess={handleManageSuccess}
      />
    </div>
  );
}
