import { OAuth2Client } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { oauthClientFromRefreshToken, oauthConfigured } from '../lib/googleAuth.js';
import { json, noContent, parseBody } from '../lib/http.js';
import { requireSession } from '../lib/session.js';
import { TAB_NAMES } from '../lib/sheetBootstrap.js';
import { bindBlobsEvent, getUserRecord } from '../lib/userStore.js';

const TYPE_BY_TAB = {
  Income: 'income',
  Expense: 'expense',
  Investment: 'investment',
};

function parseDate(raw) {
  if (raw === null || raw === undefined || raw === '') return new Date(NaN);

  // If raw is a numeric Google Sheets serial date number (e.g. 45000)
  if (typeof raw === 'number' || (typeof raw === 'string' && /^\d{5}(\.\d+)?$/.test(raw.trim()))) {
    const num = Number(raw);
    const sheetsEpoch = new Date(Date.UTC(1899, 11, 30));
    const millis = sheetsEpoch.getTime() + num * 86400000;
    return new Date(millis);
  }

  const str = String(raw).trim();

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  let m = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) {
    return new Date(
      parseInt(m[1], 10),
      parseInt(m[2], 10) - 1,
      parseInt(m[3], 10)
    );
  }

  // 2. Text dates with month names (e.g. 10 Aug 2026, Aug 10, 2026)
  const parsedTs = Date.parse(str);
  if (!Number.isNaN(parsedTs)) {
    const d = new Date(parsedTs);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // 3. Numeric slash/dash format: DD/MM/YYYY or MM/DD/YYYY
  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const first = parseInt(m[1], 10);
    const second = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);

    if (first > 12) {
      return new Date(year, second - 1, first);
    }
    if (second > 12) {
      return new Date(year, first - 1, second);
    }
    // Default to DD/MM/YYYY
    return new Date(year, second - 1, first);
  }

  return new Date(str);
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function getDocForSession(session) {
  const record = await getUserRecord(session.sub);
  const spreadsheetId = record?.spreadsheetId;
  if (!spreadsheetId) {
    throw Object.assign(new Error('No spreadsheet linked yet.'), {
      statusCode: 400,
      code: 'needsSheet',
    });
  }

  const auth = oauthClientFromRefreshToken(session.refreshToken);
  // Ensure google-spreadsheet sees an OAuth2Client instance.
  if (!(auth instanceof OAuth2Client)) {
    throw Object.assign(new Error('OAuth client misconfigured.'), {
      statusCode: 500,
    });
  }

  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();
  return doc;
}

function getSheet(doc, tabName) {
  const sheet = doc.sheetsByTitle[tabName];
  if (!sheet) {
    throw Object.assign(new Error(`Sheet tab "${tabName}" was not found.`), {
      statusCode: 400,
    });
  }
  return sheet;
}

function rowToTransaction(row, tabName, rowIndex) {
  const type = TYPE_BY_TAB[tabName];
  const date = parseDate(row.get('Date') ?? '');
  const category = String(row.get('Category') ?? '').trim();
  const amount = parseFloat(String(row.get('Amount') ?? '').replace(/,/g, ''));
  const comment = String(row.get('Comment') ?? '').trim();
  const investmentType =
    tabName === 'Investment'
      ? String(row.get('Investment Type') ?? '').trim()
      : '';

  if (Number.isNaN(amount) || Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    id: `${tabName}-${rowIndex}`,
    date: toIsoDate(date),
    category,
    type,
    amount,
    comment,
    investmentType: investmentType || undefined,
    tabName,
    rowIndex,
  };
}

