import { useCallback, useMemo, useRef, useState } from 'react';
import { TAB_BY_TYPE } from '@shared';
import type { SheetRowData, Transaction } from '../domain/types';
import { createTransaction } from '../api/client';
import { calculateRecurringDueSummary, getRecurringRuleLogDate } from '../domain/recurring';
import { useRecipeConfig } from './useRecipeConfig';
import type { RecurringRule } from '@shared';

interface UseRecurringAutomationOptions {
  transactions?: Transaction[];
  onTransactionsCreated?: (transactions: Transaction[]) => void;
  onRefreshTransactions?: () => Promise<unknown>;
  onStatusMessage?: (message: string) => void;
  onError?: (message: string) => void;
}

function matchesExistingTransaction(
  rule: RecurringRule,
  logDate: string,
  transactions: Transaction[]
): boolean {
  const monthKey = logDate.slice(0, 7); // 'YYYY-MM'
  const ruleCat = rule.category.toLowerCase().trim();

  return transactions.some((tx) => {
    if (tx.type !== rule.type) return false;
    if (Math.abs(tx.amount - rule.amount) > 0.01) return false;
    if (tx.date.slice(0, 7) !== monthKey) return false;

    const txCat = (tx.category || '').toLowerCase().trim();

    // Category + type + amount + month must all match (strong duplicate signal)
    return txCat === ruleCat;
  });
}

export function useRecurringAutomation({
  transactions = [],
  onTransactionsCreated,
  onRefreshTransactions,
  onStatusMessage,
  onError,
}: UseRecurringAutomationOptions = {}) {
  const { recurringRules, markRulesLogged } = useRecipeConfig();
  const [logging, setLogging] = useState(false);
  const inFlightIdsRef = useRef<Set<string>>(new Set());
  const [sessionDismissedMonth, setSessionDismissedMonth] = useState<string | null>(null);

  const dueSummary = useMemo(() => {
    return calculateRecurringDueSummary(recurringRules);
  }, [recurringRules]);

  const isDismissed = sessionDismissedMonth === dueSummary.monthKey;

  const dismissBanner = useCallback(() => {
    setSessionDismissedMonth(dueSummary.monthKey);
  }, [dueSummary.monthKey]);

  const showBanner =
    !isDismissed &&
    dueSummary.dueItems.length > 0 &&
    dueSummary.dueItems.some((item) => item.autoPrompt !== false);

  const logSingleRule = useCallback(
    async (rule: RecurringRule): Promise<boolean> => {
      if (inFlightIdsRef.current.has(rule.id)) return false;
      inFlightIdsRef.current.add(rule.id);
      setLogging(true);
      try {
        const tabName = TAB_BY_TYPE[rule.type];
        const logDate = getRecurringRuleLogDate(rule);

        // Pre-check for duplicate transaction in this billing cycle
        if (matchesExistingTransaction(rule, logDate, transactions)) {
          await markRulesLogged([rule.id], dueSummary.monthKey);
          onStatusMessage?.(`"${rule.name}" already logged for this month.`);
          return true;
        }

        const rowData: SheetRowData =
          rule.type === 'investment'
            ? {
                Date: logDate,
                Category: rule.category,
                Amount: rule.amount,
                'Investment Type': rule.investmentType || rule.category,
                Comment: rule.comment || rule.name,
              }
            : {
                Date: logDate,
                Category: rule.category,
                Amount: rule.amount,
                Comment: rule.comment || rule.name,
              };

        const res = await createTransaction(tabName, rowData);
        await markRulesLogged([rule.id], dueSummary.monthKey);

        if (res.transactions?.length && onTransactionsCreated) {
          onTransactionsCreated(res.transactions);
        } else if (onRefreshTransactions) {
          await onRefreshTransactions();
        }

        onStatusMessage?.(`Logged "${rule.name}" (${logDate})`);
        return true;
      } catch (err) {
        console.error('Failed to log recurring transaction:', err);
        onError?.(
          err instanceof Error ? err.message : `Failed to log "${rule.name}"`
        );
        return false;
      } finally {
        inFlightIdsRef.current.delete(rule.id);
        setLogging(false);
      }
    },
    [transactions, dueSummary.monthKey, markRulesLogged, onTransactionsCreated, onRefreshTransactions, onStatusMessage, onError]
  );

  const logAllDue = useCallback(async (): Promise<boolean> => {
    const due = dueSummary.dueItems;
    if (due.length === 0) return true;

    setLogging(true);
    const successfullyLoggedIds: string[] = [];
    let actuallyCreatedCount = 0;
    let latestTransactions: Transaction[] = [];

    try {
      for (const rule of due) {
        const tabName = TAB_BY_TYPE[rule.type];
        const logDate = getRecurringRuleLogDate(rule);

        // Check if an identical transaction is already present
        if (matchesExistingTransaction(rule, logDate, transactions)) {
          successfullyLoggedIds.push(rule.id);
          continue;
        }

        const rowData: SheetRowData =
          rule.type === 'investment'
            ? {
                Date: logDate,
                Category: rule.category,
                Amount: rule.amount,
                'Investment Type': rule.investmentType || rule.category,
                Comment: rule.comment || rule.name,
              }
            : {
                Date: logDate,
                Category: rule.category,
                Amount: rule.amount,
                Comment: rule.comment || rule.name,
              };

        const res = await createTransaction(tabName, rowData);
        successfullyLoggedIds.push(rule.id);
        actuallyCreatedCount++;

        if (res.transactions?.length) {
          latestTransactions = res.transactions;
        }
      }

      if (successfullyLoggedIds.length > 0) {
        await markRulesLogged(successfullyLoggedIds, dueSummary.monthKey);
      }

      if (latestTransactions.length && onTransactionsCreated) {
        onTransactionsCreated(latestTransactions);
      } else if (onRefreshTransactions) {
        await onRefreshTransactions();
      }

      const skipped = successfullyLoggedIds.length - actuallyCreatedCount;
      const msg = skipped > 0
        ? `Logged ${actuallyCreatedCount} recurring item${actuallyCreatedCount === 1 ? '' : 's'} (${skipped} already existed).`
        : `Logged ${actuallyCreatedCount} recurring item${actuallyCreatedCount === 1 ? '' : 's'}.`;
      onStatusMessage?.(msg);
      return true;
    } catch (err) {
      console.error('Failed to batch log recurring transactions:', err);
      // Even if subsequent items failed, persist the ones that succeeded
      if (successfullyLoggedIds.length > 0) {
        try {
          await markRulesLogged(successfullyLoggedIds, dueSummary.monthKey);
        } catch {
          // ignore background update error
        }
      }
      onError?.(
        err instanceof Error ? err.message : 'Failed to log some recurring items.'
      );
      return false;
    } finally {
      setLogging(false);
    }
  }, [dueSummary.dueItems, dueSummary.monthKey, transactions, markRulesLogged, onTransactionsCreated, onRefreshTransactions, onStatusMessage, onError]);

  return {
    dueSummary,
    logging,
    showBanner,
    dismissBanner,
    logSingleRule,
    logAllDue,
  };
}
