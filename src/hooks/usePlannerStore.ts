import { useCallback, useState } from 'react';
import { createId } from '../domain/parseSheet';
import type { NewTransactionInput, Transaction } from '../domain/types';

const PLANNER_STORAGE_KEY = 'plannerTransactions';

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

function loadPlannerTransactions(): Transaction[] {
  try {
    const stored = localStorage.getItem(PLANNER_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Transaction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePlannerTransactions(items: Transaction[]): void {
  localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(items));
}

export function usePlannerStore() {
  const [plannerTransactions, setPlannerTransactions] = useState<
    Transaction[]
  >(() => loadPlannerTransactions());

  const handleAddPlanner = useCallback((input: NewTransactionInput) => {
    setPlannerTransactions((prev) => {
      const updated = [...prev, toPlannerTransaction(input)];
      savePlannerTransactions(updated);
      return updated;
    });
  }, []);

  const handleRemovePlanner = useCallback((id: string) => {
    setPlannerTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      savePlannerTransactions(updated);
      return updated;
    });
  }, []);

  const handleClearPlanner = useCallback(() => {
    setPlannerTransactions([]);
    savePlannerTransactions([]);
  }, []);

  return {
    plannerTransactions,
    handleAddPlanner,
    handleRemovePlanner,
    handleClearPlanner,
  };
}
