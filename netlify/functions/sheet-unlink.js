import { json, noContent } from '../lib/http.js';
import { requireSession } from '../lib/session.js';
import { bindBlobsEvent, clearUserSheet } from '../lib/userStore.js';

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
    await clearUserSheet(session.sub);
    return json(event, 200, { ok: true, needsSheet: true });
  } catch (error) {
    console.error('sheet-unlink error', error);
    return json(event, error?.statusCode || 500, {
      error: error?.message || 'Could not unlink spreadsheet.',
    });
  }
}

