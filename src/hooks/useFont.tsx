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
  applyFontToDocument,
  FONT_STORAGE_KEY,
  getFont,
  resolveInitialFontId,
  type FontDefinition,
  type FontId,
} from '../lib/fonts';

interface FontContextValue {
  fontId: FontId;
  font: FontDefinition;
  setFont: (id: FontId) => void;
}

const FontContext = createContext<FontContextValue | null>(null);

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontId, setFontId] = useState<FontId>(() => {
    if (typeof document === 'undefined') return 'muffin';
    const id = resolveInitialFontId();
    applyFontToDocument(id);
    return id;
  });

  useEffect(() => {
    applyFontToDocument(fontId);
    localStorage.setItem(FONT_STORAGE_KEY, fontId);
  }, [fontId]);

  const setFont = useCallback((id: FontId) => {
    setFontId(id);
  }, []);

  const value = useMemo<FontContextValue>(
    () => ({
      fontId,
      font: getFont(fontId),
      setFont,
    }),
    [fontId, setFont]
  );

  return (
    <FontContext.Provider value={value}>{children}</FontContext.Provider>
  );
}

export function useFont(): FontContextValue {
  const ctx = useContext(FontContext);
  if (!ctx) {
    throw new Error('useFont must be used within FontProvider');
  }
  return ctx;
}
