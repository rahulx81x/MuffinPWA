import { withSession } from '../lib/handler';
import { json } from '../lib/http';
import { markTourComplete } from '../lib/userStore';

export const handler = withSession(
  async ({ event, session }) => {
    await markTourComplete(session.sub);
    return json(event, 200, { ok: true, showTour: false });
  },
  { methods: ['POST', 'OPTIONS'], requireOAuthConfig: false }
);
