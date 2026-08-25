import { isGoogleAuthError, oauthConfigured } from '../lib/googleAuth';
import { json, noContent } from '../lib/http';
import { getOrMigrateUserRecipe } from '../lib/recipeStore';
import { readSession, sessionCookieHeader } from '../lib/session';
import {
  bindBlobsEvent,
  getUserRecord,
  markTourComplete,
  shouldShowTour,
} from '../lib/userStore';
import type { NetlifyEvent } from '../lib/types';

export async function handler(event: NetlifyEvent) {
  if (event.httpMethod === 'OPTIONS') {
    return noContent(event);
  }

  if (event.httpMethod !== 'GET') {
    return json(event, 405, { error: 'Method Not Allowed' });
  }

  try {
    bindBlobsEvent(event);
    if (!oauthConfigured()) {
      return json(event, 500, {
        error:
          'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and SESSION_SECRET.',
      });
    }

    const session = readSession(event);
    if (!session) {
      return json(event, 401, {
        error: 'Not signed in.',
        code: 'unauthenticated',
      });
    }

    let record = await getUserRecord(session.sub);
    let showTour = shouldShowTour(record);

    if (
      record &&
      !record.tourCompletedAt &&
      !showTour &&
      (record.spreadsheetId || record.recipe != null)
    ) {
      record = await markTourComplete(session.sub);
      showTour = false;
    }

    const spreadsheetId = record?.spreadsheetId || '';
    const spreadsheetTitle = record?.spreadsheetTitle || '';
    const recipe = await getOrMigrateUserRecipe(session, record);


    return json(event, 200, {
      user: {
        sub: session.sub,
        email: session.email,
        name: session.name,
        picture: session.picture,
      },
      spreadsheetId: spreadsheetId || null,
      spreadsheetTitle: spreadsheetTitle || null,
      needsSheet: !spreadsheetId,
      recipe,
      showTour,
    });
  } catch (error) {
    if (isGoogleAuthError(error)) {
      const clearCookie = sessionCookieHeader('', { clear: true });
      return json(
        event,
        401,
        {
          error:
            'Google authorization expired or revoked. Please sign in again.',
          code: 'unauthenticated',
          reason: 'invalid_grant',
        },
        { 'Set-Cookie': clearCookie }
      );
    }

    const err = error as { statusCode?: number; message?: string };
    console.error('auth-me error', error);
    return json(event, err?.statusCode || 500, {
      error: err?.message || 'Failed to load session.',
    });
  }
}

