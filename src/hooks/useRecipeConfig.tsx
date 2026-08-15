import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  getRecipeConfig,
  hydrateRecipeConfig,
  saveRecipeConfig,
  subscribeRecipeConfig,
  type RecipeConfig,
  type RecipeInvestment,
  type RecurringRule,
} from '../config';
import { saveRecipe } from '../api/client';

interface RecipeConfigContextValue {
  config: RecipeConfig;
  openingBalance: number;
  investments: RecipeInvestment[];
  recurringRules: RecurringRule[];
  /** Update local cache only (e.g. after loading from API / Google Sheet). */
  setConfig: (next: RecipeConfig) => void;
  /** Persist to Google Sheet Recipe tab via API, then update local cache. */
  persistConfig: (next: RecipeConfig) => Promise<RecipeConfig>;
  updateOpeningBalance: (amount: number) => void;
  updateInvestments: (investments: RecipeInvestment[]) => void;
  updateRecurringRules: (rules: RecurringRule[]) => void;
  addRecurringRule: (rule: RecurringRule) => Promise<RecipeConfig>;
  editRecurringRule: (rule: RecurringRule) => Promise<RecipeConfig>;
  removeRecurringRule: (id: string) => Promise<RecipeConfig>;
  toggleRecurringRule: (id: string) => Promise<RecipeConfig>;
  markRulesLogged: (ids: string[], monthKey: string) => Promise<RecipeConfig>;
}

const RecipeConfigContext = createContext<RecipeConfigContextValue | null>(
  null
);

function useRecipeConfigStore(): RecipeConfig {
  return useSyncExternalStore(
    subscribeRecipeConfig,
    getRecipeConfig,
    getRecipeConfig
  );
}

export function RecipeConfigProvider({ children }: { children: ReactNode }) {
  const config = useRecipeConfigStore();

  const setConfig = useCallback((next: RecipeConfig) => {
    saveRecipeConfig(next);
  }, []);

  const persistConfig = useCallback(async (next: RecipeConfig) => {
    saveRecipeConfig(next);
    try {
      const saved = await saveRecipe(next);
      return hydrateRecipeConfig(saved);
    } catch {
      return next;
    }
  }, []);

  const updateOpeningBalance = useCallback((amount: number) => {
    const current = getRecipeConfig();
    saveRecipeConfig({ ...current, openingBalance: amount });
  }, []);

  const updateInvestments = useCallback((investments: RecipeInvestment[]) => {
    const current = getRecipeConfig();
    saveRecipeConfig({ ...current, investments });
  }, []);

  const updateRecurringRules = useCallback((rules: RecurringRule[]) => {
    const current = getRecipeConfig();
    saveRecipeConfig({ ...current, recurringRules: rules });
  }, []);

  const addRecurringRule = useCallback(
    async (rule: RecurringRule) => {
      const current = getRecipeConfig();
      const existing = current.recurringRules || [];
      const updatedRules = [...existing, rule];
      const nextConfig = { ...current, recurringRules: updatedRules };
      return persistConfig(nextConfig);
    },
    [persistConfig]
  );

  const editRecurringRule = useCallback(
    async (rule: RecurringRule) => {
      const current = getRecipeConfig();
      const existing = current.recurringRules || [];
      const updatedRules = existing.map((r) => (r.id === rule.id ? rule : r));
      const nextConfig = { ...current, recurringRules: updatedRules };
      return persistConfig(nextConfig);
    },
    [persistConfig]
  );

  const removeRecurringRule = useCallback(
    async (id: string) => {
      const current = getRecipeConfig();
      const existing = current.recurringRules || [];
      const updatedRules = existing.filter((r) => r.id !== id);
      const nextConfig = { ...current, recurringRules: updatedRules };
      return persistConfig(nextConfig);
    },
    [persistConfig]
  );

  const toggleRecurringRule = useCallback(
    async (id: string) => {
      const current = getRecipeConfig();
      const existing = current.recurringRules || [];
      const updatedRules = existing.map((r) =>
        r.id === id ? { ...r, active: !r.active } : r
      );
      const nextConfig = { ...current, recurringRules: updatedRules };
      return persistConfig(nextConfig);
    },
    [persistConfig]
  );

  const markRulesLogged = useCallback(
    async (ids: string[], monthKey: string) => {
      const current = getRecipeConfig();
      const idSet = new Set(ids);
      const existing = current.recurringRules || [];
      const updatedRules = existing.map((r) =>
        idSet.has(r.id) ? { ...r, lastLoggedMonth: monthKey } : r
      );
      const nextConfig = { ...current, recurringRules: updatedRules };
      return persistConfig(nextConfig);
    },
    [persistConfig]
  );

  const value = useMemo<RecipeConfigContextValue>(
    () => ({
      config,
      openingBalance: config.openingBalance,
      investments: config.investments,
      recurringRules: config.recurringRules || [],
      setConfig,
      persistConfig,
      updateOpeningBalance,
      updateInvestments,
      updateRecurringRules,
      addRecurringRule,
      editRecurringRule,
      removeRecurringRule,
      toggleRecurringRule,
      markRulesLogged,
    }),
    [
      config,
      setConfig,
      persistConfig,
      updateOpeningBalance,
      updateInvestments,
      updateRecurringRules,
      addRecurringRule,
      editRecurringRule,
      removeRecurringRule,
      toggleRecurringRule,
      markRulesLogged,
    ]
  );

  return (
    <RecipeConfigContext.Provider value={value}>
      {children}
    </RecipeConfigContext.Provider>
  );
}

export function useRecipeConfig(): RecipeConfigContextValue {
  const ctx = useContext(RecipeConfigContext);
  if (!ctx) {
    throw new Error('useRecipeConfig must be used within RecipeConfigProvider');
  }
  return ctx;
}

