import { json, noContent } from '../lib/http.js';
import { requireSession } from '../lib/session.js';
import { bindBlobsEvent, markTourComplete } from '../lib/userStore.js';

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
    await markTourComplete(session.sub);
    return json(event, 200, { ok: true, showTour: false });
  } catch (error) {
    console.error('tour-complete error', error);
    return json(event, error?.statusCode || 500, {
      error: error?.message || 'Failed to save tour progress.',
    });
  }
}
