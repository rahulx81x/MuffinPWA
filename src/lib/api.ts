import type { SheetRowData, SheetTabName, Transaction } from '../types';

const ENDPOINT = '/.netlify/functions/transactions';
const HEALTH_ENDPOINT = '/.netlify/functions/health';

/** Prevents a mis-detect from spinning re-auth navigation loops. */
const REAUTH_GUARD_KEY = 'muffin:netlify-session-reauth';
const REAUTH_GUARD_MS = 10_000;

export class NetlifySessionExpiredError extends Error {
  readonly code = 'NETLIFY_SESSION_EXPIRED' as const;

  constructor(message = 'Netlify site session expired') {
    super(message);
    this.name = 'NetlifySessionExpiredError';
  }
}

/**
 * Extract Netlify Edge Access login URL from the Login Redirect HTML body.
 * Rewrites requested_path to `/` so post-login returns to the app, not the
 * raw function URL that triggered the challenge.
 */
function parseEdgeAccessLoginUrl(html: string): string | null {
  const match = html.match(
    /https:\\\/\\\/app\.netlify\.com\\\/edge-access\?[^'"]+/i
  );
  if (!match) {
    const plain = html.match(
      /https:\/\/app\.netlify\.com\/edge-access\?[^'"\s<>]+/i
    );
    if (!plain) return null;
    try {
      const url = new URL(plain[0].replace(/&amp;/g, '&'));
      url.searchParams.set('requested_path', '/');
      return url.toString();
    } catch {
      return null;
    }
  }

  try {
    const unescaped = match[0]
      .replace(/\\\//g, '/')
      .replace(/\\u0026/g, '&');
    const url = new URL(unescaped);
    url.searchParams.set('requested_path', '/');
    return url.toString();
  } catch {
    return null;
  }
}

function beginNetlifyReauth(loginUrl?: string | null): void {
  try {
    const last = sessionStorage.getItem(REAUTH_GUARD_KEY);
    const now = Date.now();
    if (last && now - Number(last) < REAUTH_GUARD_MS) {
      return;
    }
    sessionStorage.setItem(REAUTH_GUARD_KEY, String(now));
  } catch {
    // sessionStorage may be unavailable; still attempt navigation
  }

  const target =
    loginUrl ||
    `${window.location.origin}/?reauth=${Date.now()}`;

  console.warn(
    '[muffin] Netlify Edge Access session expired. Navigating to login gate.',
    target
  );
  window.location.replace(target);
}

/**
 * Netlify Edge Access / Private Access intercepts unauthenticated requests to
 * `/.netlify/functions/*` with 401 + Login Redirect HTML. That HTML only works
 * as a document navigation (its script never runs inside fetch), so we must
 * top-level navigate to Edge Access instead of reloading the SW app shell.
 */
async function assertNetlifySession(response: Response): Promise<void> {
  const contentType = response.headers.get('content-type') ?? '';
  const isHtml = contentType.includes('text/html');
  const isAuthStatus = response.status === 401 || response.status === 403;
  const isOpaqueRedirect =
    response.type === 'opaqueredirect' ||
    (response.status >= 300 && response.status < 400);

  if (!response.redirected && !isHtml && !isAuthStatus && !isOpaqueRedirect) {
    return;
  }

  let loginUrl: string | null = null;
  if (isHtml || isAuthStatus) {
    try {
      const clone = response.clone();
      const text = await clone.text();
      if (
        text.includes('edge-access') ||
        text.includes('Login Redirect') ||
        isHtml
      ) {
        loginUrl = parseEdgeAccessLoginUrl(text);
      }
      // Auth status with non-login JSON body is a real API error — don't reauth.
      if (isAuthStatus && !isHtml && !loginUrl && !text.includes('Login Redirect')) {
        const looksLikeJson =
          contentType.includes('application/json') || text.trim().startsWith('{');
        if (looksLikeJson) {
          return;
        }
      }
    } catch {
      // ignore body read failures; still attempt re-auth on auth/HTML signals
    }
  }

  beginNetlifyReauth(loginUrl);
  throw new NetlifySessionExpiredError();
}

async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    redirect: 'follow',
  });
  await assertNetlifySession(response);
  return response;
}

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) return data.error;
  } catch {
    // ignore JSON parse errors
  }
  return `Request failed (${response.status})`;
}

export async function checkSessionHealth(): Promise<void> {
  const response = await apiFetch(HEALTH_ENDPOINT);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  const response = await apiFetch(ENDPOINT);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Transaction[];
}

export async function createTransaction(
  tabName: SheetTabName,
  rowData: SheetRowData
): Promise<void> {
  const response = await apiFetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabName, rowData }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function updateTransaction(
  tabName: SheetTabName,
  rowIndex: number,
  rowData: SheetRowData
): Promise<void> {
  const response = await apiFetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabName, rowIndex, rowData }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function deleteTransaction(
  tabName: SheetTabName,
  rowIndex: number
): Promise<void> {
  const response = await apiFetch(ENDPOINT, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabName, rowIndex }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}
