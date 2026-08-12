import { oauthClientFromRefreshToken } from '../lib/googleAuth';
import { withSession } from '../lib/handler';
import { json } from '../lib/http';
import { createMuffinWorkbook } from '../lib/sheetBootstrap';
import { setUserSheet } from '../lib/userStore';

export const handler = withSession(
  async ({ event, session }) => {
    const auth = oauthClientFromRefreshToken(session.refreshToken);
    const doc = await createMuffinWorkbook(auth, 'Muffin Finances');

    const record = await setUserSheet(session.sub, {
      spreadsheetId: doc.spreadsheetId,
      spreadsheetTitle: doc.title || 'Muffin Finances',
    });

    return json(event, 201, {
      ok: true,
      spreadsheetId: record.spreadsheetId,
      spreadsheetTitle: record.spreadsheetTitle,
    });
  },
  { methods: ['POST', 'OPTIONS'] }
);
