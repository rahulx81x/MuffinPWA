import type { Transaction } from './types';

/** Labels that mark an Investment row as Provident Fund (excluded from metrics). */
const PF_EXACT = new Set(['pf', 'epf', 'ppf']);

export function matchesProvidentFundLabel(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return false;
  if (PF_EXACT.has(normalized)) return true;
  if (normalized.includes('provident fund') || normalized.includes('providentfund')) {
    return true;
  }
  return false;
}

/** Investment rows tagged as PF via Category or Investment Type. */
export function isProvidentFund(tx: Transaction): boolean {
  if (tx.type !== 'investment') return false;
  return (
    matchesProvidentFundLabel(tx.investmentType) ||
    matchesProvidentFundLabel(tx.category)
  );
}

export function isCountedInvestment(tx: Transaction): boolean {
  return tx.type === 'investment' && !isProvidentFund(tx);
}

export function sumProvidentFund(transactions: Transaction[]): number {
  return transactions
    .filter(isProvidentFund)
    .reduce((sum, t) => sum + t.amount, 0);
}
