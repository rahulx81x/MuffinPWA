import { GoogleSpreadsheet } from 'google-spreadsheet';

export const TAB_NAMES = ['Income', 'Expense', 'Investment'];

const HEADERS = {
  Income: ['Date', 'Category', 'Amount', 'Comment'],
  Expense: ['Date', 'Category', 'Amount', 'Comment'],
  Investment: ['Date', 'Category', 'Amount', 'Investment Type', 'Comment'],
};

export function parseSpreadsheetId(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const fromUrl = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromUrl) return fromUrl[1];

  if (/^[a-zA-Z0-9-_]+$/.test(raw)) return raw;
  return '';
}

export async function openSpreadsheet(auth, spreadsheetId) {
  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();
  return doc;
}

export function assertRequiredTabs(doc) {
  const missing = TAB_NAMES.filter((name) => !doc.sheetsByTitle[name]);
  if (missing.length) {
    throw Object.assign(
      new Error(
        `Workbook is missing required tab(s): ${missing.join(', ')}. Rename tabs to exactly Income, Expense, and Investment.`
      ),
      { statusCode: 400, code: 'invalidSheet' }
    );
  }
}

export async function createMuffinWorkbook(auth, title = 'Muffin Finances') {
  const doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(auth, {
    title,
  });

  // First sheet is created by default — rename and configure.
  const first = doc.sheetsByIndex[0];
  await first.updateProperties({ title: 'Income' });
  await first.setHeaderRow(HEADERS.Income);

  const expense = await doc.addSheet({ title: 'Expense' });
  await expense.setHeaderRow(HEADERS.Expense);

  const investment = await doc.addSheet({ title: 'Investment' });
  await investment.setHeaderRow(HEADERS.Investment);

  await doc.loadInfo();
  return doc;
}
