import { useCallback, useState } from 'react';
import { createId } from '../domain/parseSheet';
import type { NewTransactionInput, Transaction } from '../domain/types';

export type PlannerMode = 'current-month' | 'blank';

const PLANNER_CURRENT_MONTH_KEY = 'plannerCurrentMonthTransactions';
const PLANNER_BLANK_KEY = 'plannerBlankTransactions';
const LEGACY_PLANNER_STORAGE_KEY = 'plannerTransactions';

export function toPlannerTransaction(input: NewTransactionInput): Transaction {
  return {
    id: createId(input.type),
    date: input.date,
    category: input.category,
    type: input.type,
    amount: input.amount,
    comment: input.comment,
    investmentType:
      input.type === 'investment'
        ? input.investmentType || input.category
        : undefined,
  };
}

function loadStoredTransactions(
  key: string,
  legacyFallbackKey?: string
): Transaction[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as Transaction[];
      return Array.isArray(parsed) ? parsed : [];
    }
    if (legacyFallbackKey) {
      const legacy = localStorage.getItem(legacyFallbackKey);
      if (legacy) {
        const parsed = JSON.parse(legacy) as Transaction[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.setItem(key, JSON.stringify(parsed));
          return parsed;
        }
      }
    }
    return [];
  } catch {
    return [];
  }
}

function saveStoredTransactions(key: string, items: Transaction[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export function usePlannerStore() {
  const [currentMonthPlannerTransactions, setCurrentMonthPlannerTransactions] =
    useState<Transaction[]>(() =>
      loadStoredTransactions(
        PLANNER_CURRENT_MONTH_KEY,
        LEGACY_PLANNER_STORAGE_KEY
      )
    );

  const [blankPlannerTransactions, setBlankPlannerTransactions] = useState<
    Transaction[]
  >(() => loadStoredTransactions(PLANNER_BLANK_KEY));

  const handleAddPlanner = useCallback(
    (input: NewTransactionInput, mode: PlannerMode = 'current-month') => {
      const newTx = toPlannerTransaction(input);
      if (mode === 'blank') {
        setBlankPlannerTransactions((prev) => {
          const updated = [...prev, newTx];
          saveStoredTransactions(PLANNER_BLANK_KEY, updated);
          return updated;
        });
      } else {
        setCurrentMonthPlannerTransactions((prev) => {
          const updated = [...prev, newTx];
          saveStoredTransactions(PLANNER_CURRENT_MONTH_KEY, updated);
          return updated;
        });
      }
    },
    []
  );

  const handleRemovePlanner = useCallback(
    (id: string, mode: PlannerMode = 'current-month') => {
      if (mode === 'blank') {
        setBlankPlannerTransactions((prev) => {
          const updated = prev.filter((t) => t.id !== id);
          saveStoredTransactions(PLANNER_BLANK_KEY, updated);
          return updated;
        });
      } else {
        setCurrentMonthPlannerTransactions((prev) => {
          const updated = prev.filter((t) => t.id !== id);
          saveStoredTransactions(PLANNER_CURRENT_MONTH_KEY, updated);
          return updated;
        });
      }
    },
    []
  );

  const handleClearPlanner = useCallback(
    (mode: PlannerMode = 'current-month') => {
      if (mode === 'blank') {
        setBlankPlannerTransactions([]);
        saveStoredTransactions(PLANNER_BLANK_KEY, []);
      } else {
        setCurrentMonthPlannerTransactions([]);
        saveStoredTransactions(PLANNER_CURRENT_MONTH_KEY, []);
      }
    },
    []
  );

  return {
    currentMonthPlannerTransactions,
    blankPlannerTransactions,
    plannerTransactions: currentMonthPlannerTransactions,
    handleAddPlanner,
    handleRemovePlanner,
    handleClearPlanner,
  };
}
