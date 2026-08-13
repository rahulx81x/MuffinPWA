import { OAuth2Client } from 'google-auth-library';
import { oauthClientFromRefreshToken } from '../lib/googleAuth';
import { withSession } from '../lib/handler';
import { json, parseBody } from '../lib/http';
import {
  getOrMigrateUserRecipe,
  saveRecipeToSheet,
} from '../lib/recipeStore';
import {
  getUserRecord,
  purgeLegacyBlobRecipe,
  setUserRecipe,
} from '../lib/userStore';

export const handler = withSession(
  async ({ event, session }) => {
    const record = await getUserRecord(session.sub);

    if (event.httpMethod === 'GET') {
      const recipe = await getOrMigrateUserRecipe(session, record);
      return json(event, 200, { recipe });
    }

    const body = parseBody(event);
    const rawRecipe = body.recipe ?? body;

    let recipe;
    if (record?.spreadsheetId) {
      const auth = oauthClientFromRefreshToken(session.refreshToken);
      if (auth instanceof OAuth2Client) {
        recipe = await saveRecipeToSheet(auth, record.spreadsheetId, rawRecipe);
        await purgeLegacyBlobRecipe(session.sub);
      } else {
        recipe = await setUserRecipe(session.sub, rawRecipe);
      }
    } else {
      recipe = await setUserRecipe(session.sub, rawRecipe);
    }

    return json(event, 200, { ok: true, recipe });
  },
  { methods: ['GET', 'PUT', 'OPTIONS'], requireOAuthConfig: false }
);

