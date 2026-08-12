import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthMeResponse } from '../api/client';
import {
  AuthRequiredError,
  NeedsSheetError,
  deleteTransaction,
  getTransactions,
} from '../api/client';
import type { Transaction } from '../domain/types';

type SetAuth = React.Dispatch<React.SetStateAction<AuthMeResponse | null>>;

interface UseSheetTransactionsOptions {
  ready: boolean;
  spreadsheetId: string | null | undefined;
  setAuth: SetAuth;
  setStatusMessage: (message: string | null) => void;
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
      [...sheetTransactions].sort((a, b) => a.date.localeCompare(b.date)),
    [sheetTransactions]
  );

  const applyAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof AuthRequiredError) {
        setAuth(null);
        return true;
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
      if (applyAuthError(err)) throw err;
      console.error('Error loading sheet data', err);
      setError(
        "Couldn't load your sheet. Showing overview with configured starting balances."
      );
      setSheetTransactions([]);
      throw err;
    }
  }, [applyAuthError]);

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
        setStatusMessage('Transaction deleted.');
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
