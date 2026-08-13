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
} from '../config';
import { saveRecipe } from '../api/client';

interface RecipeConfigContextValue {
  config: RecipeConfig;
  openingBalance: number;
  investments: RecipeInvestment[];
  /** Update local cache only (e.g. after loading from API / Google Sheet). */
  setConfig: (next: RecipeConfig) => void;
  /** Persist to Google Sheet Recipe tab via API, then update local cache. */
  persistConfig: (next: RecipeConfig) => Promise<RecipeConfig>;
  updateOpeningBalance: (amount: number) => void;
  updateInvestments: (investments: RecipeInvestment[]) => void;
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
    const saved = await saveRecipe(next);
    return hydrateRecipeConfig(saved);
  }, []);

  const updateOpeningBalance = useCallback((amount: number) => {
    const current = getRecipeConfig();
    saveRecipeConfig({ ...current, openingBalance: amount });
  }, []);

  const updateInvestments = useCallback((investments: RecipeInvestment[]) => {
    const current = getRecipeConfig();
    saveRecipeConfig({ ...current, investments });
  }, []);

  const value = useMemo<RecipeConfigContextValue>(
    () => ({
      config,
      openingBalance: config.openingBalance,
      investments: config.investments,
      setConfig,
      persistConfig,
      updateOpeningBalance,
      updateInvestments,
    }),
    [
      config,
      setConfig,
      persistConfig,
      updateOpeningBalance,
      updateInvestments,
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
