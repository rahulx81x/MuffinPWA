import type { RecurringRule, SheetTabName, TransactionType } from './types';
import { sanitizeRecurringRule } from './recipe';

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

export const RULES_TAB_NAME = 'Rules';
export const RULES_TAB_HEADERS = [
  'Id',
  'Name',
  'Type',
  'Category',
  'Amount',
  'DayOfMonth',
  'InvestmentType',
  'Comment',
  'Active',
  'AutoPrompt',
  'LastLoggedMonth',
  'EndDate',
  'CreatedAt',
] as const;

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

export interface RuleSheetRow {
  Id: string;
  Name: string;
  Type: string;
  Category: string;
  Amount: number | string;
  DayOfMonth: number | string;
  InvestmentType?: string;
  Comment?: string;
  Active: string;
  AutoPrompt: string;
  LastLoggedMonth?: string;
  EndDate?: string;
  CreatedAt?: string;
}

export function serializeRecipeToRows(config: {
  openingBalance: number;
  investments: Array<{ id?: string; type: string; amount: number }>;
}): RecipeSheetRow[] {
  const rows: RecipeSheetRow[] = [
    {
      Type: 'Opening Balance',
      Amount: Number.isFinite(config.openingBalance)
        ? config.openingBalance
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
      Id:
        typeof inv.id === 'string' && inv.id
          ? inv.id
          : `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      Notes: '',
    });
  }

  return rows;
}

export function parseRecipeFromRows(
  rows: Array<Record<string, unknown> | { get(key: string): unknown }>
): {
  openingBalance: number;
  investments: Array<{ id: string; type: string; amount: number }>;
} {
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

    const isRecurringRow =
      rawId.startsWith('rec_') ||
      type.toLowerCase() === 'recurringrule' ||
      type.toLowerCase() === 'recurring rule';

    if (isOpeningBalance) {
      if (Number.isFinite(amount)) {
        openingBalance = amount;
      }
    } else if (!isRecurringRow && (type || (Number.isFinite(amount) && amount > 0))) {
      investments.push({
        id:
          rawId ||
          `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        type: type || 'Investment',
        amount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
      });
    }
  }

  return { openingBalance, investments };
}

export function serializeRulesToRows(rules: RecurringRule[]): RuleSheetRow[] {
  const rows: RuleSheetRow[] = [];
  for (const r of rules || []) {
    const s = sanitizeRecurringRule(r);
    if (!s) continue;
    rows.push({
      Id: s.id,
      Name: s.name,
      Type: s.type,
      Category: s.category,
      Amount: s.amount,
      DayOfMonth: s.dayOfMonth,
      InvestmentType: s.investmentType || '',
      Comment: s.comment || '',
      Active: s.active ? 'TRUE' : 'FALSE',
      AutoPrompt: s.autoPrompt ? 'TRUE' : 'FALSE',
      LastLoggedMonth: s.lastLoggedMonth || '',
      EndDate: s.endDate || '',
      CreatedAt: s.createdAt || new Date().toISOString(),
    });
  }
  return rows;
}

export function parseRulesFromRows(
  rows: Array<Record<string, unknown> | { get(key: string): unknown }>
): RecurringRule[] {
  const rules: RecurringRule[] = [];
  for (const row of rows || []) {
    const getValue = (key: string): unknown => {
      if (row && typeof (row as { get?: unknown }).get === 'function') {
        return (row as { get(k: string): unknown }).get(key);
      }
      return (row as Record<string, unknown>)?.[key];
    };

    const id = String(getValue('Id') ?? '').trim();
    const name = String(getValue('Name') ?? '').trim();
    const rawType = String(getValue('Type') ?? '').trim();
    const category = String(getValue('Category') ?? '').trim();
    const rawAmt = String(getValue('Amount') ?? '').replace(/,/g, '').trim();
    const amount = Number(rawAmt);
    const rawDay = Number(getValue('DayOfMonth'));
    const dayOfMonth = Math.min(31, Math.max(1, Math.round(rawDay || 1)));
    const investmentType = String(getValue('InvestmentType') ?? '').trim();
    const comment = String(getValue('Comment') ?? '').trim();
    const rawActive = String(getValue('Active') ?? '').toLowerCase().trim();
    const active = rawActive !== 'false';
    const rawAutoPrompt = String(getValue('AutoPrompt') ?? '').toLowerCase().trim();
    const autoPrompt = rawAutoPrompt !== 'false';
    const lastLoggedMonth = String(getValue('LastLoggedMonth') ?? '').trim();
    const endDate = String(getValue('EndDate') ?? '').trim();
    const createdAt = String(getValue('CreatedAt') ?? '').trim();

    if (!name && !category && !(amount > 0) && !id) continue;

    const rule = sanitizeRecurringRule({
      id: id || undefined,
      name,
      type: rawType,
      category,
      amount,
      dayOfMonth,
      investmentType: investmentType || undefined,
      comment: comment || undefined,
      active,
      autoPrompt,
      lastLoggedMonth: lastLoggedMonth || undefined,
      endDate: endDate || undefined,
      createdAt: createdAt || undefined,
    });

    if (rule) {
      rules.push(rule);
    }
  }
  return rules;
}

