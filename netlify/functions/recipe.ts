import { withSession } from '../lib/handler';
import { json, parseBody } from '../lib/http';
import {
  getUserRecipe,
  getUserRecord,
  setUserRecipe,
} from '../lib/userStore';

export const handler = withSession(
  async ({ event, session }) => {
    if (event.httpMethod === 'GET') {
      const record = await getUserRecord(session.sub);
      const recipe = getUserRecipe(record) || {
        openingBalance: 0,
        investments: [],
      };
      return json(event, 200, { recipe });
    }

    const body = parseBody(event);
    const recipe = await setUserRecipe(
      session.sub,
      body.recipe ?? body
    );
    return json(event, 200, { ok: true, recipe });
  },
  { methods: ['GET', 'PUT', 'OPTIONS'], requireOAuthConfig: false }
);
