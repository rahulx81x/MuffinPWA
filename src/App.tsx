import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { completeTour, unlinkSheet, AuthRequiredError } from './api/client';
import type { MutationResult } from './api/client';
import { SoftButton } from './components/ui/SoftButton';
import { ConfirmModal } from './components/ui/ConfirmModal';
import { FloatingNav } from './components/ui/FloatingNav';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { MuffinIcon } from './components/ui/MuffinIcon';
import { SkeletonKpiGrid } from './components/atoms/SkeletonKpiGrid';
import { SignInScreen } from './features/auth/SignInScreen';
import { SheetOnboarding } from './features/auth/SheetOnboarding';
import { HomeView } from './features/home/HomeView';
import { LedgerView } from './features/ledger/LedgerView';
import { ManageTransactionModal } from './features/ledger/ManageTransactionModal';
import { MonthlyView } from './features/monthly/MonthlyView';
import { PlannerView } from './features/planner/PlannerView';
import { AboutModal } from './features/settings/AboutModal';
import { HeaderMenu } from './features/settings/HeaderMenu';
import { PrivacyModal } from './features/settings/PrivacyModal';
import { PwaInstallModal } from './features/settings/PwaInstallModal';
import { RecipeModal } from './features/settings/RecipeModal';
import { TermsModal } from './features/settings/TermsModal';
import { TourModal } from './features/settings/TourModal';
import { UserGuideModal } from './features/settings/UserGuideModal';
import { useAppModals } from './hooks/useAppModals';
import { useAuthSession } from './hooks/useAuthSession';
import { usePlannerStore } from './hooks/usePlannerStore';
import { useRecipeConfig } from './hooks/useRecipeConfig';
import { useSheetTransactions } from './hooks/useSheetTransactions';
import { useTheme } from './hooks/useTheme';
import { buildFinancialMetrics, EMPTY_METRICS } from './domain/metrics';
import { pageTransition, pageVariants, springSoft } from './lib/motion';
import type { AppTab, FinancialMetrics, Transaction } from './domain/types';