async function handleGet(doc) {
  const all = [];

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

async function handlePost(doc, body) {
  const { tabName, rowData } = body || {};
  if (!tabName || !rowData || typeof rowData !== 'object') {
    throw Object.assign(new Error('POST requires tabName and rowData.'), {
      statusCode: 400,
    });
  }
  if (!TAB_NAMES.includes(tabName)) {
    throw Object.assign(new Error(`Invalid tabName "${tabName}".`), {
      statusCode: 400,
    });
  }

  const sheet = getSheet(doc, tabName);
  await sheet.addRow(rowData);
  return { ok: true };
}

async function handlePut(doc, body) {
  const { tabName, rowIndex, rowData, expectedRow } = body || {};
  if (!tabName || rowIndex === undefined || rowIndex === null || !rowData) {
    throw Object.assign(
      new Error('PUT requires tabName, rowIndex, and rowData.'),
      { statusCode: 400 }
    );
  }
  if (!TAB_NAMES.includes(tabName)) {
    throw Object.assign(new Error(`Invalid tabName "${tabName}".`), {
      statusCode: 400,
    });
  }

  const index = Number(rowIndex);
  if (!Number.isInteger(index) || index < 0) {
    throw Object.assign(new Error('rowIndex must be a non-negative integer.'), {
      statusCode: 400,
    });
  }

  const sheet = getSheet(doc, tabName);
  const rows = await sheet.getRows();
  if (index >= rows.length && !expectedRow) {
    throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  }

  let targetRow = rows[index];
  if (expectedRow && rows.length > 0) {
    const expCat = String(expectedRow.category ?? '').trim();
    const expAmt = String(expectedRow.amount ?? '').trim();
    const curCat = targetRow ? String(targetRow.get('Category') ?? '').trim() : '';
    const curAmt = targetRow ? String(targetRow.get('Amount') ?? '').trim() : '';

    if (curCat !== expCat || curAmt !== expAmt) {
      const found = rows.find((r) => {
        return (
          String(r.get('Category') ?? '').trim() === expCat &&
          String(r.get('Amount') ?? '').trim() === expAmt
        );
      });
      if (found) targetRow = found;
    }
  }

  if (!targetRow) {
    throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  }

  targetRow.assign(rowData);
  await targetRow.save();
  return { ok: true };
}

async function handleDelete(doc, body) {
  const { tabName, rowIndex, expectedRow } = body || {};
  if (!tabName || rowIndex === undefined || rowIndex === null) {
    throw Object.assign(new Error('DELETE requires tabName and rowIndex.'), {
      statusCode: 400,
    });
  }
  if (!TAB_NAMES.includes(tabName)) {
    throw Object.assign(new Error(`Invalid tabName "${tabName}".`), {
      statusCode: 400,
    });
  }

  const index = Number(rowIndex);
  if (!Number.isInteger(index) || index < 0) {
    throw Object.assign(new Error('rowIndex must be a non-negative integer.'), {
      statusCode: 400,
    });
  }

  const sheet = getSheet(doc, tabName);
  const rows = await sheet.getRows();
  if (index >= rows.length && !expectedRow) {
    throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  }

  let targetRow = rows[index];
  if (expectedRow && rows.length > 0) {
    const expCat = String(expectedRow.category ?? '').trim();
    const expAmt = String(expectedRow.amount ?? '').trim();
    const curCat = targetRow ? String(targetRow.get('Category') ?? '').trim() : '';
    const curAmt = targetRow ? String(targetRow.get('Amount') ?? '').trim() : '';

    if (curCat !== expCat || curAmt !== expAmt) {
      const found = rows.find((r) => {
        return (
          String(r.get('Category') ?? '').trim() === expCat &&
          String(r.get('Amount') ?? '').trim() === expAmt
        );
      });
      if (found) targetRow = found;
    }
  }

  if (!targetRow) {
    throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  }

  await targetRow.delete();
  return { ok: true };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return noContent(event);
  }

  try {
    bindBlobsEvent(event);
    if (!oauthConfigured()) {
      return json(event, 500, {
        error:
          'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and SESSION_SECRET.',
      });
    }

    const session = requireSession(event);
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
  } catch (error) {
    console.error('transactions function error', error);
    const statusCode = error?.statusCode || 500;
    return json(event, statusCode, {
      error: error?.message || 'Failed to handle transactions request.',
      code: error?.code,
    });
  }
}

