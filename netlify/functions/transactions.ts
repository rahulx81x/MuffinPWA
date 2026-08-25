import { OAuth2Client } from 'google-auth-library';
import { GoogleSpreadsheet, type GoogleSpreadsheetRow } from 'google-spreadsheet';
import {
  TAB_NAMES,
  TYPE_BY_TAB,
  isSheetTabName,
  newRowId,
  parseSheetDate,
  toIsoDate,
  type ExpectedRow,
  type SheetRowData,
  type SheetTabName,
  type Transaction,
} from '../../shared/index';
import { oauthClientFromRefreshToken, oauthConfigured } from '../lib/googleAuth';
import { withSession } from '../lib/handler';
import { json, parseBody } from '../lib/http';
import type { SessionUser } from '../lib/session';
import { bindBlobsEvent, getUserRecord } from '../lib/userStore';

function normalizeAmount(raw: unknown): string {
  return String(raw ?? '')
    .replace(/,/g, '')
    .trim();
}

function rowMatchesExpected(
  row: GoogleSpreadsheetRow,
  expected: ExpectedRow
): boolean {
  const expCat = String(expected.category ?? '').trim();
  const expAmt = normalizeAmount(expected.amount);
  const expDate = String(expected.date ?? '').trim();

  const curCat = String(row.get('Category') ?? '').trim();
  const curAmt = normalizeAmount(row.get('Amount'));
  if (curCat !== expCat || curAmt !== expAmt) return false;

  if (!expDate) return true;
  const parsed = parseSheetDate(row.get('Date') ?? '');
  if (Number.isNaN(parsed.getTime())) return false;
  return toIsoDate(parsed) === expDate;
}

function resolveTargetRow(
  rows: GoogleSpreadsheetRow[],
  {
    rowIndex,
    rowId,
    expectedRow,
  }: {
    rowIndex: number;
    rowId?: string;
    expectedRow?: ExpectedRow;
  }
): GoogleSpreadsheetRow | null {
  if (rowId) {
    const byId = rows.find(
      (r) => String(r.get('Id') ?? '').trim() === rowId
    );
    if (byId) return byId;
  }

  let targetRow = rows[rowIndex] ?? null;

  if (expectedRow && rows.length > 0) {
    if (!targetRow || !rowMatchesExpected(targetRow, expectedRow)) {
      const found = rows.find((r) => rowMatchesExpected(r, expectedRow));
      if (found) targetRow = found;
    }
  }

  return targetRow;
}

async function getDocForSession(session: SessionUser) {
  const record = await getUserRecord(session.sub);
  const spreadsheetId = record?.spreadsheetId;
  if (!spreadsheetId) {
    throw Object.assign(new Error('No spreadsheet linked yet.'), {
      statusCode: 400,
      code: 'needsSheet',
    });
  }

  const auth = oauthClientFromRefreshToken(session.refreshToken);
  if (!(auth instanceof OAuth2Client)) {
    throw Object.assign(new Error('OAuth client misconfigured.'), {
      statusCode: 500,
    });
  }

  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();
  return doc;
}

async function getSheet(doc: GoogleSpreadsheet, tabName: SheetTabName) {
  const sheet = doc.sheetsByTitle[tabName];
  if (!sheet) {
    throw Object.assign(new Error(`Sheet tab "${tabName}" was not found.`), {
      statusCode: 400,
    });
  }
  await sheet.loadHeaderRow();
  return sheet;
}

function sheetHasIdColumn(sheet: { headerValues?: string[] }) {
  return (sheet.headerValues || []).includes('Id');
}

function rowToTransaction(
  row: GoogleSpreadsheetRow,
  tabName: SheetTabName,
  rowIndex: number
): Transaction | null {
  const type = TYPE_BY_TAB[tabName];
  const date = parseSheetDate(row.get('Date') ?? '');
  const category = String(row.get('Category') ?? '').trim();
  const amount = parseFloat(normalizeAmount(row.get('Amount')));
  const comment = String(row.get('Comment') ?? '').trim();
  const investmentType =
    tabName === 'Investment'
      ? String(row.get('Investment Type') ?? '').trim()
      : '';
  const rowId = String(row.get('Id') ?? '').trim() || undefined;

  if (Number.isNaN(amount) || Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    id: rowId || `${tabName}-${rowIndex}`,
    date: toIsoDate(date),
    category,
    type,
    amount,
    comment,
    investmentType: investmentType || undefined,
    tabName,
    rowIndex,
    rowId,
  };
}

async function handleGet(doc: GoogleSpreadsheet): Promise<Transaction[]> {
  const all: Transaction[] = [];

  for (const tabName of TAB_NAMES) {
    const sheet = doc.sheetsByTitle[tabName];
    if (!sheet) continue;

    const rows = await sheet.getRows();
    rows.forEach((row, rowIndex) => {
      const tx = rowToTransaction(row, tabName, rowIndex);
      if (tx) all.push(tx);
    });
  }

  all.sort((a, b) => a.date.localeCompare(b.date));
  return all;
}

