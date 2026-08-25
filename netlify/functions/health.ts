import { isGoogleAuthError, oauthConfigured, verifyRefreshToken } from '../lib/googleAuth';
import { json, noContent } from '../lib/http';
import { readSession, sessionCookieHeader } from '../lib/session';
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

    // Verify whether Google refresh token is still active (e.g. not hit 7-day testing expiry or revocation)
    const valid = await verifyRefreshToken(session.refreshToken);
    if (!valid) {
      const clearCookie = sessionCookieHeader('', { clear: true });
      return json(
        event,
        401,
        {
          error:
            'Google authorization expired or revoked. Please sign in again.',
          code: 'unauthenticated',
          reason: 'invalid_grant',
        },
        { 'Set-Cookie': clearCookie }
      );
    }

    return json(event, 200, { ok: true });
  } catch (error) {
    if (isGoogleAuthError(error)) {
      const clearCookie = sessionCookieHeader('', { clear: true });
      return json(
        event,
        401,
        {
          error:
            'Google authorization expired or revoked. Please sign in again.',
          code: 'unauthenticated',
          reason: 'invalid_grant',
        },
        { 'Set-Cookie': clearCookie }
      );
    }

    const err = error as { statusCode?: number; message?: string };
    return json(event, err?.statusCode || 500, {
      error: err?.message || 'Health check failed.',
    });
  }
}

