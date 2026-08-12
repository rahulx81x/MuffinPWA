import { oauthClientFromRefreshToken } from '../lib/googleAuth';
import { withSession } from '../lib/handler';
import { json, parseBody } from '../lib/http';
import {
  assertRequiredTabs,
  openSpreadsheet,
  parseSpreadsheetId,
} from '../lib/sheetBootstrap';
import { setUserSheet } from '../lib/userStore';

export const handler = withSession(
  async ({ event, session }) => {
    const body = parseBody(event);
    const spreadsheetId = parseSpreadsheetId(
      body.spreadsheetId || body.url || body.sheetUrl || ''
    );

    if (!spreadsheetId) {
      return json(event, 400, {
        error: 'Paste a Google Sheets URL or spreadsheet ID.',
        code: 'invalidSheetId',
      });
    }

    const auth = oauthClientFromRefreshToken(session.refreshToken);
    const doc = await openSpreadsheet(auth, spreadsheetId);
    assertRequiredTabs(doc);

    const record = await setUserSheet(session.sub, {
      spreadsheetId,
      spreadsheetTitle: doc.title || '',
    });

    return json(event, 200, {
      ok: true,
      spreadsheetId: record.spreadsheetId,
      spreadsheetTitle: record.spreadsheetTitle,
    });
  },
  { methods: ['POST', 'OPTIONS'] }
);
