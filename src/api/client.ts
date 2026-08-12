import type {
  ExpectedRow,
  RecipeConfig,
  SheetRowData,
  SheetTabName,
  Transaction,
} from '@shared';

const TRANSACTIONS = '/.netlify/functions/transactions';
const HEALTH = '/.netlify/functions/health';
const AUTH_ME = '/.netlify/functions/auth-me';
const AUTH_LOGOUT = '/.netlify/functions/auth-logout';
const SHEET_LINK = '/.netlify/functions/sheet-link';
const SHEET_CREATE = '/.netlify/functions/sheet-create';
const SHEET_UNLINK = '/.netlify/functions/sheet-unlink';
const RECIPE = '/.netlify/functions/recipe';
const TOUR_COMPLETE = '/.netlify/functions/tour-complete';

export const AUTH_START_URL = '/.netlify/functions/auth-start';

export class AuthRequiredError extends Error {
  readonly code = 'unauthenticated' as const;

  constructor(message = 'Not signed in') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export class NeedsSheetError extends Error {
  readonly code = 'needsSheet' as const;

  constructor(message = 'No spreadsheet linked yet') {
    super(message);
    this.name = 'NeedsSheetError';
  }
}

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

export type RecipePayload = RecipeConfig;

export interface AuthMeResponse {
  user: AuthUser;
  spreadsheetId: string | null;
  spreadsheetTitle: string | null;
  needsSheet: boolean;
  /** Null when the user has never saved a recipe to Blobs. */
  recipe: RecipePayload | null;
  /** True only for first-time users who have not finished / skipped the tour. */
  showTour: boolean;
}

export interface MutationResult {
  ok: boolean;
  transactions: Transaction[];
}

async function readErrorPayload(
  response: Response
): Promise<{ error?: string; code?: string }> {
  try {
    return (await response.json()) as { error?: string; code?: string };
  } catch {
    return {};
  }
}

async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'include',
    redirect: 'follow',
  });
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;

  const data = await readErrorPayload(response);
  if (response.status === 401 || data.code === 'unauthenticated') {
    throw new AuthRequiredError(data.error || 'Not signed in');
  }
  if (data.code === 'needsSheet') {
    throw new NeedsSheetError(data.error || 'No spreadsheet linked yet');
  }
  throw new Error(data.error || `Request failed (${response.status})`);
}

export async function getMe(): Promise<AuthMeResponse | null> {
  const response = await apiFetch(AUTH_ME);
  if (response.status === 401) return null;
  await assertOk(response);
  return (await response.json()) as AuthMeResponse;
}

export async function checkSessionHealth(): Promise<void> {
  const response = await apiFetch(HEALTH);
  await assertOk(response);
}

export async function logout(): Promise<void> {
  const response = await apiFetch(AUTH_LOGOUT, { method: 'POST' });
  await assertOk(response);
}

export async function linkSheet(spreadsheetIdOrUrl: string): Promise<{
  spreadsheetId: string;
  spreadsheetTitle: string;
}> {
  const response = await apiFetch(SHEET_LINK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheetId: spreadsheetIdOrUrl }),
  });
  await assertOk(response);
  return (await response.json()) as {
    spreadsheetId: string;
    spreadsheetTitle: string;
  };
}

export async function createSheet(title?: string): Promise<{
  spreadsheetId: string;
  spreadsheetTitle: string;
}> {
  const trimmed = title?.trim();
  const response = await apiFetch(SHEET_CREATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trimmed ? { title: trimmed } : {}),
  });
  await assertOk(response);
  return (await response.json()) as {
    spreadsheetId: string;
    spreadsheetTitle: string;
  };
}

export async function unlinkSheet(): Promise<void> {
  const response = await apiFetch(SHEET_UNLINK, { method: 'POST' });
  await assertOk(response);
}

export async function saveRecipe(
  recipe: RecipePayload
): Promise<RecipePayload> {
  const response = await apiFetch(RECIPE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe }),
  });
  await assertOk(response);
  const data = (await response.json()) as { recipe: RecipePayload };
  return data.recipe;
}

export async function completeTour(): Promise<void> {
  const response = await apiFetch(TOUR_COMPLETE, { method: 'POST' });
  await assertOk(response);
}

export async function getTransactions(): Promise<Transaction[]> {
  const response = await apiFetch(TRANSACTIONS);
  await assertOk(response);
  return (await response.json()) as Transaction[];
}

async function readMutationResult(response: Response): Promise<MutationResult> {
  await assertOk(response);
  const data = (await response.json()) as MutationResult;
  return {
    ok: Boolean(data.ok),
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
  };
}

export async function createTransaction(
  tabName: SheetTabName,
  rowData: SheetRowData
): Promise<MutationResult> {
  const response = await apiFetch(TRANSACTIONS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabName, rowData }),
  });
  return readMutationResult(response);
}

export async function updateTransaction(
  tabName: SheetTabName,
  rowIndex: number,
  rowData: SheetRowData,
  expectedRow?: ExpectedRow,
  rowId?: string
): Promise<MutationResult> {
  const response = await apiFetch(TRANSACTIONS, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabName, rowIndex, rowData, expectedRow, rowId }),
  });
  return readMutationResult(response);
}

export async function deleteTransaction(
  tabName: SheetTabName,
  rowIndex: number,
  expectedRow?: ExpectedRow,
  rowId?: string
): Promise<MutationResult> {
  const response = await apiFetch(TRANSACTIONS, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabName, rowIndex, expectedRow, rowId }),
  });
  return readMutationResult(response);
}
