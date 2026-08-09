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
  if (!raw) return new Date(NaN);
  const str = String(raw).trim();

  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return new Date(
      parseInt(m[1], 10),
      parseInt(m[2], 10) - 1,
      parseInt(m[3], 10)
    );
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
  const { tabName, rowIndex, rowData } = body || {};
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
  if (index >= rows.length) {
    throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  }

  rows[index].assign(rowData);
  await rows[index].save();
  return { ok: true };
}

async function handleDelete(doc, body) {
  const { tabName, rowIndex } = body || {};
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
  if (index >= rows.length) {
    throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  }

  await rows[index].delete();
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

