import { withSession } from '../lib/handler';
import { json } from '../lib/http';
import { clearUserSheet } from '../lib/userStore';

export const handler = withSession(
  async ({ event, session }) => {
    await clearUserSheet(session.sub);
    return json(event, 200, { ok: true, needsSheet: true });
  },
  { methods: ['POST', 'OPTIONS'], requireOAuthConfig: false }
);
