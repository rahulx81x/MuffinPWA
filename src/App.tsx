import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import { completeTour, unlinkSheet, AuthRequiredError } from './api/client';
import type { MutationResult } from './api/client';
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
import { ManageTransactionModal } from './features/ledger/ManageTransactionModal';
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
import { buildFinancialMetrics, EMPTY_METRICS } from './domain/metrics';
import { pageTransition, pageVariants } from './lib/motion';
import type { AppTab, FinancialMetrics, Transaction } from './domain/types';

export default function App() {
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

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.default',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MuffinIcon className="muffin-icon h-7 w-7 text-primary" />
              <Typography
                variant="h6"
                component="h1"
                sx={{
                  fontWeight: 800,
                  color: 'primary.main',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                Muffin
              </Typography>
            </Box>
            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                }}
                aria-hidden="true"
              />
              <Button
                size="small"
                onClick={handleChangeSheet}
                sx={{
                  p: 0,
                  minWidth: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 1.1,
                  color: 'text.secondary',
                  justifyContent: 'flex-start',
                  '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
                }}
              >
                {auth.spreadsheetTitle || 'Synced from your Google Sheet'}
              </Button>
            </Box>
          </Box>

          <HeaderMenu
            userName={auth.user.name}
            userEmail={auth.user.email}
            userPicture={auth.user.picture}
            onLogout={() => void handleLogout()}
          />
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="lg"
        sx={{
          pt: 2,
          pb: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))',
          px: { xs: 2, sm: 3 },
        }}
      >
        <AnimatePresence mode="wait">
          {error && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                {error}
              </Alert>
            </Box>
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
      </Container>

      <Snackbar
        open={Boolean(toastText)}
        autoHideDuration={4000}
        onClose={() => setStatusMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          sx={{
            width: '100%',
            borderRadius: 3,
            boxShadow: 4,
            alignItems: 'center',
          }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {toastUndo && (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    void toastUndo();
                  }}
                  sx={{ fontWeight: 700 }}
                >
                  Undo
                </Button>
              )}
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={() => setStatusMessage(null)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          {toastText}
        </Alert>
      </Snackbar>

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
    </Box>
  );
}

