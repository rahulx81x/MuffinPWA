import { connectLambda, getStore } from '@netlify/blobs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  sanitizeRecipe,
  type RecipeConfig,
} from '../../shared/index';
import { envValue } from './env';
import type { NetlifyEvent } from './types';

const STORE_NAME = 'muffin-users';
const FS_DIR = path.join(process.cwd(), '.netlify', 'muffin-users');

export interface UserRecord {
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  linkedAt?: string | null;
  recipe?: RecipeConfig & { updatedAt?: string };
  tourCompletedAt?: string;
}

/**
 * Wire Blobs context from a Netlify Functions v1 Lambda event when present.
 */
export function bindBlobsEvent(event: NetlifyEvent) {
  try {
    if (event && typeof event.blobs === 'string' && event.blobs.length > 0) {
      connectLambda(event as never);
    }
  } catch (error) {
    console.warn('[muffin] connectLambda failed', error);
  }
}

function tryGetBlobsStore() {
  const siteID =
    envValue('NETLIFY_BLOBS_SITE_ID') ||
    envValue('NETLIFY_SITE_ID') ||
    envValue('SITE_ID');
  const token =
    envValue('NETLIFY_BLOBS_TOKEN') || envValue('NETLIFY_AUTH_TOKEN');

  try {
    if (siteID && token) {
      return getStore({ name: STORE_NAME, siteID, token });
    }
    return getStore(STORE_NAME);
  } catch (error) {
    const err = error as { name?: string; message?: string };
    const message = err?.message || '';
    if (
      err?.name === 'MissingBlobsEnvironmentError' ||
      /not been configured to use Netlify Blobs/i.test(message)
    ) {
      return null;
    }
    throw error;
  }
}

function sanitizeKey(key: string) {
  return String(key).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function isLocalDev() {
  return (
    process.env.NETLIFY_DEV === 'true' ||
    process.env.CONTEXT === 'dev' ||
    /localhost/i.test(envValue('GOOGLE_REDIRECT_URI'))
  );
}

function blobsUnavailableError() {
  return Object.assign(
    new Error(
      'Netlify Blobs is not available. On production, redeploy the site so Blobs context is injected. For local-only use, the filesystem fallback should activate automatically.'
    ),
    { statusCode: 500 }
  );
}

async function readRaw(key: string) {
  const store = tryGetBlobsStore();
  if (store) {
    return store.get(key, { type: 'text' });
  }

  if (!isLocalDev()) {
    throw blobsUnavailableError();
  }

  console.warn(
    '[muffin] Netlify Blobs unavailable — using local .netlify/muffin-users fallback (dev only).'
  );
  try {
    return await readFile(path.join(FS_DIR, `${sanitizeKey(key)}.json`), 'utf8');
  } catch {
    return null;
  }
}

async function writeRaw(key: string, value: string) {
  const store = tryGetBlobsStore();
  if (store) {
    await store.set(key, value, {
      metadata: { contentType: 'application/json' },
    });
    return;
  }

  if (!isLocalDev()) {
    throw blobsUnavailableError();
  }

  await mkdir(FS_DIR, { recursive: true });
  await writeFile(
    path.join(FS_DIR, `${sanitizeKey(key)}.json`),
    value,
    'utf8'
  );
}

export async function getUserRecord(
  googleSub: string
): Promise<UserRecord | null> {
  if (!googleSub) return null;
  const raw = await readRaw(googleSub);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserRecord;
  } catch {
    return null;
  }
}

export async function setUserSheet(
  googleSub: string,
  {
    spreadsheetId,
    spreadsheetTitle,
  }: { spreadsheetId: string; spreadsheetTitle?: string }
) {
  const existing = (await getUserRecord(googleSub)) || {};
  const next: UserRecord = {
    ...existing,
    spreadsheetId,
    spreadsheetTitle: spreadsheetTitle || existing.spreadsheetTitle || '',
    linkedAt: new Date().toISOString(),
  };
  await writeRaw(googleSub, JSON.stringify(next));
  return next;
}

export async function clearUserSheet(googleSub: string) {
  const existing = (await getUserRecord(googleSub)) || {};
  const next: UserRecord = {
    ...existing,
    spreadsheetId: '',
    spreadsheetTitle: '',
    linkedAt: null,
  };
  await writeRaw(googleSub, JSON.stringify(next));
  return next;
}

export function getUserRecipe(record: UserRecord | null) {
  if (!record || record.recipe == null) return null;
  return sanitizeRecipe(record.recipe);
}

export async function setUserRecipe(googleSub: string, recipe: unknown) {
  const existing = (await getUserRecord(googleSub)) || {};
  const nextRecipe = sanitizeRecipe(recipe);
  const next: UserRecord = {
    ...existing,
    recipe: {
      ...nextRecipe,
      updatedAt: new Date().toISOString(),
    },
  };
  await writeRaw(googleSub, JSON.stringify(next));
  return nextRecipe;
}

const RETURNING_USER_LINK_AGE_MS = 60 * 60 * 1000; // 1 hour

export function shouldShowTour(record: UserRecord | null) {
  if (!record) return true;
  if (record.tourCompletedAt) return false;

  if (record.linkedAt) {
    const linked = Date.parse(record.linkedAt);
    if (
      Number.isFinite(linked) &&
      Date.now() - linked > RETURNING_USER_LINK_AGE_MS
    ) {
      return false;
    }
  }

  if (record.recipe != null) return false;

  return true;
}

export async function markTourComplete(googleSub: string) {
  const existing = (await getUserRecord(googleSub)) || {};
  if (existing.tourCompletedAt) {
    return existing;
  }
  const next: UserRecord = {
    ...existing,
    tourCompletedAt: new Date().toISOString(),
  };
  await writeRaw(googleSub, JSON.stringify(next));
  return next;
}
