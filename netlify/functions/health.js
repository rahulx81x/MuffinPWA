import { oauthConfigured } from '../lib/googleAuth.js';
import { json, noContent } from '../lib/http.js';
import { readSession } from '../lib/session.js';

/**
 * Lightweight session probe for signed-in Google sessions.
 */
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return noContent(event);
  }

  if (event.httpMethod !== 'GET') {
    return json(event, 405, { error: 'Method not allowed' });
  }

  try {
    if (!oauthConfigured()) {
      return json(event, 500, {
        error: 'Google OAuth is not configured.',
        code: 'misconfigured',
      });
    }

    const session = readSession(event);
    if (!session) {
      return json(event, 401, {
        error: 'Not signed in.',
        code: 'unauthenticated',
      });
    }

    return json(event, 200, { ok: true });
  } catch (error) {
    return json(event, error?.statusCode || 500, {
      error: error?.message || 'Health check failed.',
    });
  }
}

