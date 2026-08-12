import { json, noContent, siteOrigin } from '../lib/http';
import { sessionCookieHeader } from '../lib/session';
import type { NetlifyEvent } from '../lib/types';

export async function handler(event: NetlifyEvent) {
  if (event.httpMethod === 'OPTIONS') {
    return noContent(event);
  }

  const clear = sessionCookieHeader('', { clear: true });

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 302,
      headers: {
        Location: `${siteOrigin(event)}/`,
        'Set-Cookie': clear,
        'Cache-Control': 'no-store',
      },
      body: '',
    };
  }

  if (event.httpMethod === 'POST') {
    return json(event, 200, { ok: true }, { 'Set-Cookie': clear });
  }

  return json(event, 405, { error: 'Method Not Allowed' });
}
