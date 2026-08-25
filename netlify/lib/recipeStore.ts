import { OAuth2Client } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import {
  RECIPE_TAB_HEADERS,
  RECIPE_TAB_NAME,
  RULES_TAB_HEADERS,
  RULES_TAB_NAME,
  getDefaultRecipeConfig,
  hasMeaningfulRecipe,
  parseRecipeFromRows,
  parseRulesFromRows,
  sanitizeRecipe,
  serializeRecipeToRows,
  serializeRulesToRows,
  type RecipeConfig,
} from '../../shared/index';
import { oauthClientFromRefreshToken } from './googleAuth';
import { ensureRecipeTab, ensureRulesTab, openSpreadsheet } from './sheetBootstrap';
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
  const [recipeSheet, rulesSheet] = await Promise.all([
    ensureRecipeTab(doc),
    ensureRulesTab(doc),
  ]);

  const [recipeRows, rulesRows] = await Promise.all([
    recipeSheet.getRows(),
    rulesSheet.getRows(),
  ]);

  const { openingBalance, investments } = parseRecipeFromRows(recipeRows);
  const recurringRules = parseRulesFromRows(rulesRows);

  return sanitizeRecipe({
    openingBalance,
    investments,
    recurringRules,
  });
}

export async function saveRecipeToSheet(
  auth: OAuth2Client,
  spreadsheetId: string,
  rawRecipe: unknown
): Promise<RecipeConfig> {
  const recipe = sanitizeRecipe(rawRecipe);
  const doc = await openSpreadsheet(auth, spreadsheetId);
  const [recipeSheet, rulesSheet] = await Promise.all([
    ensureRecipeTab(doc),
    ensureRulesTab(doc),
  ]);

  // 1. Update Recipe tab (starting balances)
  const existingRecipeRows = await recipeSheet.getRows();
  await recipeSheet.clearRows();
  const recipeRows = serializeRecipeToRows(recipe);
  if (recipeRows.length > 0) {
    try {
      await recipeSheet.addRows(
        recipeRows as unknown as Record<string, string | number>[]
      );
    } catch (err) {
      console.error('[muffin] Failed to write recipe rows after clearing — data may be lost', err);
      throw err;
    }
  }

  // 2. Update Rules tab (recurring rules)
  await rulesSheet.clearRows();
  const ruleRows = serializeRulesToRows(recipe.recurringRules || []);
  if (ruleRows.length > 0) {
    try {
      await rulesSheet.addRows(
        ruleRows as unknown as Record<string, string | number>[]
      );
    } catch (err) {
      console.error('[muffin] Failed to write rules rows after clearing — data may be lost', err);
      throw err;
    }
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
