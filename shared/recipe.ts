import type { RecipeConfig, RecipeInvestment } from './types';

export function newInvestmentId(): string {
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyInvestment(
  type = '',
  amount = 0
): RecipeInvestment {
  return { id: newInvestmentId(), type, amount };
}

export function getDefaultRecipeConfig(): RecipeConfig {
  return {
    openingBalance: 0,
    investments: [],
  };
}

/** Normalize recipe payload (Blobs + localStorage). */
export function sanitizeRecipe(raw: unknown): RecipeConfig {
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

export function hasMeaningfulRecipe(config: RecipeConfig): boolean {
  if ((config.openingBalance || 0) > 0) return true;
  return config.investments.some(
    (row) => (row.amount || 0) > 0 || row.type.trim()
  );
}
