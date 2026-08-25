import type { RecipeConfig, RecipeInvestment, RecurringRule } from './types';

export function newInvestmentId(): string {
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newRecurringRuleId(): string {
  return `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
    recurringRules: [],
  };
}

/** Sanitize an individual recurring rule */
export function sanitizeRecurringRule(item: unknown): RecurringRule | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Partial<RecurringRule>;
  const name = String(row.name ?? '').trim();
  const category = String(row.category ?? '').trim();
  const rawType = String(row.type ?? '').toLowerCase();
  const type: RecurringRule['type'] =
    rawType === 'income' ? 'income' : rawType === 'investment' ? 'investment' : 'expense';
  const amount = Number(row.amount);
  const dayOfMonth = Math.min(31, Math.max(1, Math.round(Number(row.dayOfMonth) || 1)));

  if (!name && !category && !(amount > 0)) return null;

  return {
    id: typeof row.id === 'string' && row.id ? row.id : newRecurringRuleId(),
    name: name || (type === 'income' ? 'Recurring Income' : type === 'investment' ? 'Recurring Investment' : 'Recurring Expense'),
    type,
    category: category || (type === 'income' ? 'Income' : type === 'investment' ? 'Investment' : 'Expense'),
    amount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
    investmentType: row.investmentType ? String(row.investmentType).trim() : undefined,
    dayOfMonth,
    comment: row.comment ? String(row.comment).trim() : undefined,
    active: row.active !== false,
    autoPrompt: row.autoPrompt !== false,
    lastLoggedMonth: typeof row.lastLoggedMonth === 'string' ? row.lastLoggedMonth.trim() : undefined,
    endDate: typeof row.endDate === 'string' && row.endDate.trim() ? row.endDate.trim() : undefined,
    createdAt: typeof row.createdAt === 'string' && row.createdAt ? row.createdAt : new Date().toISOString(),
  };
}

/** Normalize recipe payload (Blobs + localStorage + Sheets). */
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

  const recurringRules = Array.isArray(data.recurringRules)
    ? data.recurringRules
        .map(sanitizeRecurringRule)
        .filter((rule): rule is RecurringRule => rule != null)
    : (fallback.recurringRules || []);

  return {
    openingBalance: Number.isFinite(openingBalance)
      ? openingBalance
      : fallback.openingBalance,
    investments,
    recurringRules,
  };
}

export function hasMeaningfulRecipe(config: RecipeConfig): boolean {
  if ((config.openingBalance || 0) > 0) return true;
  if (config.investments.some((row) => (row.amount || 0) > 0 || row.type.trim())) {
    return true;
  }
  if (config.recurringRules && config.recurringRules.length > 0) {
    return true;
  }
  return false;
}

