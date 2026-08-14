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
import { TAB_BY_TYPE } from '@shared';
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

interface ManageTransactionModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  transaction?: Transaction | null;
  /** Sheet transactions to derive top category chips. */
  transactions?: Transaction[];
  /** Existing investment-type labels from sheet transactions. */
  investmentTypeOptions?: string[];
  onClose: () => void;
  onSuccess: (result?: MutationResult) => Promise<void> | void;
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
  transactions = [],
  investmentTypeOptions = [],
  onClose,
  onSuccess,
}: ManageTransactionModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues = useMemo(() => {
    if (mode === 'edit' && transaction) {
      return {
        date: transaction.date,
        type: transaction.type,
        category: transaction.category,
        amountText: String(transaction.amount),
        comment: transaction.comment || '',
        investmentType: transaction.investmentType || '',
      };
    }
    return undefined;
  }, [mode, transaction]);

  const dynamicCategoryChips = useMemo(() => {
    if (!transactions || !transactions.length) return [];
    const counts: Record<string, number> = {};
    for (const tx of transactions) {
      const cat = tx.category?.trim();
      if (!cat) continue;
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat)
      .slice(0, 8);
  }, [transactions]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);

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
    const rowData = buildRowData(
      formData.type,
      formData.date,
      formData.category,
      formData.amount,
      formData.comment,
      formData.investmentType,
      transaction?.rowId
    );

    try {
      let result: MutationResult;

      if (mode === 'add') {
        result = await createTransaction(tabName, rowData);
      } else if (transaction) {
        if (!transaction.tabName || transaction.rowIndex == null) {
          throw new Error('Missing sheet location for this transaction.');
        }

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

      await onSuccess(result);
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
                  key={transaction ? transaction.id : 'new-tx'}
                  initialValues={initialValues}
                  categoryChips={dynamicCategoryChips}
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
