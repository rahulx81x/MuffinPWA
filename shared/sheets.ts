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

function extractRowValue(
  row: Record<string, unknown> | { get?(key: string): unknown; toObject?(): Record<string, unknown> } | null | undefined,
  candidates: string[]
): unknown {
  if (!row) return undefined;

  // 1. Try toObject if available (google-spreadsheet row)
  let obj: Record<string, unknown> | null = null;
  if (typeof (row as { toObject?: () => Record<string, unknown> }).toObject === 'function') {
    try {
      obj = (row as { toObject: () => Record<string, unknown> }).toObject();
    } catch {}
  } else if (typeof row === 'object') {
    obj = row as Record<string, unknown>;
  }

  if (obj) {
    const normCandidates = candidates.map((c) => c.toLowerCase().trim());
    for (const [k, v] of Object.entries(obj)) {
      if (normCandidates.includes(k.toLowerCase().trim())) {
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      }
    }
  }

  // 2. Try get(candidate)
  if (typeof (row as { get?: (k: string) => unknown }).get === 'function') {
    for (const cand of candidates) {
      try {
        const v = (row as { get: (k: string) => unknown }).get(cand);
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      } catch {}
    }
  }

  return undefined;
}

function parseNumericAmount(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (!raw && raw !== 0) return NaN;
  const str = String(raw).trim();
  if (!str) return NaN;
  // Clean currency symbols (₹, $, €, £, ¥), commas, and spaces
  const cleaned = str.replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
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
    const type = String(
      extractRowValue(row, ['Type', 'Investment Type', 'Category', 'Name', 'Description', 'Item']) ?? ''
    ).trim();
    const rawId = String(extractRowValue(row, ['Id', 'ID', 'RowId', 'Key']) ?? '').trim();
    const amount = parseNumericAmount(
      extractRowValue(row, ['Amount', 'Balance', 'Value', 'Total', 'Starting Balance', 'Opening Balance'])
    );

    const normType = type.toLowerCase().replace(/[\s_-]+/g, '');
    const normId = rawId.toLowerCase().replace(/[\s_-]+/g, '');

    const isOpeningBalance =
      normId.includes('openingbalance') ||
      normId.includes('startingbalance') ||
      normType === 'openingbalance' ||
      normType === 'startingbalance' ||
      normType === 'initialbalance' ||
      normType === 'openingcash' ||
      normType === 'startingcash' ||
      normType === 'initialcash' ||
      normType === 'bankbalance' ||
      normType === 'liquidcash';

    const isRecurringRow =
      rawId.startsWith('rec_') ||
      normType === 'recurringrule' ||
      normType === 'recurring';

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
    const id = String(extractRowValue(row, ['Id', 'ID', 'RuleId']) ?? '').trim();
    const name = String(extractRowValue(row, ['Name', 'Title', 'RuleName']) ?? '').trim();
    const rawType = String(extractRowValue(row, ['Type']) ?? '').trim();
    const category = String(extractRowValue(row, ['Category']) ?? '').trim();
    const amount = parseNumericAmount(extractRowValue(row, ['Amount', 'Value']));
    const rawDay = Number(extractRowValue(row, ['DayOfMonth', 'Day']));
    const dayOfMonth = Math.min(31, Math.max(1, Math.round(rawDay || 1)));
    const investmentType = String(extractRowValue(row, ['InvestmentType', 'Investment Type']) ?? '').trim();
    const comment = String(extractRowValue(row, ['Comment', 'Notes', 'Note']) ?? '').trim();
    const rawActive = String(extractRowValue(row, ['Active', 'Status']) ?? '').toLowerCase().trim();
    const active = rawActive !== 'false';
    const rawAutoPrompt = String(extractRowValue(row, ['AutoPrompt', 'Auto Prompt']) ?? '').toLowerCase().trim();
    const autoPrompt = rawAutoPrompt !== 'false';
    const lastLoggedMonth = String(extractRowValue(row, ['LastLoggedMonth', 'Last Logged Month']) ?? '').trim();
    const endDate = String(extractRowValue(row, ['EndDate', 'End Date']) ?? '').trim();
    const createdAt = String(extractRowValue(row, ['CreatedAt', 'Created At']) ?? '').trim();

    if (!name && !category && !(amount > 0) && !id) continue;

    const rule = sanitizeRecurringRule({
      id: id || undefined,
      name,
      type: rawType,
      category,
      amount: Number.isFinite(amount) ? amount : 0,
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

