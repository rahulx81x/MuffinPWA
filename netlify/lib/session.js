import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { envValue, requireEnv } from './env.js';

export const SESSION_COOKIE = 'muffin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function keyFromSecret(secret) {
  return createHash('sha256').update(secret).digest();
}

function seal(payload, secret) {
  const key = keyFromSecret(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

function unseal(token, secret) {
  const key = keyFromSecret(secret);
  const raw = Buffer.from(token, 'base64url');
  if (raw.length < 28) return null;
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString('utf8'));
}

function parseCookies(header) {
  const out = {};
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

function useSecureCookies() {
  const redirectUri = envValue('GOOGLE_REDIRECT_URI');
  return Boolean(redirectUri) && !redirectUri.includes('localhost');
}

export function createSessionToken(session) {
  const secret = requireEnv('SESSION_SECRET');
  const payload = {
    ...session,
    exp: Date.now() + SESSION_TTL_MS,
  };
  return seal(payload, secret);
}

export function readSession(event) {
  const secret = requireEnv('SESSION_SECRET');
  const headers = event.headers || {};
  const cookieHeader = headers.cookie || headers.Cookie || '';
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  try {
    const payload = unseal(token, secret);
    if (!payload || typeof payload !== 'object') return null;
    if (!payload.exp || Date.now() > Number(payload.exp)) return null;
    if (!payload.sub || !payload.refreshToken) return null;
    return {
      sub: String(payload.sub),
      email: payload.email ? String(payload.email) : '',
      name: payload.name ? String(payload.name) : '',
      picture: payload.picture ? String(payload.picture) : '',
      refreshToken: String(payload.refreshToken),
    };
  } catch {
    return null;
  }
}

export function requireSession(event) {
  const session = readSession(event);
  if (!session) {
    throw Object.assign(new Error('Not signed in.'), { statusCode: 401 });
  }
  return session;
}

export function sessionCookieHeader(token, { clear = false } = {}) {
  const maxAge = clear ? 0 : Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    `${SESSION_COOKIE}=${clear ? '' : encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (useSecureCookies()) parts.push('Secure');
  return parts.join('; ');
}
