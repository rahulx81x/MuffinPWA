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

export const RECIPE_TAB_NAME = 'Recipe';

export const RECIPE_TAB_HEADERS = ['Type', 'Amount', 'Id', 'Notes'] as const;

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

export interface RecipeSheetRow {
  Type: string;
  Amount: number | string;
  Id: string;
  Notes?: string;
}

export function serializeRecipeToRows(config: {
  openingBalance: number;
  investments: Array<{ id?: string; type: string; amount: number }>;
}): RecipeSheetRow[] {
  const rows: RecipeSheetRow[] = [
    {
      Type: 'Opening Balance',
      Amount: Number.isFinite(config.openingBalance)
        ? Math.max(0, config.openingBalance)
        : 0,
      Id: 'opening_balance',
      Notes: 'Starting liquid cash balance',
    },
  ];

  for (const inv of config.investments || []) {
    const type = String(inv.type || '').trim();
    const amount = Number(inv.amount);
    if (!type && !(amount > 0)) continue;
    rows.push({
      Type: type || 'Investment',
      Amount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
      Id: typeof inv.id === 'string' && inv.id ? inv.id : `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      Notes: '',
    });
  }

  return rows;
}

export function parseRecipeFromRows(
  rows: Array<Record<string, unknown> | { get(key: string): unknown }>
): { openingBalance: number; investments: Array<{ id: string; type: string; amount: number }> } {
  let openingBalance = 0;
  const investments: Array<{ id: string; type: string; amount: number }> = [];

  for (const row of rows) {
    const getValue = (key: string): unknown => {
      if (row && typeof (row as { get?: unknown }).get === 'function') {
        return (row as { get(k: string): unknown }).get(key);
      }
      return (row as Record<string, unknown>)?.[key];
    };

    const type = String(getValue('Type') ?? '').trim();
    const rawId = String(getValue('Id') ?? '').trim();
    const rawAmt = String(getValue('Amount') ?? '').replace(/,/g, '').trim();
    const amount = Number(rawAmt);

    const isOpeningBalance =
      rawId === 'opening_balance' ||
      type.toLowerCase() === 'opening balance' ||
      type.toLowerCase() === 'openingbalance';

    if (isOpeningBalance) {
      if (Number.isFinite(amount)) {
        openingBalance = Math.max(0, amount);
      }
    } else if (type || (Number.isFinite(amount) && amount > 0)) {
      investments.push({
        id: rawId || `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        type: type || 'Investment',
        amount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
      });
    }
  }

  return { openingBalance, investments };
}

