import { json, noContent } from './http';
import { oauthConfigured } from './googleAuth';
import { requireSession, type SessionUser } from './session';
import { bindBlobsEvent } from './userStore';
import type { NetlifyEvent, NetlifyHandler, NetlifyResponse } from './types';

type HandlerContext = {
  event: NetlifyEvent;
  session: SessionUser;
};

type AuthedHandler = (
  ctx: HandlerContext
) => Promise<NetlifyResponse> | NetlifyResponse;

interface WithSessionOptions {
  methods?: string[];
  requireOAuthConfig?: boolean;
}

/**
 * Shared Netlify function wrapper: OPTIONS, method guard, Blobs bind, session.
 */
export function withSession(
  handler: AuthedHandler,
  options: WithSessionOptions = {}
): NetlifyHandler {
  const methods = options.methods;
  const requireOAuth = options.requireOAuthConfig !== false;

  return async (event) => {
    if (event.httpMethod === 'OPTIONS') {
      return noContent(event);
    }

    if (methods && !methods.includes(event.httpMethod)) {
      return json(event, 405, { error: 'Method Not Allowed' });
    }

    try {
      bindBlobsEvent(event);
      if (requireOAuth && !oauthConfigured()) {
        return json(event, 500, {
          error:
            'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and SESSION_SECRET.',
        });
      }

      const session = requireSession(event);
      return await handler({ event, session });
    } catch (error) {
      const err = error as { statusCode?: number; message?: string; code?: string };
      console.error('[muffin] handler error', error);
      return json(event, err?.statusCode || 500, {
        error: err?.message || 'Request failed.',
        code: err?.code,
      });
    }
  };
}
