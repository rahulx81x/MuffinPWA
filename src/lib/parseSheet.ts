import type { SheetPayload, Transaction, TransactionType } from '../types';

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Robust date parser — DD/MM preferred (Indian convention), ISO supported. */
export function parseDate(raw: string): Date {
  if (!raw) return new Date(NaN);
  const str = raw.trim();

  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }

  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (month > 12 && day <= 12) {
      return new Date(year, day - 1, month);
    }
    return new Date(year, month - 1, day);
  }

  return new Date(str);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function pushTransaction(
  target: Transaction[],
  partial: Omit<Transaction, 'id'>
): void {
  target.push({ ...partial, id: createId(partial.type) });
}

export function parseSheetCsv(
  csvText: string,
  sheetType: TransactionType,
  target: Transaction[]
): void {
  const rows = csvText.trim().split('\n').filter(Boolean);

  for (let i = 1; i < rows.length; i++) {
    const cols = parseCsvLine(rows[i]);
    if (cols.length < 3) continue;

    const date = parseDate(cols[0]);
    const category = (cols[1] || '').trim();
    const amount = parseFloat(cols[2]);
    let comment = '';
    let investmentType = '';

    if (sheetType === 'investment') {
      investmentType = (cols[3] || '').trim();
      comment = (cols[4] || '').trim();
    } else {
      comment = (cols[3] || '').trim();
    }

    if (Number.isNaN(amount) || Number.isNaN(date.getTime())) continue;

    pushTransaction(target, {
      date: toIsoDate(date),
      category,
      amount,
      type: sheetType,
      comment,
      investmentType: investmentType || undefined,
    });
  }
}

export function parseCombinedCsv(
  csvText: string,
  income: Transaction[],
  expense: Transaction[],
  investment: Transaction[]
): void {
  const rows = csvText.trim().split('\n').filter(Boolean);

  for (let i = 1; i < rows.length; i++) {
    const cols = parseCsvLine(rows[i]);
    if (cols.length < 4) continue;

    const date = parseDate(cols[0]);
    const category = (cols[1] || '').trim();
    const amount = parseFloat(cols[2]);
    const type = (cols[3] || '').trim().toLowerCase() as TransactionType;
    const comment = (cols[4] || '').trim();

    if (Number.isNaN(amount) || Number.isNaN(date.getTime())) continue;
    if (!['income', 'expense', 'investment'].includes(type)) continue;

    const item: Omit<Transaction, 'id'> = {
      date: toIsoDate(date),
      category,
      amount,
      type,
      comment,
      investmentType: type === 'investment' ? category : undefined,
    };

    if (type === 'income') pushTransaction(income, item);
    else if (type === 'expense') pushTransaction(expense, item);
    else pushTransaction(investment, item);
  }
}

export function transactionsFromPayload(payload: SheetPayload): Transaction[] {
  const income: Transaction[] = [];
  const expense: Transaction[] = [];
  const investment: Transaction[] = [];

  const combinedCsv = payload.combinedCsv || payload.sheetCsv || '';
  const incomeCsv = payload.incomeCsv || payload.income_csv || '';
  const expenseCsv = payload.expenseCsv || payload.expense_csv || '';
  const investmentCsv = payload.investmentCsv || payload.investment_csv || '';

  if (combinedCsv) {
    parseCombinedCsv(combinedCsv, income, expense, investment);
  } else {
    if (incomeCsv) parseSheetCsv(incomeCsv, 'income', income);
    if (expenseCsv) parseSheetCsv(expenseCsv, 'expense', expense);
    if (investmentCsv) parseSheetCsv(investmentCsv, 'investment', investment);
  }

  const all = [...income, ...expense, ...investment];
  all.sort((a, b) => a.date.localeCompare(b.date));
  return all;
}

export async function fetchSheetTransactions(): Promise<Transaction[]> {
  const response = await fetch('/.netlify/functions/fetch-sheet');
  if (!response.ok) {
    throw new Error('Could not reach sheet');
  }

  const contentType = response.headers.get('content-type') || '';
  const payload: SheetPayload = contentType.includes('application/json')
    ? ((await response.json()) as SheetPayload)
    : { combinedCsv: await response.text() };

  return transactionsFromPayload(payload);
}

export { createId, toIsoDate };
