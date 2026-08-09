import { connectLambda, getStore } from '@netlify/blobs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { envValue } from './env.js';

const STORE_NAME = 'muffin-users';
const FS_DIR = path.join(process.cwd(), '.netlify', 'muffin-users');

/**
 * Wire Blobs context from a Netlify Functions v1 Lambda event when present
 * (production injects `event.blobs`; local netlify dev does too when the site is linked).
 */
export function bindBlobsEvent(event) {
  try {
    if (event && typeof event.blobs === 'string' && event.blobs.length > 0) {
      connectLambda(event);
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
    envValue('NETLIFY_BLOBS_TOKEN') ||
    envValue('NETLIFY_AUTH_TOKEN');

  try {
    if (siteID && token) {
      return getStore({ name: STORE_NAME, siteID, token });
    }
    return getStore(STORE_NAME);
  } catch (error) {
    const message = error?.message || '';
    if (
      error?.name === 'MissingBlobsEnvironmentError' ||
      /not been configured to use Netlify Blobs/i.test(message)
    ) {
      return null;
    }
    throw error;
  }
}

function sanitizeKey(key) {
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

async function readRaw(key) {
  const store = tryGetBlobsStore();
  if (store) {
    return store.get(key, { type: 'text' });
  }

  if (!isLocalDev()) {
    throw blobsUnavailableError();
  }

  // Free local fallback when Blobs context is missing (unlinked netlify dev).
  console.warn(
    '[muffin] Netlify Blobs unavailable — using local .netlify/muffin-users fallback (dev only).'
  );
  try {
    return await readFile(path.join(FS_DIR, `${sanitizeKey(key)}.json`), 'utf8');
  } catch {
    return null;
  }
}

async function writeRaw(key, value) {
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

export async function getUserRecord(googleSub) {
  if (!googleSub) return null;
  const raw = await readRaw(googleSub);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setUserSheet(googleSub, { spreadsheetId, spreadsheetTitle }) {
  const existing = (await getUserRecord(googleSub)) || {};
  const next = {
    ...existing,
    spreadsheetId,
    spreadsheetTitle: spreadsheetTitle || existing.spreadsheetTitle || '',
    linkedAt: new Date().toISOString(),
  };
  await writeRaw(googleSub, JSON.stringify(next));
  return next;
}

export async function clearUserSheet(googleSub) {
  const existing = (await getUserRecord(googleSub)) || {};
  const next = {
    ...existing,
    spreadsheetId: '',
    spreadsheetTitle: '',
    linkedAt: null,
  };
  await writeRaw(googleSub, JSON.stringify(next));
  return next;
}
