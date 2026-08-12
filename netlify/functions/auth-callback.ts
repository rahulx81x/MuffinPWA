import { exchangeCode } from '../lib/googleAuth';
import { redirect, siteOrigin } from '../lib/http';
import { createSessionToken, sessionCookieHeader } from '../lib/session';
import type { NetlifyEvent } from '../lib/types';

function parseCookies(header: string) {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export async function handler(event: NetlifyEvent) {
  const origin = siteOrigin(event);
  const fail = (code: string) =>
    redirect(`${origin}/?authError=${encodeURIComponent(code)}`);

  try {
    if (event.httpMethod !== 'GET') {
      return fail('invalid_method');
    }

    const params = event.queryStringParameters || {};
    if (params.error) {
      return fail('denied');
    }

    const code = params.code;
    const state = params.state;
    if (!code) return fail('missing_code');

    const cookies = parseCookies(
      event.headers?.cookie || event.headers?.Cookie || ''
    );
    const expected = cookies.muffin_oauth_state;
    if (!expected || !state || expected !== state) {
      return fail('invalid_state');
    }

    const { refreshToken, user } = await exchangeCode(code);
    const token = createSessionToken({
      sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      refreshToken,
    });

    const clearState = [
      'muffin_oauth_state=',
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0',
    ].join('; ');

    return {
      statusCode: 302,
      headers: {
        Location: `${origin}/`,
        'Cache-Control': 'no-store',
      },
      multiValueHeaders: {
        'Set-Cookie': [sessionCookieHeader(token), clearState],
      },
      body: '',
    };
  } catch (error) {
    console.error('auth-callback error', error);
    return fail('failed');
  }
}
