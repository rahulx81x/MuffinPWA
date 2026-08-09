import { randomBytes } from 'node:crypto';
import { buildAuthUrl, oauthConfigured } from '../lib/googleAuth.js';
import { json, noContent, redirect } from '../lib/http.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return noContent(event);
  }

  if (event.httpMethod !== 'GET') {
    return json(event, 405, { error: 'Method Not Allowed' });
  }

  try {
    if (!oauthConfigured()) {
      return json(event, 500, {
        error:
          'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and SESSION_SECRET.',
      });
    }

    const state = randomBytes(16).toString('hex');
    const url = buildAuthUrl(state);
    const cookie = [
      `muffin_oauth_state=${encodeURIComponent(state)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=600',
    ];
    if (!String(process.env.GOOGLE_REDIRECT_URI || '').includes('localhost')) {
      cookie.push('Secure');
    }

    return redirect(url, { 'Set-Cookie': cookie.join('; ') });
  } catch (error) {
    console.error('auth-start error', error);
    return json(event, error?.statusCode || 500, {
      error: error?.message || 'Failed to start Google sign-in.',
    });
  }
}

