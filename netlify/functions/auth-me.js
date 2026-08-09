import { oauthConfigured } from '../lib/googleAuth.js';
import { json, noContent } from '../lib/http.js';
import { readSession } from '../lib/session.js';
import { bindBlobsEvent, getUserRecord } from '../lib/userStore.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return noContent(event);
  }

  if (event.httpMethod !== 'GET') {
    return json(event, 405, { error: 'Method Not Allowed' });
  }

  try {
    bindBlobsEvent(event);
    if (!oauthConfigured()) {
      return json(event, 500, {
        error:
          'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and SESSION_SECRET.',
      });
    }

    const session = readSession(event);
    if (!session) {
      return json(event, 401, { error: 'Not signed in.', code: 'unauthenticated' });
    }

    const record = await getUserRecord(session.sub);
    const spreadsheetId = record?.spreadsheetId || '';
    const spreadsheetTitle = record?.spreadsheetTitle || '';

    return json(event, 200, {
      user: {
        sub: session.sub,
        email: session.email,
        name: session.name,
        picture: session.picture,
      },
      spreadsheetId: spreadsheetId || null,
      spreadsheetTitle: spreadsheetTitle || null,
      needsSheet: !spreadsheetId,
    });
  } catch (error) {
    console.error('auth-me error', error);
    return json(event, error?.statusCode || 500, {
      error: error?.message || 'Failed to load session.',
    });
  }
}

