import { OAuth2Client } from 'google-auth-library';
import { envValue, requireEnv } from './env';

export const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
export const OPENID_SCOPES = ['openid', 'email', 'profile'];

export function getRedirectUri() {
  return requireEnv('GOOGLE_REDIRECT_URI');
}

export function createOAuthClient() {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri = getRedirectUri();

  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
    transporterOptions: {
      fetchImplementation: globalThis.fetch.bind(globalThis),
    },
  });
}

export function buildAuthUrl(state: string) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: [SHEETS_SCOPE, ...OPENID_SCOPES],
    state,
  });
}

export async function exchangeCode(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw Object.assign(
      new Error(
        'Google did not return a refresh token. Revoke app access and sign in again with consent.'
      ),
      { statusCode: 400 }
    );
  }
  client.setCredentials(tokens);

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: requireEnv('GOOGLE_CLIENT_ID'),
  });
  const payload =
    ticket.getPayload() || ({} as Record<string, string | undefined>);
  if (!payload.sub) {
    throw Object.assign(new Error('Google identity was incomplete.'), {
      statusCode: 400,
    });
  }

  return {
    refreshToken: tokens.refresh_token,
    user: {
      sub: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      picture: payload.picture || '',
    },
  };
}

export function oauthClientFromRefreshToken(refreshToken: string) {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export function oauthConfigured() {
  return Boolean(
    envValue('GOOGLE_CLIENT_ID') &&
      envValue('GOOGLE_CLIENT_SECRET') &&
      envValue('GOOGLE_REDIRECT_URI') &&
      envValue('SESSION_SECRET')
  );
}

export function isGoogleAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as {
    message?: string;
    code?: string | number;
    status?: number;
    statusCode?: number;
    response?: {
      status?: number;
      data?: {
        error?: string;
        error_description?: string;
      };
    };
  };

  const msg = String(err.message || '').toLowerCase();
  const resError = String(err.response?.data?.error || '').toLowerCase();
  const resDesc = String(
    err.response?.data?.error_description || ''
  ).toLowerCase();

  return (
    msg.includes('invalid_grant') ||
    msg.includes('token has been expired or revoked') ||
    msg.includes('invalid credentials') ||
    msg.includes('invalid_token') ||
    resError === 'invalid_grant' ||
    resDesc.includes('token has been expired or revoked') ||
    err.status === 401 ||
    err.statusCode === 401
  );
}

export async function verifyRefreshToken(
  refreshToken: string
): Promise<boolean> {
  try {
    const client = oauthClientFromRefreshToken(refreshToken);
    const tokenRes = await client.getAccessToken();
    return Boolean(tokenRes && tokenRes.token);
  } catch (error) {
    if (isGoogleAuthError(error)) {
      return false;
    }
    // If it was a temporary network error or non-auth issue, rethrow or return true to avoid false-positive logouts
    console.warn('[muffin] Error while verifying Google token:', error);
    throw error;
  }
}

