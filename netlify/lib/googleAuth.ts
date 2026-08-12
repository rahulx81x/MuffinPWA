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
  const payload = ticket.getPayload() || {};
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