export default function App() {
  const { themeId } = useTheme();
  const { config: recipeConfig } = useRecipeConfig();
  const {
    authBooting,
    auth,
    setAuth,
    authError,
    needsSheet,
    ready,
    statusMessage,
    setStatusMessage,
    refreshAuth,
    handleLogout,
  } = useAuthSession();

  const {
    sheetTransactions,
    setSheetTransactions,
    ledgerTransactions,
    loading,
    error,
    setError,
    mutating,
    setMutating,
    refreshTransactions,
    applyTransactions,
    executeDelete,
  } = useSheetTransactions({
    ready,
    spreadsheetId: auth?.spreadsheetId,
    setAuth,
    setStatusMessage,
  });

  const {
    plannerTransactions,
    handleAddPlanner,
    handleRemovePlanner,
    handleClearPlanner,
  } = usePlannerStore();

  const {
    modal,
    openModal,
    closeModal,
    confirmBusy,
    setConfirmBusy,
  } = useAppModals();

  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [ledgerMonthFilter, setLedgerMonthFilter] = useState('');
  const [metrics, setMetrics] = useState<FinancialMetrics>(EMPTY_METRICS);

  const manageMode =
    modal?.kind === 'manage' ? modal.mode : ('add' as const);
  const editingTx =
    modal?.kind === 'manage' ? modal.transaction : null;
  const pendingConfirm =
    modal?.kind === 'confirm' ? modal.pending : null;

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

  useEffect(() => {
    if (!ready || !auth?.showTour) return;
    openModal({ kind: 'tour' });
  }, [ready, auth?.showTour, openModal]);

  useEffect(() => {
    setMetrics(buildFinancialMetrics(sheetTransactions));
  }, [sheetTransactions, recipeConfig]);

  function openAddModal() {
    openModal({ kind: 'manage', mode: 'add', transaction: null });
  }

  function openEditModal(tx: Transaction) {
    openModal({ kind: 'manage', mode: 'edit', transaction: tx });
  }

  async function handleManageSuccess(result?: MutationResult) {
    setStatusMessage(null);
    try {
      if (result?.transactions?.length) {
        applyTransactions(result.transactions);
      } else {
        await refreshTransactions();
      }
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

  function handleDelete(tx: Transaction) {
    if (tx.tabName == null || tx.rowIndex == null) return;
    const label = tx.category || 'this transaction';
    openModal({
      kind: 'confirm',
      pending: { kind: 'delete', tx, label },
    });
  }

  async function handleTourComplete(openRecipe: boolean = false) {
    try {
      await completeTour();
    } catch (err) {
      console.warn('Could not persist tour completion', err);
    }
    setAuth((prev) => (prev ? { ...prev, showTour: false } : prev));
    if (openRecipe) {
      openModal({ kind: 'recipe' });
    } else {
      closeModal();
    }
  }

  function handleChangeSheet() {
    openModal({ kind: 'confirm', pending: { kind: 'unlink' } });
  }

  async function executeUnlinkSheet() {
    setConfirmBusy(true);
    setError(null);
    try {
      await unlinkSheet();
      await refreshAuth();
      setSheetTransactions([]);
      closeModal();
      setStatusMessage('Spreadsheet unlinked.');
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setAuth(null);
        closeModal();
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not unlink sheet.');
      closeModal();
    } finally {
      setConfirmBusy(false);
    }
  }

  function handleConfirmAction() {
    if (!pendingConfirm) return;
    if (pendingConfirm.kind === 'delete') {
      void (async () => {
        setConfirmBusy(true);
        setMutating(true);
        try {
          const ok = await executeDelete(pendingConfirm.tx);
          if (ok) closeModal();
          else closeModal();
        } finally {
          setConfirmBusy(false);
          setMutating(false);
        }
      })();
      return;
    }
    void executeUnlinkSheet();
  }

  const headerBtnClass =
    'inline-flex min-h-10 min-w-10 h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-surface-strong/90 text-text-secondary shadow-warm-sm backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  if (authBooting) {
    return <LoadingScreen />;
  }

  if (!auth) {
    return <SignInScreen authError={authError} />;
  }

  if (needsSheet) {
    return (
      <SheetOnboarding
        userName={auth.user.name || auth.user.email}
        onLinked={(info) => {
          setAuth((prev) =>
            prev
              ? {
                  ...prev,
                  spreadsheetId: info.spreadsheetId,
                  spreadsheetTitle: info.spreadsheetTitle,
                  needsSheet: false,
                }
              : prev
          );
          setStatusMessage(
            info.spreadsheetTitle
              ? `Linked “${info.spreadsheetTitle}”.`
              : 'Spreadsheet linked.'
          );
        }}
      />
    );
  }

  const toastText =
    typeof statusMessage === 'string'
      ? statusMessage
      : statusMessage?.text ?? null;
  const toastUndo =
    typeof statusMessage === 'object' && statusMessage !== null
      ? statusMessage.undoFn
      : undefined;

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
              <MuffinIcon className="muffin-icon h-7 w-7 text-primary" />
              <h1 className="font-display text-[1.2rem] font-bold leading-none tracking-[-0.03em] text-text">
                <span className="bg-gradient-to-r from-primary-muted to-primary bg-clip-text text-transparent">
                  Muffin
                </span>
              </h1>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
              <span
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_2px] shadow-primary/20"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={handleChangeSheet}
                className="truncate text-left outline-none hover:text-text-secondary"
                title="Change linked spreadsheet"
              >
                {auth.spreadsheetTitle || 'Synced from your Google Sheet'}
              </button>
            </p>
          </div>
          <HeaderMenu
            buttonClassName={headerBtnClass}
            userName={auth.user.name}
            userEmail={auth.user.email}
            userPicture={auth.user.picture}
            onAbout={() => openModal({ kind: 'about' })}
            onRecipe={() => openModal({ kind: 'recipe' })}
            onGuide={() => openModal({ kind: 'guide' })}
            onPrivacy={() => openModal({ kind: 'privacy' })}
            onTerms={() => openModal({ kind: 'terms' })}
            onLogout={() => void handleLogout()}
            onInstallGuide={() => openModal({ kind: 'install' })}
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
            >
              <SkeletonKpiGrid />
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
                <HomeView
                  metrics={metrics}
                  transactions={sheetTransactions}
                  userName={auth.user.name || auth.user.email}
                  onRefresh={async () => {
                    await refreshTransactions();
                  }}
                  onAddTransaction={openAddModal}
                />
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
                  initialMonthFilter={ledgerMonthFilter}
                  onRefresh={async () => {
                    await refreshTransactions();
                  }}
                  onAddTransaction={openAddModal}
                />
              ) : (
                <MonthlyView
                  transactions={ledgerTransactions}
                  onSelectMonth={(mKey) => {
                    setLedgerMonthFilter(mKey);
                    setActiveTab('ledger');
                  }}
                  onAddTransaction={openAddModal}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toastText && (
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
            <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-primary/25 bg-surface-strong/95 px-4 py-3 text-sm text-text shadow-elevate backdrop-blur-xl">
              <p className="min-w-0 flex-1 leading-snug">{toastText}</p>
              {toastUndo && (
                <button
                  type="button"
                  onClick={() => {
                    void toastUndo();
                  }}
                  className="shrink-0 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/25 active:scale-95"
                >
                  Undo
                </button>
              )}
              <SoftButton
                onClick={() => setStatusMessage(null)}
                className="inline-flex min-h-8 min-w-8 h-8 w-8 shrink-0 items-center justify-center rounded-xl text-text-secondary outline-none hover:bg-surface-muted/70"
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
        open={modal?.kind === 'about'}
        onClose={closeModal}
        onPrivacy={() => openModal({ kind: 'privacy' })}
        onTerms={() => openModal({ kind: 'terms' })}
      />
      <PrivacyModal
        open={modal?.kind === 'privacy'}
        onClose={closeModal}
      />
      <TermsModal open={modal?.kind === 'terms'} onClose={closeModal} />
      <PwaInstallModal
        open={modal?.kind === 'install'}
        onClose={closeModal}
      />
      <UserGuideModal
        isOpen={modal?.kind === 'guide'}
        onClose={closeModal}
        onReplayTour={() => openModal({ kind: 'tour' })}
      />
      <TourModal
        open={modal?.kind === 'tour'}
        onComplete={handleTourComplete}
      />
      <RecipeModal
        open={modal?.kind === 'recipe'}
        onClose={closeModal}
        spreadsheetId={auth.spreadsheetId}
        spreadsheetTitle={auth.spreadsheetTitle}
        investmentTypeSuggestions={investmentTypeOptions}
      />
      <ManageTransactionModal
        open={modal?.kind === 'manage'}
        mode={manageMode}
        transaction={editingTx}
        transactions={sheetTransactions}
        investmentTypeOptions={investmentTypeOptions}
        onClose={closeModal}
        onSuccess={handleManageSuccess}
      />
      <ConfirmModal
        open={modal?.kind === 'confirm'}
        title={
          pendingConfirm?.kind === 'unlink'
            ? 'Unlink spreadsheet?'
            : 'Delete transaction?'
        }
        message={
          pendingConfirm?.kind === 'unlink'
            ? 'Unlink this spreadsheet from Muffin on this account? You can link another one next.'
            : `Delete ${pendingConfirm?.label ?? 'this transaction'}?`
        }
        confirmLabel={
          pendingConfirm?.kind === 'unlink' ? 'Unlink' : 'Delete'
        }
        variant={
          pendingConfirm?.kind === 'delete' ? 'destructive' : 'default'
        }
        busy={confirmBusy}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          if (!confirmBusy) closeModal();
        }}
      />
    </div>
  );
}
