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
  saveRecipeConfig,
  subscribeRecipeConfig,
  type RecipeConfig,
  type RecipeInvestment,
} from '../config';

interface RecipeConfigContextValue {
  config: RecipeConfig;
  openingBalance: number;
  investments: RecipeInvestment[];
  setConfig: (next: RecipeConfig) => void;
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
      updateOpeningBalance,
      updateInvestments,
    }),
    [config, setConfig, updateOpeningBalance, updateInvestments]
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
