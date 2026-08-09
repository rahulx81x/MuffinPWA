function originFromEvent(event) {
  const headers = event?.headers || {};
  const origin = headers.origin || headers.Origin || '';
  const host = headers.host || headers.Host || '';
  const proto =
    headers['x-forwarded-proto'] ||
    headers['X-Forwarded-Proto'] ||
    (host.includes('localhost') ? 'http' : 'https');

  if (origin) return origin;
  if (host) return `${proto}://${host}`;
  return '';
}

export function corsHeaders(event) {
  const origin = originFromEvent(event) || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

export function json(event, statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(event),
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export function noContent(event, extraHeaders = {}) {
  return {
    statusCode: 204,
    headers: {
      ...corsHeaders(event),
      ...extraHeaders,
    },
    body: '',
  };
}

export function redirect(location, extraHeaders = {}) {
  return {
    statusCode: 302,
    headers: {
      Location: location,
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
    body: '',
  };
}

export function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), {
      statusCode: 400,
    });
  }
}

export function siteOrigin(event) {
  return originFromEvent(event) || 'http://localhost:8888';
}
