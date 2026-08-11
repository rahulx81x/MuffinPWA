import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyThemeToDocument,
  getTheme,
  resolveInitialThemeId,
  THEME_STORAGE_KEY,
  type ThemeDefinition,
  type ThemeId,
  type ThemeMode,
} from '../lib/themes';
import { applyMuffinIconsToDocument } from '../lib/muffinIcon';

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeDefinition;
  isDark: boolean;
  mode: ThemeMode;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof document === 'undefined') return 'classic';
    const id = resolveInitialThemeId();
    applyThemeToDocument(id);
    applyMuffinIconsToDocument(id);
    return id;
  });

  useEffect(() => {
    applyThemeToDocument(themeId);
    applyMuffinIconsToDocument(themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }, [themeId]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const theme = getTheme(themeId);
    return {
      themeId,
      theme,
      isDark: theme.mode === 'dark',
      mode: theme.mode,
      setTheme,
    };
  }, [themeId, setTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
