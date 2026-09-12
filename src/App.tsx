import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { completeTour, unlinkSheet, AuthRequiredError } from './api/client';
import { ToastNotification } from './components/ui/ToastNotification';
import { ConfirmModal } from './components/ui/ConfirmModal';
import { FloatingNav } from './components/ui/FloatingNav';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { MuffinIcon } from './components/ui/MuffinIcon';
import { SkeletonKpiGrid } from './components/atoms/SkeletonKpiGrid';
import { RecurringDueBanner } from './components/molecules/RecurringDueBanner';
import { SignInScreen } from './features/auth/SignInScreen';
import { SheetOnboarding } from './features/auth/SheetOnboarding';
import { HomeView } from './features/home/HomeView';
import { InsightsView } from './features/insights/InsightsView';
import { LedgerView } from './features/ledger/LedgerView';
import {
  ManageTransactionModal,
  type ManageSuccessPayload,
} from './features/ledger/ManageTransactionModal';
import { AboutModal } from './features/settings/AboutModal';
import { HeaderMenu } from './features/settings/HeaderMenu';
import { PrivacyModal } from './features/settings/PrivacyModal';
import { PwaInstallModal } from './features/settings/PwaInstallModal';
import { RecipeModal } from './features/settings/RecipeModal';
import { RecurringManagerModal } from './features/settings/RecurringManagerModal';
import { SettingsView } from './features/settings/SettingsView';
import { TermsModal } from './features/settings/TermsModal';
import { TourModal } from './features/settings/TourModal';
import { UserGuideModal } from './features/settings/UserGuideModal';
import { useAppModals } from './hooks/useAppModals';
import { useAuthSession } from './hooks/useAuthSession';
import { usePlannerStore } from './hooks/usePlannerStore';
import { useRecipeConfig } from './hooks/useRecipeConfig';
import { useRecurringAutomation } from './hooks/useRecurringAutomation';
import { useSheetTransactions } from './hooks/useSheetTransactions';
import { useTheme } from './hooks/useTheme';
import { buildFinancialMetrics, EMPTY_METRICS } from './domain/metrics';
import { pageTransition, pageVariants, springSoft } from './lib/motion';
import type {
  AppTab,
  FinancialMetrics,
  Transaction,
  TransactionType,
} from './domain/types';

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
    currentMonthPlannerTransactions,
    blankPlannerTransactions,
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

  const {
    dueSummary,
    logging: recurringLogging,
    showBanner: showRecurringBanner,
    dismissBanner: dismissRecurringBanner,
    logSingleRule: handleLogSingleRecurringRule,
    logAllDue: handleLogAllDueRecurring,
  } = useRecurringAutomation({
    transactions: sheetTransactions,
    onTransactionsCreated: (txs) => {
      applyTransactions(txs);
    },
    onRefreshTransactions: async () => {
      await refreshTransactions();
    },
    onStatusMessage: (msg) => {
      setStatusMessage(msg);
    },
    onError: (err) => {
      setError(err);
    },
  });

  const recurringBanner = showRecurringBanner ? (
    <RecurringDueBanner
      summary={dueSummary}
      logging={recurringLogging}
      onLogAll={handleLogAllDueRecurring}
      onReview={() => openModal({ kind: 'recurring' })}
      onDismiss={dismissRecurringBanner}
    />
  ) : null;

  const manageMode =
    modal?.kind === 'manage' ? modal.mode : ('add' as const);
  const editingTx =
    modal?.kind === 'manage' ? modal.transaction : null;
  const pendingConfirm =
    modal?.kind === 'confirm' ? modal.pending : null;

  const linkedPlTransaction = useMemo(() => {
    if (
      manageMode !== 'edit' ||
      !editingTx?.rowId ||
      editingTx.type !== 'investment' ||
      editingTx.amount >= 0
    ) {
      return null;
    }
    const expectedId = `mfn_pl_${editingTx.rowId}`;
    return sheetTransactions.find((tx) => tx.rowId === expectedId) ?? null;
  }, [manageMode, editingTx, sheetTransactions]);

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
    setMetrics(buildFinancialMetrics(sheetTransactions, {
      openingBalance: recipeConfig.openingBalance,
      investments: recipeConfig.investments,
    }));
  }, [sheetTransactions, recipeConfig]);

  function openAddModal() {
    openModal({ kind: 'manage', mode: 'add', transaction: null });
  }

  function openEditModal(tx: Transaction) {
    openModal({ kind: 'manage', mode: 'edit', transaction: tx });
  }

  function formatTxCategory(category?: string): string {
    const trimmed = category?.trim();
    if (!trimmed) return '';
    return trimmed.length > 24 ? `“${trimmed.slice(0, 23)}…”` : `“${trimmed}”`;
  }

  function getTxTypeName(type: TransactionType, isRedemption?: boolean): string {
    if (type === 'investment') {
      return isRedemption ? 'Redemption' : 'Investment';
    }
    if (type === 'income') return 'Income';
    return 'Expense';
  }

  async function handleManageSuccess(payload: ManageSuccessPayload) {
    setStatusMessage(null);
    try {
      if (payload.result?.transactions?.length) {
        applyTransactions(payload.result.transactions);
      } else {
        await refreshTransactions();
      }

      const catLabel = formatTxCategory(payload.category);
      const typeName = getTxTypeName(payload.txType, payload.isRedemption);

      if (manageMode === 'add') {
        if (payload.didLogPL) {
          setStatusMessage(
            payload.plType === 'profit'
              ? (catLabel
                  ? `Redemption ${catLabel} logged — Profit entry also added. ✓`
                  : 'Redemption logged — Profit entry also added. ✓')
              : (catLabel
                  ? `Redemption ${catLabel} logged — Loss entry also added. ✓`
                  : 'Redemption logged — Loss entry also added. ✓')
          );
        } else {
          setStatusMessage(
            catLabel
              ? `${typeName} ${catLabel} added. ✓`
              : `${typeName} added. ✓`
          );
        }
      } else {
        if (payload.plAction === 'added') {
          setStatusMessage(
            payload.plType === 'profit'
              ? (catLabel
                  ? `Redemption ${catLabel} updated — Profit entry added. ✓`
                  : 'Redemption updated — Profit entry added. ✓')
              : (catLabel
                  ? `Redemption ${catLabel} updated — Loss entry added. ✓`
                  : 'Redemption updated — Loss entry added. ✓')
          );
        } else if (payload.plAction === 'flipped') {
          setStatusMessage(
            payload.plType === 'profit'
              ? (catLabel
                  ? `Redemption ${catLabel} updated — switched to Profit entry. ✓`
                  : 'Redemption updated — switched to Profit entry. ✓')
              : (catLabel
                  ? `Redemption ${catLabel} updated — switched to Loss entry. ✓`
                  : 'Redemption updated — switched to Loss entry. ✓')
          );
        } else if (payload.plAction === 'updated') {
          setStatusMessage(
            payload.plType === 'profit'
              ? (catLabel
                  ? `Redemption ${catLabel} & Profit updated. ✓`
                  : 'Redemption & Profit updated. ✓')
              : (catLabel
                  ? `Redemption ${catLabel} & Loss updated. ✓`
                  : 'Redemption & Loss updated. ✓')
          );
        } else if (payload.plAction === 'removed') {
          setStatusMessage(
            catLabel
              ? `Redemption ${catLabel} updated — P/L entry removed. ✓`
              : 'Redemption updated — P/L entry removed. ✓'
          );
        } else {
          setStatusMessage(
            catLabel
              ? `${typeName} ${catLabel} updated. ✓`
              : `${typeName} updated. ✓`
          );
        }
      }
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
          // On failure, executeDelete already sets the error state — keep modal open
        } finally {
          setConfirmBusy(false);
          setMutating(false);
        }
      })();
      return;
    }
    void executeUnlinkSheet();
  }

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
  const toastType =
    typeof statusMessage === 'object' && statusMessage !== null
      ? statusMessage.type
      : undefined;

  return (
    <div className="relative min-h-dvh bg-canvas text-text transition-theme">
      <motion.div
        key={themeId}
        aria-hidden="true"
        initial={{ opacity: 0.4, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-10 -top-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-16 top-1/4 h-96 w-96 rounded-full bg-primary-muted/25 blur-3xl" />
        <div className="absolute bottom-12 left-1/3 h-80 w-80 rounded-full bg-primary/18 blur-3xl" />
      </motion.div>

      <header className="sticky top-0 z-30 border-b border-border bg-canvas safe-pt transition-theme">
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
            userName={auth.user.name}
            userEmail={auth.user.email}
            userPicture={auth.user.picture}
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
                  recurringBanner={recurringBanner}
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
                  recurringBanner={recurringBanner}
                />
              ) : activeTab === 'insights' ? (
                <InsightsView
                  transactions={ledgerTransactions}
                  currentMonthPlannerTransactions={currentMonthPlannerTransactions}
                  blankPlannerTransactions={blankPlannerTransactions}
                  onSelectMonth={(mKey) => {
                    setLedgerMonthFilter(mKey);
                    setActiveTab('ledger');
                  }}
                  onAddPlanner={handleAddPlanner}
                  onRemovePlanner={handleRemovePlanner}
                  onClearPlanner={handleClearPlanner}
                  onAddTransaction={openAddModal}
                />
              ) : (
                <SettingsView
                  userName={auth.user.name}
                  userEmail={auth.user.email}
                  userPicture={auth.user.picture}
                  spreadsheetTitle={auth.spreadsheetTitle || undefined}
                  onAbout={() => openModal({ kind: 'about' })}
                  onRecipe={() => openModal({ kind: 'recipe' })}
                  onRecurring={() => openModal({ kind: 'recurring' })}
                  onGuide={() => openModal({ kind: 'guide' })}
                  onTour={() => openModal({ kind: 'tour' })}
                  onPrivacy={() => openModal({ kind: 'privacy' })}
                  onTerms={() => openModal({ kind: 'terms' })}
                  onChangeSheet={handleChangeSheet}
                  onLogout={() => void handleLogout()}
                  onInstallGuide={() => openModal({ kind: 'install' })}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toastText && (
          <ToastNotification
            key={toastText}
            message={toastText}
            type={toastType}
            durationMs={toastUndo ? 8000 : 5000}
            undoFn={toastUndo}
            onDismiss={() => setStatusMessage(null)}
          />
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
      <RecurringManagerModal
        open={modal?.kind === 'recurring'}
        onClose={closeModal}
        onLogSingleRule={handleLogSingleRecurringRule}
        onLogAllDue={handleLogAllDueRecurring}
        logging={recurringLogging}
        transactions={sheetTransactions}
        investmentTypeOptions={investmentTypeOptions}
      />
      <ManageTransactionModal
        open={modal?.kind === 'manage'}
        mode={manageMode}
        transaction={editingTx}
        linkedPlTransaction={linkedPlTransaction}
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
