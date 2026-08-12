import { oauthClientFromRefreshToken } from '../lib/googleAuth';
import { withSession } from '../lib/handler';
import { json, parseBody } from '../lib/http';
import { createMuffinWorkbook } from '../lib/sheetBootstrap';
import { getUserRecord, setUserSheet } from '../lib/userStore';

const DEFAULT_TITLE = 'Muffin Finances';

export const handler = withSession(
  async ({ event, session }) => {
    // Idempotent: never create a second Drive file if one is already linked.
    const existing = await getUserRecord(session.sub);
    if (existing?.spreadsheetId) {
      return json(event, 200, {
        ok: true,
        spreadsheetId: existing.spreadsheetId,
        spreadsheetTitle: existing.spreadsheetTitle || DEFAULT_TITLE,
        alreadyLinked: true,
      });
    }

    const body = parseBody(event);
    const title =
      String(body.title || body.name || '')
        .trim()
        .slice(0, 120) || DEFAULT_TITLE;

    const auth = oauthClientFromRefreshToken(session.refreshToken);
    const doc = await createMuffinWorkbook(auth, title);

    const record = await setUserSheet(session.sub, {
      spreadsheetId: doc.spreadsheetId,
      spreadsheetTitle: doc.title || title,
    });

    return json(event, 201, {
      ok: true,
      spreadsheetId: record.spreadsheetId,
      spreadsheetTitle: record.spreadsheetTitle,
    });
  },
  { methods: ['POST', 'OPTIONS'] }
);
