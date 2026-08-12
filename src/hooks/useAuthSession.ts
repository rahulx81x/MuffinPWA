import { useCallback, useEffect, useState } from 'react';
import {
  clearRecipeConfig,
  getRecipeConfig,
  hasMeaningfulRecipe,
  hydrateRecipeConfig,
} from '../config';
import {
  AuthRequiredError,
  checkSessionHealth,
  getMe,
  logout,
  saveRecipe,
  type AuthMeResponse,
} from '../api/client';

const SESSION_PROBE_MIN_INTERVAL_MS = 30_000;

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  denied: 'Google sign-in was denied.',
  missing_code: 'Missing authorization code. Try signing in again.',
  invalid_state: 'Invalid OAuth state. Try signing in again.',
  invalid_method: 'Invalid sign-in method.',
  failed: 'Google sign-in failed. Try again.',
};

const OAUTH_QUERY_KEYS = [
  'authError',
  'code',
  'state',
  'scope',
  'error',
  'error_description',
  'prompt',
  'authuser',
  'hd',
  'session_state',
] as const;

/** Strip OAuth junk from the address bar and map short auth error codes. */
export function readAuthErrorFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('authError');
    const message = raw
      ? AUTH_ERROR_MESSAGES[raw] ||
        (raw.length > 120 ? AUTH_ERROR_MESSAGES.failed : raw)
      : null;

    let dirty = Boolean(raw);
    for (const key of OAUTH_QUERY_KEYS) {
      if (params.has(key)) {
        params.delete(key);
        dirty = true;
      }
    }

    const onFunctionPath = window.location.pathname.includes(
      '/.netlify/functions/'
    );
    if (dirty || onFunctionPath) {
      const path = onFunctionPath ? '/' : window.location.pathname;
      const query = params.toString();
      window.history.replaceState(
        {},
        '',
        `${path}${query ? `?${query}` : ''}`
      );
    }

    return message;
  } catch {
    return null;
  }
}

async function syncRecipeFromAuth(me: AuthMeResponse) {
  if (me.recipe) {
    hydrateRecipeConfig(me.recipe);
    return;
  }

  const local = getRecipeConfig();
  if (!hasMeaningfulRecipe(local)) return;
  try {
    const saved = await saveRecipe(local);
    hydrateRecipeConfig(saved);
  } catch (err) {
    console.warn('Could not migrate local recipe to Blobs', err);
  }
}

export function useAuthSession() {
  const [authBooting, setAuthBooting] = useState(true);
  const [auth, setAuth] = useState<AuthMeResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(() =>
    readAuthErrorFromUrl()
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const needsSheet = Boolean(auth && auth.needsSheet);
  const ready = Boolean(auth && !auth.needsSheet);

  const refreshAuth = useCallback(async () => {
    const me = await getMe();
    setAuth(me);
    if (me) await syncRecipeFromAuth(me);
    return me;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setAuthBooting(true);
      try {
        const me = await getMe();
        if (cancelled) return;
        setAuth(me);
        if (me) await syncRecipeFromAuth(me);
      } catch (err) {
        console.error('Auth bootstrap failed', err);
        if (!cancelled) {
          setAuth(null);
          setAuthError(
            err instanceof Error
              ? err.message
              : 'Could not check sign-in status.'
          );
        }
      } finally {
        if (!cancelled) setAuthBooting(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    let lastProbeAt = Date.now();
    let hiddenAt: number | null = null;
    let probing = false;

    async function probeSession(force = false) {
      if (document.visibilityState !== 'visible') return;
      if (probing) return;
      const now = Date.now();
      if (!force && now - lastProbeAt < SESSION_PROBE_MIN_INTERVAL_MS) return;

      probing = true;
      try {
        await checkSessionHealth();
        lastProbeAt = Date.now();
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          setAuth(null);
          setStatusMessage('Signed out — please sign in again.');
          return;
        }
        console.warn('[muffin] Session health probe failed', err);
      } finally {
        probing = false;
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      const awayMs = hiddenAt == null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      void probeSession(awayMs >= SESSION_PROBE_MIN_INTERVAL_MS);
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        void probeSession(true);
      }
    }

    function onFocus() {
      const awayMs = hiddenAt == null ? 0 : Date.now() - hiddenAt;
      if (awayMs >= SESSION_PROBE_MIN_INTERVAL_MS) {
        void probeSession(true);
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', onFocus);
    };
  }, [ready]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Logout request failed', err);
    }
    clearRecipeConfig();
    setAuth(null);
    setStatusMessage(null);
  }, []);

  return {
    authBooting,
    auth,
    setAuth,
    authError,
    needsSheet,
    ready,
    statusMessage,
    setStatusMessage,
    refreshAuth,
    handleLogout,
  };
}
