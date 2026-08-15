import { useCallback, useMemo, useState } from 'react';
import { TAB_BY_TYPE } from '@shared';
import type { SheetRowData, Transaction } from '../domain/types';
import { createTransaction } from '../api/client';
import { calculateRecurringDueSummary, getRecurringRuleLogDate } from '../domain/recurring';
import { useRecipeConfig } from './useRecipeConfig';
import type { RecurringRule } from '@shared';

interface UseRecurringAutomationOptions {
  onTransactionsCreated?: (transactions: Transaction[]) => void;
  onRefreshTransactions?: () => Promise<unknown>;
  onStatusMessage?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useRecurringAutomation({
  onTransactionsCreated,
  onRefreshTransactions,
  onStatusMessage,
  onError,
}: UseRecurringAutomationOptions = {}) {
  const { recurringRules, markRulesLogged } = useRecipeConfig();
  const [logging, setLogging] = useState(false);
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
      setLogging(true);
      try {
        const tabName = TAB_BY_TYPE[rule.type];
        const logDate = getRecurringRuleLogDate(rule);

        const rowData: SheetRowData =
          rule.type === 'investment'
            ? {
                Date: logDate,
                Category: rule.category,
                Amount: rule.amount,
                'Investment Type': rule.investmentType || '',
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
        setLogging(false);
      }
    },
    [dueSummary.monthKey, markRulesLogged, onTransactionsCreated, onRefreshTransactions, onStatusMessage, onError]
  );

  const logAllDue = useCallback(async (): Promise<boolean> => {
    const due = dueSummary.dueItems;
    if (due.length === 0) return true;

    setLogging(true);
    try {
      let latestTransactions: Transaction[] = [];
      const loggedIds: string[] = [];

      for (const rule of due) {
        const tabName = TAB_BY_TYPE[rule.type];
        const logDate = getRecurringRuleLogDate(rule);

        const rowData: SheetRowData =
          rule.type === 'investment'
            ? {
                Date: logDate,
                Category: rule.category,
                Amount: rule.amount,
                'Investment Type': rule.investmentType || '',
                Comment: rule.comment || rule.name,
              }
            : {
                Date: logDate,
                Category: rule.category,
                Amount: rule.amount,
                Comment: rule.comment || rule.name,
              };

        const res = await createTransaction(tabName, rowData);
        loggedIds.push(rule.id);
        if (res.transactions?.length) {
          latestTransactions = res.transactions;
        }
      }

      await markRulesLogged(loggedIds, dueSummary.monthKey);

      if (latestTransactions.length && onTransactionsCreated) {
        onTransactionsCreated(latestTransactions);
      } else if (onRefreshTransactions) {
        await onRefreshTransactions();
      }

      onStatusMessage?.(`Logged ${due.length} recurring item${due.length === 1 ? '' : 's'}.`);
      return true;
    } catch (err) {
      console.error('Failed to batch log recurring transactions:', err);
      onError?.(
        err instanceof Error ? err.message : 'Failed to log some recurring items.'
      );
      return false;
    } finally {
      setLogging(false);
    }
  }, [dueSummary.dueItems, dueSummary.monthKey, markRulesLogged, onTransactionsCreated, onRefreshTransactions, onStatusMessage, onError]);

  return {
    dueSummary,
    logging,
    showBanner,
    dismissBanner,
    logSingleRule,
    logAllDue,
  };
}
