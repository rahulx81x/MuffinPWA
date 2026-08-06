import { OAuth2Client } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';

const TAB_NAMES = ['Income', 'Expense', 'Investment'];

const TYPE_BY_TAB = {
  Income: 'income',
  Expense: 'expense',
  Investment: 'investment',
};

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Cache-Control': 'no-store',
};

const jsonHeaders = {
  ...headers,
  'Content-Type': 'application/json; charset=utf-8',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  };
}

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

function envValue(name) {
  const raw = process.env[name];
  if (raw == null) return '';
  // Strip whitespace and accidental surrounding quotes from .env / Netlify UI pastes.
  return String(raw).trim().replace(/^['"]|['"]$/g, '');
}

function envConfig() {
  const spreadsheetId = envValue('GOOGLE_SPREADSHEET_ID');
  const clientId = envValue('GOOGLE_CLIENT_ID');
  const clientSecret = envValue('GOOGLE_CLIENT_SECRET');
  const refreshToken = envValue('GOOGLE_REFRESH_TOKEN');

  if (!spreadsheetId || !clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return { spreadsheetId, clientId, clientSecret, refreshToken };
}

async function getDoc() {
  const config = envConfig();
  if (!config) {
    throw Object.assign(new Error('Google Sheets OAuth environment variables are not configured.'), {
      statusCode: 500,
    });
  }

  // Use Node's built-in fetch so gaxios never loads node-fetch/fetch-blob.
  // On Netlify, fetch-blob's ESM interop breaks with:
  // "Class extends value #<Object> is not a constructor or null".
  const auth = new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    transporterOptions: {
      fetchImplementation: globalThis.fetch.bind(globalThis),
    },
  });
  auth.setCredentials({ refresh_token: config.refreshToken });

  const doc = new GoogleSpreadsheet(config.spreadsheetId, auth);
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
  return json(200, all);
}

async function handlePost(doc, body) {
  const { tabName, rowData } = body || {};
  if (!tabName || !rowData || typeof rowData !== 'object') {
    return json(400, { error: 'POST requires tabName and rowData.' });
  }
  if (!TAB_NAMES.includes(tabName)) {
    return json(400, { error: `Invalid tabName "${tabName}".` });
  }

  const sheet = getSheet(doc, tabName);
  await sheet.addRow(rowData);
  return json(201, { ok: true });
}

async function handlePut(doc, body) {
  const { tabName, rowIndex, rowData } = body || {};
  if (!tabName || rowIndex === undefined || rowIndex === null || !rowData) {
    return json(400, { error: 'PUT requires tabName, rowIndex, and rowData.' });
  }
  if (!TAB_NAMES.includes(tabName)) {
    return json(400, { error: `Invalid tabName "${tabName}".` });
  }

  const index = Number(rowIndex);
  if (!Number.isInteger(index) || index < 0) {
    return json(400, { error: 'rowIndex must be a non-negative integer.' });
  }

  const sheet = getSheet(doc, tabName);
  const rows = await sheet.getRows();
  if (index >= rows.length) {
    return json(404, { error: 'Row not found.' });
  }

  rows[index].assign(rowData);
  await rows[index].save();
  return json(200, { ok: true });
}

async function handleDelete(doc, body) {
  const { tabName, rowIndex } = body || {};
  if (!tabName || rowIndex === undefined || rowIndex === null) {
    return json(400, { error: 'DELETE requires tabName and rowIndex.' });
  }
  if (!TAB_NAMES.includes(tabName)) {
    return json(400, { error: `Invalid tabName "${tabName}".` });
  }

  const index = Number(rowIndex);
  if (!Number.isInteger(index) || index < 0) {
    return json(400, { error: 'rowIndex must be a non-negative integer.' });
  }

  const sheet = getSheet(doc, tabName);
  const rows = await sheet.getRows();
  if (index >= rows.length) {
    return json(404, { error: 'Row not found.' });
  }

  await rows[index].delete();
  return json(200, { ok: true });
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), {
      statusCode: 400,
    });
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const doc = await getDoc();

    if (event.httpMethod === 'GET') {
      return await handleGet(doc);
    }

    if (event.httpMethod === 'POST') {
      return await handlePost(doc, parseBody(event));
    }

    if (event.httpMethod === 'PUT') {
      return await handlePut(doc, parseBody(event));
    }

    if (event.httpMethod === 'DELETE') {
      return await handleDelete(doc, parseBody(event));
    }

    return json(405, { error: 'Method Not Allowed' });
  } catch (error) {
    console.error('transactions function error', error);
    const statusCode = error?.statusCode || 500;
    return json(statusCode, {
      error: error?.message || 'Failed to handle transactions request.',
    });
  }
}
