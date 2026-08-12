export const CURRENCY = {
  symbol: '₹',
  locale: 'en-IN',
} as const;

export const RECIPE_STORAGE_KEY = 'muffinRecipe';

export type { RecipeConfig, RecipeInvestment } from '@shared';
export {
  createEmptyInvestment,
  getDefaultRecipeConfig,
  hasMeaningfulRecipe,
} from '@shared';

import type { RecipeConfig, RecipeInvestment } from '@shared';
import {
  getDefaultRecipeConfig,
  sanitizeRecipe,
} from '@shared';

type RecipeListener = () => void;

let recipeCache: RecipeConfig | null = null;
const recipeListeners = new Set<RecipeListener>();

function readRecipeFromStorage(): RecipeConfig {
  try {
    const stored = localStorage.getItem(RECIPE_STORAGE_KEY);
    if (!stored) return getDefaultRecipeConfig();
    return sanitizeRecipe(JSON.parse(stored) as unknown);
  } catch {
    return getDefaultRecipeConfig();
  }
}

export function getRecipeConfig(): RecipeConfig {
  if (!recipeCache) {
    recipeCache = readRecipeFromStorage();
  }
  return recipeCache;
}

/** Persist to local cache (and notify listeners). Server sync is separate. */
export function saveRecipeConfig(config: RecipeConfig): RecipeConfig {
  const next = sanitizeRecipe(config);
  recipeCache = next;
  try {
    localStorage.setItem(RECIPE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private-mode failures; in-memory cache still updates.
  }
  recipeListeners.forEach((listener) => listener());
  return next;
}

/** Apply recipe loaded from Netlify Blobs (source of truth when signed in). */
export function hydrateRecipeConfig(raw: unknown): RecipeConfig {
  return saveRecipeConfig(sanitizeRecipe(raw));
}

export function clearRecipeConfig(): RecipeConfig {
  try {
    localStorage.removeItem(RECIPE_STORAGE_KEY);
  } catch {
    // ignore
  }
  recipeCache = getDefaultRecipeConfig();
  recipeListeners.forEach((listener) => listener());
  return recipeCache;
}

export function subscribeRecipeConfig(listener: RecipeListener): () => void {
  recipeListeners.add(listener);
  return () => {
    recipeListeners.delete(listener);
  };
}

export function getOpeningBalance(): number {
  return getRecipeConfig().openingBalance;
}

export function getInitialInvestments(): RecipeInvestment[] {
  return getRecipeConfig().investments;
}

export function getInitialInvestmentTotal(): number {
  return getInitialInvestments().reduce((sum, row) => sum + row.amount, 0);
}

export function formatCurrency(amount: number): string {
  return CURRENCY.symbol + Math.round(amount).toLocaleString(CURRENCY.locale);
}

export function formatSignedCurrency(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${formatCurrency(amount)}`;
}
