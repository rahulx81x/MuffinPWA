import { oauthClientFromRefreshToken } from '../lib/googleAuth.js';
import { json, noContent } from '../lib/http.js';
import { requireSession } from '../lib/session.js';
import { createMuffinWorkbook } from '../lib/sheetBootstrap.js';
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
    const auth = oauthClientFromRefreshToken(session.refreshToken);
    const doc = await createMuffinWorkbook(auth, 'Muffin Finances');

    const record = await setUserSheet(session.sub, {
      spreadsheetId: doc.spreadsheetId,
      spreadsheetTitle: doc.title || 'Muffin Finances',
    });

    return json(event, 201, {
      ok: true,
      spreadsheetId: record.spreadsheetId,
      spreadsheetTitle: record.spreadsheetTitle,
    });
  } catch (error) {
    console.error('sheet-create error', error);
    return json(event, error?.statusCode || 500, {
      error: error?.message || 'Could not create spreadsheet.',
    });
  }
}

