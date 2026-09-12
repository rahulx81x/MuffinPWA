import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  createTransaction,
  deleteTransaction,
  AuthRequiredError,
  updateTransaction,
  type MutationResult,
} from '../../api/client';
import { backdropVariants, popoverVariants, springSoft } from '../../lib/motion';
import { TAB_BY_TYPE, newRowId } from '@shared';
import type {
  SheetRowData,
  Transaction,
  TransactionType,
} from '../../domain/types';
import { FocusTrap } from '../../components/atoms/FocusTrap';
import {
  TransactionForm,
  type TransactionFormData,
} from '../../components/molecules/TransactionForm';
import { SoftButton } from '../../components/ui/SoftButton';

export interface ManageSuccessPayload {
  result: MutationResult;
  didLogPL: boolean;
  plType?: 'profit' | 'loss';
  plAction?: 'added' | 'updated' | 'flipped' | 'removed';
  category: string;
  txType: TransactionType;
  isRedemption: boolean;
}

interface ManageTransactionModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  transaction?: Transaction | null;
  linkedPlTransaction?: Transaction | null;
  /** Sheet transactions to derive top category chips. */
  transactions?: Transaction[];
  /** Existing investment-type labels from sheet transactions. */
  investmentTypeOptions?: string[];
  onClose: () => void;
  onSuccess: (payload: ManageSuccessPayload) => Promise<void> | void;
}

const closeBtnClass =
  'inline-flex min-h-11 min-w-11 h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-canvas/90 text-text-secondary shadow-warm-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50';

function buildRowData(
  type: TransactionType,
  date: string,
  category: string,
  amount: number,
  comment: string,
  investmentType: string,
  rowId?: string
): SheetRowData {
  const idFields = rowId ? { Id: rowId } : {};
  if (type === 'investment') {
    return {
      ...idFields,
      Date: date,
      Category: category,
      Amount: amount,
      'Investment Type': investmentType,
      Comment: comment,
    };
  }
  return {
    ...idFields,
    Date: date,
    Category: category,
    Amount: amount,
    Comment: comment,
  };
}

