export const INITIAL_INVESTMENT = 0;
export const INITIAL_REGULAR_DEPOSITS = 0;
export const INITIAL_FIXED_DEPOSITS = 0;
export const INITIAL_MUTUAL_FUNDS = 0;
export const INITIAL_LIQUID_BALANCE = 0;

export const CURRENCY = {
  symbol: '₹',
  locale: 'en-IN',
} as const;

export const RECIPE_STORAGE_KEY = 'muffinRecipe';

export interface RecipeInvestment {
  id: string;
  type: string;
  amount: number;
}

export interface RecipeConfig {
  openingBalance: number;
  investments: RecipeInvestment[];
}

export interface InitialInvestmentBreakdown {
  regular: number;
  fixed: number;
  mutual: number;
  total: number;
}

type RecipeListener = () => void;

let recipeCache: RecipeConfig | null = null;
const recipeListeners = new Set<RecipeListener>();

function newInvestmentId(): string {
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function seedInvestmentsFromConstants(): RecipeInvestment[] {
  const entries: Array<{ type: string; amount: number }> = [
    { type: 'Regular Deposits', amount: Number(INITIAL_REGULAR_DEPOSITS) || 0 },
    { type: 'Fixed Deposits', amount: Number(INITIAL_FIXED_DEPOSITS) || 0 },
    { type: 'Mutual Funds', amount: Number(INITIAL_MUTUAL_FUNDS) || 0 },
  ];
  const withAmounts = entries.filter((e) => e.amount > 0);
  if (withAmounts.length > 0) {
    return withAmounts.map((e) => ({
      id: newInvestmentId(),
      type: e.type,
      amount: e.amount,
    }));
  }

  const legacy = Number(INITIAL_INVESTMENT) || 0;
  if (legacy > 0) {
    return [
      {
        id: newInvestmentId(),
        type: 'Initial Investment',
        amount: legacy,
      },
    ];
  }

  return [];
}

export function createEmptyInvestment(
  type = '',
  amount = 0
): RecipeInvestment {
  return { id: newInvestmentId(), type, amount };
}

export function getDefaultRecipeConfig(): RecipeConfig {
  return {
    openingBalance: Number(INITIAL_LIQUID_BALANCE) || 0,
    investments: seedInvestmentsFromConstants(),
  };
}

function sanitizeRecipeConfig(raw: unknown): RecipeConfig {
  const fallback = getDefaultRecipeConfig();
  if (!raw || typeof raw !== 'object') return fallback;

  const data = raw as Partial<RecipeConfig>;
  const openingBalance = Number(data.openingBalance);
  const investments = Array.isArray(data.investments)
    ? data.investments
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Partial<RecipeInvestment>;
          const type = String(row.type ?? '').trim();
          const amount = Number(row.amount);
          if (!type && !(amount > 0)) return null;
          return {
            id:
              typeof row.id === 'string' && row.id
                ? row.id
                : newInvestmentId(),
            type: type || 'Investment',
            amount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
          } satisfies RecipeInvestment;
        })
        .filter((row): row is RecipeInvestment => row != null)
    : fallback.investments;

  return {
    openingBalance: Number.isFinite(openingBalance)
      ? Math.max(0, openingBalance)
      : fallback.openingBalance,
    investments,
  };
}

function readRecipeFromStorage(): RecipeConfig {
  try {
    const stored = localStorage.getItem(RECIPE_STORAGE_KEY);
    if (!stored) return getDefaultRecipeConfig();
    return sanitizeRecipeConfig(JSON.parse(stored) as unknown);
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
  const next = sanitizeRecipeConfig(config);
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
  return saveRecipeConfig(sanitizeRecipeConfig(raw));
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

/** True when the recipe has any non-zero opening balance or investments. */
export function hasMeaningfulRecipe(config: RecipeConfig): boolean {
  if ((config.openingBalance || 0) > 0) return true;
  return config.investments.some((row) => (row.amount || 0) > 0 || row.type.trim());
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

export function getInitialInvestmentBreakdown(): InitialInvestmentBreakdown {
  const investments = getInitialInvestments();
  const findAmount = (label: string) =>
    investments
      .filter((row) => row.type.toLowerCase() === label.toLowerCase())
      .reduce((sum, row) => sum + row.amount, 0);

  const regular = findAmount('Regular Deposits');
  const fixed = findAmount('Fixed Deposits');
  const mutual = findAmount('Mutual Funds');
  const total = investments.reduce((sum, row) => sum + row.amount, 0);

  return { regular, fixed, mutual, total };
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
