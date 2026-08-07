import type { SheetRowData, SheetTabName, Transaction } from '../types';

const ENDPOINT = '/.netlify/functions/transactions';
const HEALTH_ENDPOINT = '/.netlify/functions/health';

/** Prevents a mis-detect from spinning reload loops. */
const RELOAD_GUARD_KEY = 'muffin:netlify-session-reload';
const RELOAD_GUARD_MS = 10_000;

export class NetlifySessionExpiredError extends Error {
  readonly code = 'NETLIFY_SESSION_EXPIRED' as const;

  constructor(message = 'Netlify site session expired') {
    super(message);
    this.name = 'NetlifySessionExpiredError';
  }
}

function reloadForNetlifyLogin(): void {
  try {
    const last = sessionStorage.getItem(RELOAD_GUARD_KEY);
    const now = Date.now();
    if (last && now - Number(last) < RELOAD_GUARD_MS) {
      return;
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    // sessionStorage may be unavailable; still attempt reload
  }
  window.location.reload();
}

/**
 * Netlify Private Access intercepts unauthenticated requests to
 * `/.netlify/functions/*` with a 302 → HTML login page. When that happens
 * on an API call, `fetch` may follow the redirect and we receive HTML instead
 * of JSON — that is the signal the site session cookie has expired.
 */
function assertNetlifySession(response: Response): void {
  const contentType = response.headers.get('content-type') ?? '';
  const isHtml = contentType.includes('text/html');
  const isAuthStatus = response.status === 401 || response.status === 403;

  if (response.redirected || isHtml || isAuthStatus) {
    console.warn(
      '[muffin] Netlify session expired or missing: API returned HTML/auth redirect. Reloading so Netlify can show the login gate.'
    );
    reloadForNetlifyLogin();
    throw new NetlifySessionExpiredError();
  }
}

async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
  });
  assertNetlifySession(response);
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
