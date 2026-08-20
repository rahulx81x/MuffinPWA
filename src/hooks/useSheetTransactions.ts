import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthMeResponse } from '../api/client';
import {
  AuthRequiredError,
  NeedsSheetError,
  createTransaction,
  deleteTransaction,
  getTransactions,
} from '../api/client';
import type { StatusMessage } from './useAuthSession';
import type { Transaction } from '../domain/types';

type SetAuth = React.Dispatch<React.SetStateAction<AuthMeResponse | null>>;

interface UseSheetTransactionsOptions {
  ready: boolean;
  spreadsheetId: string | null | undefined;
  setAuth: SetAuth;
  setStatusMessage: (message: StatusMessage | null) => void;
}

export function useSheetTransactions({
  ready,
  spreadsheetId,
  setAuth,
  setStatusMessage,
}: UseSheetTransactionsOptions) {
  const [sheetTransactions, setSheetTransactions] = useState<Transaction[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const ledgerTransactions = useMemo(
    () =>
      [...sheetTransactions].sort((a, b) => b.date.localeCompare(a.date)),
    [sheetTransactions]
  );

  const applyAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof AuthRequiredError) {
        setAuth(null);
        return true;
      }
      if (err instanceof NeedsSheetError) {
        // After create/link the client may already have a spreadsheetId while
        // Blobs is briefly stale. Never wipe a known link — that bounces the
        // user back to onboarding and a second Create makes another Drive file.
        setAuth((prev) => {
          if (!prev) return prev;
          if (prev.spreadsheetId && !prev.needsSheet) return prev;
          return {
            ...prev,
            needsSheet: true,
            spreadsheetId: null,
            spreadsheetTitle: null,
          };
        });
        return true;
      }
      return false;
    },
    [setAuth]
  );

  const refreshTransactions = useCallback(async () => {
    setError(null);
    try {
      const transactions = await getTransactions();
      setSheetTransactions(transactions);
      return transactions;
    } catch (err) {
      if (err instanceof NeedsSheetError && spreadsheetId) {
        setError(
          "Your sheet is linked, but data hasn't loaded yet. Try again in a moment."
        );
        throw err;
      }
      if (applyAuthError(err)) throw err;
      console.error('Error loading sheet data', err);
      setError(
        "Couldn't load your sheet. Showing overview with configured starting balances."
      );
      setSheetTransactions([]);
      throw err;
    }
  }, [applyAuthError, spreadsheetId]);

  const applyTransactions = useCallback((transactions: Transaction[]) => {
    setSheetTransactions(transactions);
    setError(null);
  }, []);

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
        if (cancelled) return;
        if (err instanceof NeedsSheetError && spreadsheetId) {
          // Linked in client, but server briefly disagrees — keep the shell.
          console.warn('Sheet link not visible yet; keeping client link', err);
          setError(
            "Your sheet is linked, but data hasn't loaded yet. Pull to refresh in a moment."
          );
          setSheetTransactions([]);
          return;
        }
        if (applyAuthError(err)) return;
        console.error('Error loading sheet data', err);
        setError(
          "Couldn't load your sheet. Showing overview with configured starting balances."
        );
        setSheetTransactions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFinances();
    return () => {
      cancelled = true;
    };
  }, [ready, spreadsheetId, applyAuthError]);

  const executeDelete = useCallback(
    async (tx: Transaction) => {
      if (tx.tabName == null || tx.rowIndex == null) return false;

      setMutating(true);
      setError(null);
      try {
        const result = await deleteTransaction(
          tx.tabName,
          tx.rowIndex,
          {
            date: tx.date,
            category: tx.category,
            amount: tx.amount,
          },
          tx.rowId
        );
        if (result.transactions.length) {
          applyTransactions(result.transactions);
        } else {
          await refreshTransactions();
        }

        const tabName = tx.tabName;
        const rowData =
          tx.type === 'investment'
            ? {
                Date: tx.date,
                Category: tx.category,
                Amount: tx.amount,
                'Investment Type': tx.investmentType || '',
                Comment: tx.comment || '',
                ...(tx.rowId ? { Id: tx.rowId } : {}),
              }
            : {
                Date: tx.date,
                Category: tx.category,
                Amount: tx.amount,
                Comment: tx.comment || '',
                ...(tx.rowId ? { Id: tx.rowId } : {}),
              };

        setStatusMessage({
          text: 'Transaction deleted.',
          undoFn: async () => {
            try {
              setMutating(true);
              const restoreResult = await createTransaction(tabName, rowData);
              if (restoreResult.transactions.length) {
                applyTransactions(restoreResult.transactions);
              } else {
                await refreshTransactions();
              }
              setStatusMessage('Transaction restored.');
            } catch (err) {
              console.error('Failed to undo delete', err);
              setError('Could not restore transaction.');
            } finally {
              setMutating(false);
            }
          },
        });
        return true;
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          setAuth(null);
          setStatusMessage('Signed out — please sign in again.');
          return false;
        }
        console.error('Failed to delete transaction', err);
        setError(
          err instanceof Error ? err.message : 'Could not delete transaction.'
        );
        return false;
      } finally {
        setMutating(false);
      }
    },
    [applyTransactions, refreshTransactions, setAuth, setStatusMessage]
  );

  return {
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
    applyAuthError,
  };
}
