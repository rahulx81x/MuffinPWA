import type { SheetTabName, TransactionType } from './types';

export const TAB_NAMES = ['Income', 'Expense', 'Investment'] as const satisfies readonly SheetTabName[];

export const TYPE_BY_TAB: Record<SheetTabName, TransactionType> = {
  Income: 'income',
  Expense: 'expense',
  Investment: 'investment',
};

export const TAB_BY_TYPE: Record<TransactionType, SheetTabName> = {
  income: 'Income',
  expense: 'Expense',
  investment: 'Investment',
};

/** Id is optional on linked legacy sheets; always present on app-created workbooks. */
export const TAB_HEADERS: Record<SheetTabName, string[]> = {
  Income: ['Id', 'Date', 'Category', 'Amount', 'Comment'],
  Expense: ['Id', 'Date', 'Category', 'Amount', 'Comment'],
  Investment: ['Id', 'Date', 'Category', 'Amount', 'Investment Type', 'Comment'],
};

export function isSheetTabName(value: unknown): value is SheetTabName {
  return (
    typeof value === 'string' &&
    (TAB_NAMES as readonly string[]).includes(value)
  );
}

export function newRowId(): string {
  return `mfn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function parseSpreadsheetId(input: unknown): string {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const fromUrl = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromUrl) return fromUrl[1];

  if (/^[a-zA-Z0-9-_]+$/.test(raw)) return raw;
  return '';
}