function asRowData(raw: unknown): SheetRowData | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as SheetRowData;
}

async function handlePost(doc: GoogleSpreadsheet, body: Record<string, unknown>) {
  const tabName = body.tabName;
  const rowData = asRowData(body.rowData);
  if (!isSheetTabName(tabName) || !rowData) {
    throw Object.assign(new Error('POST requires tabName and rowData.'), {
      statusCode: 400,
    });
  }

  const sheet = await getSheet(doc, tabName);
  const payload: SheetRowData = { ...rowData };
  if (sheetHasIdColumn(sheet)) {
    payload.Id = String(payload.Id || '').trim() || newRowId();
  } else {
    delete payload.Id;
  }

  await sheet.addRow(
    payload as unknown as Record<string, string | number>,
    { insert: true }
  );
  const transactions = await handleGet(doc);
  return { ok: true, transactions };
}

async function handlePut(doc: GoogleSpreadsheet, body: Record<string, unknown>) {
  const tabName = body.tabName;
  const rowData = asRowData(body.rowData);
  const rowIndex = body.rowIndex;
  const rowId =
    typeof body.rowId === 'string' && body.rowId.trim()
      ? body.rowId.trim()
      : undefined;
  const expectedRow =
    body.expectedRow && typeof body.expectedRow === 'object'
      ? (body.expectedRow as ExpectedRow)
      : undefined;

  if (!isSheetTabName(tabName) || rowIndex === undefined || rowIndex === null || !rowData) {
    throw Object.assign(
      new Error('PUT requires tabName, rowIndex, and rowData.'),
      { statusCode: 400 }
    );
  }

  const index = Number(rowIndex);
  if (!Number.isInteger(index) || index < 0) {
    throw Object.assign(new Error('rowIndex must be a non-negative integer.'), {
      statusCode: 400,
    });
  }

  const sheet = await getSheet(doc, tabName);
  const rows = await sheet.getRows();
  if (index >= rows.length && !expectedRow && !rowId) {
    throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  }

  const targetRow = resolveTargetRow(rows, { rowIndex: index, rowId, expectedRow });
  if (!targetRow) {
    throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  }

  const payload: SheetRowData = { ...rowData };
  if (sheetHasIdColumn(sheet)) {
    const existingId = String(targetRow.get('Id') ?? '').trim();
    payload.Id = String(payload.Id || existingId || rowId || newRowId());
  } else {
    delete payload.Id;
  }

  targetRow.assign(payload as Record<string, unknown>);
  await targetRow.save();
  const transactions = await handleGet(doc);
  return { ok: true, transactions };
}

async function handleDelete(
  doc: GoogleSpreadsheet,
  body: Record<string, unknown>
) {
  const tabName = body.tabName;
  const rowIndex = body.rowIndex;
  const rowId =
    typeof body.rowId === 'string' && body.rowId.trim()
      ? body.rowId.trim()
      : undefined;
  const expectedRow =
    body.expectedRow && typeof body.expectedRow === 'object'
      ? (body.expectedRow as ExpectedRow)
      : undefined;

  if (!isSheetTabName(tabName) || rowIndex === undefined || rowIndex === null) {
    throw Object.assign(new Error('DELETE requires tabName and rowIndex.'), {
      statusCode: 400,
    });
  }

  const index = Number(rowIndex);
  if (!Number.isInteger(index) || index < 0) {
    throw Object.assign(new Error('rowIndex must be a non-negative integer.'), {
      statusCode: 400,
    });
  }

  const sheet = await getSheet(doc, tabName);
  const rows = await sheet.getRows();
  if (index >= rows.length && !expectedRow && !rowId) {
    throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  }

  const targetRow = resolveTargetRow(rows, { rowIndex: index, rowId, expectedRow });
  if (!targetRow) {
    throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  }

  await targetRow.delete();
  const transactions = await handleGet(doc);
  return { ok: true, transactions };
}

export const handler = withSession(
  async ({ event, session }) => {
    if (!oauthConfigured()) {
      return json(event, 500, {
        error:
          'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and SESSION_SECRET.',
      });
    }

    bindBlobsEvent(event);
    const doc = await getDocForSession(session);

    if (event.httpMethod === 'GET') {
      const all = await handleGet(doc);
      return json(event, 200, all);
    }

    if (event.httpMethod === 'POST') {
      const result = await handlePost(doc, parseBody(event));
      return json(event, 201, result);
    }

    if (event.httpMethod === 'PUT') {
      const result = await handlePut(doc, parseBody(event));
      return json(event, 200, result);
    }

    if (event.httpMethod === 'DELETE') {
      const result = await handleDelete(doc, parseBody(event));
      return json(event, 200, result);
    }

    return json(event, 405, { error: 'Method Not Allowed' });
  },
  { methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }
);
