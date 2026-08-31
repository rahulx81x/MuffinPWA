import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

import {
  createTransaction,
  deleteTransaction,
  AuthRequiredError,
  updateTransaction,
  type MutationResult,
} from '../../api/client';
import { TAB_BY_TYPE } from '@shared';
import type {
  SheetRowData,
  Transaction,
  TransactionType,
} from '../../domain/types';
import {
  TransactionForm,
  type TransactionFormData,
} from '../../components/molecules/TransactionForm';

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

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
  }, [open]);

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

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
            {mode === 'add' ? 'New' : 'Edit'}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {mode === 'add' ? 'Add transaction' : 'Edit transaction'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={saving} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 1.5 }}>
        <TransactionForm
          key={transaction ? transaction.id : 'new-tx'}
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
      </DialogContent>
    </Dialog>
  );
}

