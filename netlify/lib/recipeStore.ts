import { OAuth2Client } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import {
  RECIPE_TAB_HEADERS,
  RECIPE_TAB_NAME,
  getDefaultRecipeConfig,
  hasMeaningfulRecipe,
  parseRecipeFromRows,
  sanitizeRecipe,
  serializeRecipeToRows,
  type RecipeConfig,
} from '../../shared/index';
import { oauthClientFromRefreshToken } from './googleAuth';
import { ensureRecipeTab, openSpreadsheet } from './sheetBootstrap';
import {
  getUserRecipe,
  purgeLegacyBlobRecipe,
  type UserRecord,
} from './userStore';
import type { SessionUser } from './session';

export async function fetchRecipeFromSheet(
  auth: OAuth2Client,
  spreadsheetId: string
): Promise<RecipeConfig> {
  const doc = await openSpreadsheet(auth, spreadsheetId);
  const sheet = await ensureRecipeTab(doc);
  const rows = await sheet.getRows();
  const parsed = parseRecipeFromRows(rows);
  return sanitizeRecipe(parsed);
}

export async function saveRecipeToSheet(
  auth: OAuth2Client,
  spreadsheetId: string,
  rawRecipe: unknown
): Promise<RecipeConfig> {
  const recipe = sanitizeRecipe(rawRecipe);
  const doc = await openSpreadsheet(auth, spreadsheetId);
  const sheet = await ensureRecipeTab(doc);

  // Clear existing rows preserving header row
  await sheet.clearRows();

  const rows = serializeRecipeToRows(recipe);
  if (rows.length > 0) {
    await sheet.addRows(rows as unknown as Record<string, string | number>[]);
  }

  return recipe;
}

export async function getOrMigrateUserRecipe(
  session: SessionUser,
  record: UserRecord | null
): Promise<RecipeConfig> {
  if (!record || !record.spreadsheetId) {
    return getUserRecipe(record) || getDefaultRecipeConfig();
  }

  const auth = oauthClientFromRefreshToken(session.refreshToken);
  if (!(auth instanceof OAuth2Client)) {
    return getUserRecipe(record) || getDefaultRecipeConfig();
  }

  try {
    let sheetRecipe = await fetchRecipeFromSheet(auth, record.spreadsheetId);

    // Legacy migration check: if Blobs has recipe but Sheet is empty, migrate to Sheet and purge Blobs
    if (record.recipe != null) {
      const blobRecipe = getUserRecipe(record);
      if (
        blobRecipe &&
        hasMeaningfulRecipe(blobRecipe) &&
        !hasMeaningfulRecipe(sheetRecipe)
      ) {
        sheetRecipe = await saveRecipeToSheet(
          auth,
          record.spreadsheetId,
          blobRecipe
        );
      }
      await purgeLegacyBlobRecipe(session.sub);
    }

    return sheetRecipe;
  } catch (error) {
    console.warn('[muffin] Failed to fetch/migrate recipe from sheet:', error);
    return getUserRecipe(record) || getDefaultRecipeConfig();
  }
}
