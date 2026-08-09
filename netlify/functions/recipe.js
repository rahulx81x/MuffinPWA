import { json, noContent, parseBody } from '../lib/http.js';
import { requireSession } from '../lib/session.js';
import {
  bindBlobsEvent,
  getUserRecipe,
  getUserRecord,
  setUserRecipe,
} from '../lib/userStore.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return noContent(event);
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'PUT') {
    return json(event, 405, { error: 'Method Not Allowed' });
  }

  try {
    bindBlobsEvent(event);
    const session = requireSession(event);

    if (event.httpMethod === 'GET') {
      const record = await getUserRecord(session.sub);
      const recipe = getUserRecipe(record) || {
        openingBalance: 0,
        investments: [],
      };
      return json(event, 200, { recipe });
    }

    const body = parseBody(event);
    const recipe = await setUserRecipe(session.sub, body.recipe ?? body);
    return json(event, 200, { ok: true, recipe });
  } catch (error) {
    console.error('recipe error', error);
    return json(event, error?.statusCode || 500, {
      error: error?.message || 'Failed to save recipe.',
    });
  }
}
