import { oauthClientFromRefreshToken } from '../lib/googleAuth.js';
import { json, noContent, parseBody } from '../lib/http.js';
import { requireSession } from '../lib/session.js';
import {
  assertRequiredTabs,
  openSpreadsheet,
  parseSpreadsheetId,
} from '../lib/sheetBootstrap.js';
import { bindBlobsEvent, setUserSheet } from '../lib/userStore.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return noContent(event);
  }

  if (event.httpMethod !== 'POST') {
    return json(event, 405, { error: 'Method Not Allowed' });
  }

  try {
    bindBlobsEvent(event);
    const session = requireSession(event);
    const body = parseBody(event);
    const spreadsheetId = parseSpreadsheetId(
      body.spreadsheetId || body.url || body.sheetUrl || ''
    );

    if (!spreadsheetId) {
      return json(event, 400, {
        error: 'Paste a Google Sheets URL or spreadsheet ID.',
        code: 'invalidSheetId',
      });
    }

    const auth = oauthClientFromRefreshToken(session.refreshToken);
    const doc = await openSpreadsheet(auth, spreadsheetId);
    assertRequiredTabs(doc);

    const record = await setUserSheet(session.sub, {
      spreadsheetId,
      spreadsheetTitle: doc.title || '',
    });

    return json(event, 200, {
      ok: true,
      spreadsheetId: record.spreadsheetId,
      spreadsheetTitle: record.spreadsheetTitle,
    });
  } catch (error) {
    console.error('sheet-link error', error);
    const statusCode = error?.statusCode || 500;
    return json(event, statusCode, {
      error: error?.message || 'Could not link spreadsheet.',
      code: error?.code,
    });
  }
}

