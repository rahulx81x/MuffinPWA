import { GoogleSpreadsheet } from 'google-spreadsheet';
import type { OAuth2Client } from 'google-auth-library';
import {
  RECIPE_TAB_HEADERS,
  RECIPE_TAB_NAME,
  TAB_HEADERS,
  TAB_NAMES,
  parseSpreadsheetId,
  serializeRecipeToRows,
  type SheetTabName,
} from '../../shared/index';

export { TAB_NAMES, parseSpreadsheetId };

export async function openSpreadsheet(
  auth: OAuth2Client,
  spreadsheetId: string
) {
  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();
  return doc;
}

export function assertRequiredTabs(doc: GoogleSpreadsheet) {
  const missing = TAB_NAMES.filter((name) => !doc.sheetsByTitle[name]);
  if (missing.length) {
    throw Object.assign(
      new Error(
        `Workbook is missing required tab(s): ${missing.join(', ')}. Rename tabs to exactly Income, Expense, and Investment.`
      ),
      { statusCode: 400, code: 'invalidSheet' }
    );
  }
}

export async function ensureRecipeTab(doc: GoogleSpreadsheet) {
  let sheet = doc.sheetsByTitle[RECIPE_TAB_NAME];
  if (!sheet) {
    sheet = await doc.addSheet({ title: RECIPE_TAB_NAME });
    await sheet.setHeaderRow([...RECIPE_TAB_HEADERS]);
    await doc.loadInfo();
  }
  return doc.sheetsByTitle[RECIPE_TAB_NAME] || sheet;
}

export async function createMuffinWorkbook(
  auth: OAuth2Client,
  title = 'Muffin Finances',
  initialRecipe?: { openingBalance: number; investments: Array<{ id?: string; type: string; amount: number }> }
) {
  const doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(auth, {
    title,
  });

  const first = doc.sheetsByIndex[0];
  await first.updateProperties({ title: 'Income' });
  await first.setHeaderRow(TAB_HEADERS.Income);

  const expense = await doc.addSheet({ title: 'Expense' });
  await expense.setHeaderRow(TAB_HEADERS.Expense);

  const investment = await doc.addSheet({ title: 'Investment' });
  await investment.setHeaderRow(TAB_HEADERS.Investment);

  const recipeSheet = await doc.addSheet({ title: RECIPE_TAB_NAME });
  await recipeSheet.setHeaderRow([...RECIPE_TAB_HEADERS]);

  const defaultRows = serializeRecipeToRows(
    initialRecipe || { openingBalance: 0, investments: [] }
  );
  if (defaultRows.length > 0) {
    await recipeSheet.addRows(defaultRows as unknown as Record<string, string | number>[]);
  }

  await doc.loadInfo();
  return doc;
}

export function headersForTab(tabName: SheetTabName) {
  return TAB_HEADERS[tabName];
}