export function ManageTransactionModal({
  open,
  mode,
  transaction,
  linkedPlTransaction,
  transactions = [],
  investmentTypeOptions = [],
  onClose,
  onSuccess,
}: ManageTransactionModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedLinkedPlTx = useMemo(() => {
    if (linkedPlTransaction !== undefined) return linkedPlTransaction;
    if (
      mode !== 'edit' ||
      !transaction?.rowId ||
      transaction.type !== 'investment' ||
      transaction.amount >= 0
    ) {
      return null;
    }
    const expectedPlId = `mfn_pl_${transaction.rowId}`;
    return transactions.find((tx) => tx.rowId === expectedPlId) ?? null;
  }, [linkedPlTransaction, mode, transaction, transactions]);

  const initialValues = useMemo(() => {
    if (mode === 'edit' && transaction) {
      return {
        date: transaction.date,
        type: transaction.type,
        category: transaction.category,
        amountText: String(transaction.amount),
        comment: transaction.comment || '',
        investmentType: transaction.investmentType || '',
        redemptionPL: resolvedLinkedPlTx
          ? {
              type:
                resolvedLinkedPlTx.type === 'income'
                  ? ('profit' as const)
                  : ('loss' as const),
              amount: Math.abs(resolvedLinkedPlTx.amount),
            }
          : null,
      };
    }
    return undefined;
  }, [mode, transaction, resolvedLinkedPlTx]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving, onClose]);

  async function handleFormSubmit(formData: TransactionFormData) {
    setSaving(true);
    setError(null);

    const tabName = TAB_BY_TYPE[formData.type];
    const isInvestment = formData.type === 'investment';
    const isRedemption = isInvestment && formData.amount < 0;

    try {
      let result: MutationResult;
      let effectiveInvestmentRowId: string | undefined;

      if (mode === 'add') {
        if (isInvestment) {
          effectiveInvestmentRowId = newRowId();
        }
        const rowData = buildRowData(
          formData.type,
          formData.date,
          formData.category,
          formData.amount,
          formData.comment,
          formData.investmentType,
          effectiveInvestmentRowId
        );
        result = await createTransaction(tabName, rowData);
      } else if (transaction) {
        if (!transaction.tabName || transaction.rowIndex == null) {
          throw new Error('Missing sheet location for this transaction.');
        }

        effectiveInvestmentRowId =
          transaction.rowId || (isInvestment ? newRowId() : undefined);

        const rowData = buildRowData(
          formData.type,
          formData.date,
          formData.category,
          formData.amount,
          formData.comment,
          formData.investmentType,
          effectiveInvestmentRowId
        );

        const expected = {
          date: transaction.date,
          category: transaction.category,
          amount: transaction.amount,
        };

        const targetTab = TAB_BY_TYPE[formData.type];
        const sameTab = transaction.tabName === targetTab;

        if (sameTab) {
          result = await updateTransaction(
            transaction.tabName,
            transaction.rowIndex,
            rowData,
            expected,
            transaction.rowId
          );
        } else {
          await deleteTransaction(
            transaction.tabName,
            transaction.rowIndex,
            expected,
            transaction.rowId
          );
          result = await createTransaction(tabName, rowData);
        }
      } else {
        throw new Error('Missing transaction data.');
      }

      let didLogPL = false;
      let plType: 'profit' | 'loss' | undefined;
      let plAction: 'added' | 'updated' | 'flipped' | 'removed' | undefined;

      if (mode === 'add') {
        if (
          isRedemption &&
          effectiveInvestmentRowId &&
          formData.redemptionPL &&
          formData.redemptionPL.amount > 0
        ) {
          const isProfit = formData.redemptionPL.type === 'profit';
          const plTab = isProfit ? 'Income' : 'Expense';
          const plRowType = isProfit ? 'income' : 'expense';
          const suffix = isProfit ? 'Profit' : 'Loss';
          const plCategory = `${formData.category.trim()} - ${suffix}`;
          const plComment = formData.comment?.trim()
            ? `${formData.comment.trim()} - ${suffix}`
            : plCategory;

          const plRowId = `mfn_pl_${effectiveInvestmentRowId}`;
          const plRowData = buildRowData(
            plRowType,
            formData.date,
            plCategory,
            formData.redemptionPL.amount,
            plComment,
            '',
            plRowId
          );
          result = await createTransaction(plTab, plRowData);
          didLogPL = true;
          plType = formData.redemptionPL.type;
          plAction = 'added';
        }
      } else if (transaction) {
        const expectedPlId = effectiveInvestmentRowId
          ? `mfn_pl_${effectiveInvestmentRowId}`
          : undefined;

        const currentPlTx = expectedPlId
          ? result.transactions.find((tx) => tx.rowId === expectedPlId) ??
            resolvedLinkedPlTx
          : null;

        const hasNewPL =
          isRedemption &&
          Boolean(formData.redemptionPL && formData.redemptionPL.amount > 0);

        if (hasNewPL && formData.redemptionPL) {
          const isProfit = formData.redemptionPL.type === 'profit';
          const newPlTab = isProfit ? 'Income' : 'Expense';
          const newPlRowType = isProfit ? 'income' : 'expense';
          const suffix = isProfit ? 'Profit' : 'Loss';
          const plCategory = `${formData.category.trim()} - ${suffix}`;
          const plComment = formData.comment?.trim()
            ? `${formData.comment.trim()} - ${suffix}`
            : plCategory;
          const plRowId = expectedPlId || `mfn_pl_${newRowId()}`;
          const plRowData = buildRowData(
            newPlRowType,
            formData.date,
            plCategory,
            formData.redemptionPL.amount,
            plComment,
            '',
            plRowId
          );

          if (currentPlTx && currentPlTx.tabName && currentPlTx.rowIndex != null) {
            if (currentPlTx.tabName === newPlTab) {
              const plExpected = {
                date: currentPlTx.date,
                category: currentPlTx.category,
                amount: currentPlTx.amount,
              };
              result = await updateTransaction(
                currentPlTx.tabName,
                currentPlTx.rowIndex,
                plRowData,
                plExpected,
                currentPlTx.rowId
              );
              plAction = 'updated';
            } else {
              // Profit edited to loss or vice versa:
              // Delete from old sheet tab, create on new sheet tab
              const plExpected = {
                date: currentPlTx.date,
                category: currentPlTx.category,
                amount: currentPlTx.amount,
              };
              await deleteTransaction(
                currentPlTx.tabName,
                currentPlTx.rowIndex,
                plExpected,
                currentPlTx.rowId
              );
              result = await createTransaction(newPlTab, plRowData);
              plAction = 'flipped';
            }
          } else {
            result = await createTransaction(newPlTab, plRowData);
            plAction = 'added';
          }

          didLogPL = true;
          plType = formData.redemptionPL.type;
        } else if (
          currentPlTx &&
          currentPlTx.tabName &&
          currentPlTx.rowIndex != null
        ) {
          // P/L entry was removed or changed to par
          const plExpected = {
            date: currentPlTx.date,
            category: currentPlTx.category,
            amount: currentPlTx.amount,
          };
          result = await deleteTransaction(
            currentPlTx.tabName,
            currentPlTx.rowIndex,
            plExpected,
            currentPlTx.rowId
          );
          plAction = 'removed';
        }
      }

      await onSuccess({
        result,
        didLogPL,
        plType,
        plAction,
        category: formData.category.trim(),
        txType: formData.type,
        isRedemption,
      });
      onClose();
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setError('Session expired — please sign in again.');
        return;
      }
      console.error('Failed to save transaction', err);
      setError(
        err instanceof Error ? err.message : 'Could not save transaction.'
      );
    } finally {
      setSaving(false);
    }
  }

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
            aria-label="Dismiss transaction dialog"
            onClick={onClose}
            disabled={saving}
          />

          <FocusTrap active={open}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="manage-tx-title"
              variants={popoverVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springSoft}
              className="relative z-10 max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl rounded-b-2xl border border-border bg-surface-strong p-5 shadow-elevate sm:rounded-2xl"
            >
              <div className="mx-auto -mt-1 mb-3 h-1.5 w-12 shrink-0 rounded-full bg-border/80 sm:hidden" />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    {mode === 'add' ? 'New' : 'Edit'}
                  </p>
                  <h2
                    id="manage-tx-title"
                    className="mt-1 font-display text-base font-bold text-text"
                  >
                    {mode === 'add' ? 'Add transaction' : 'Edit transaction'}
                  </h2>
                </div>
                <SoftButton
                  onClick={onClose}
                  disabled={saving}
                  className={closeBtnClass}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </SoftButton>
              </div>

              <div className="mt-4">
                <TransactionForm
                  key={
                    transaction
                      ? `${transaction.id}_${resolvedLinkedPlTx?.id ?? 'nopl'}`
                      : 'new-tx'
                  }
                  initialValues={initialValues}
                  transactions={transactions}
                  investmentTypeOptions={investmentTypeOptions}
                  submitLabel={mode === 'add' ? 'Add transaction' : 'Save changes'}
                  cancelLabel="Cancel"
                  onCancel={onClose}
                  onSubmit={handleFormSubmit}
                  busy={saving}
                  externalError={error}
                  layout="modal"
                />
              </div>
            </motion.div>
          </FocusTrap>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
