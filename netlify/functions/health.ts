import { oauthConfigured } from '../lib/googleAuth';
import { json, noContent } from '../lib/http';
import { readSession } from '../lib/session';
import type { NetlifyEvent } from '../lib/types';

export async function handler(event: NetlifyEvent) {
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
    const err = error as { statusCode?: number; message?: string };
    return json(event, err?.statusCode || 500, {
      error: err?.message || 'Health check failed.',
    });
  }
}
