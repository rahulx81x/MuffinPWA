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
  formatCurrency as formatCurrencyRaw,
  formatSignedCurrency as formatSignedCurrencyRaw,
} from '../config';

const MASK_KEY = 'valuesMasked';
export const MASKED_VALUE = '••••';

interface MaskContextValue {
  masked: boolean;
  toggleMask: () => void;
  formatCurrency: (amount: number) => string;
  formatSignedCurrency: (amount: number) => string;
}

const MaskContext = createContext<MaskContextValue | null>(null);

function readStoredMask(): boolean {
  try {
    return localStorage.getItem(MASK_KEY) === '1';
  } catch {
    return false;
  }
}

export function MaskProvider({ children }: { children: ReactNode }) {
  const [masked, setMasked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return readStoredMask();
  });

  useEffect(() => {
    localStorage.setItem(MASK_KEY, masked ? '1' : '0');
  }, [masked]);

  const toggleMask = useCallback(() => {
    setMasked((prev) => !prev);
  }, []);

  const value = useMemo<MaskContextValue>(
    () => ({
      masked,
      toggleMask,
      formatCurrency: (amount: number) =>
        masked ? MASKED_VALUE : formatCurrencyRaw(amount),
      formatSignedCurrency: (amount: number) =>
        masked ? MASKED_VALUE : formatSignedCurrencyRaw(amount),
    }),
    [masked, toggleMask]
  );

  return (
    <MaskContext.Provider value={value}>{children}</MaskContext.Provider>
  );
}

export function useMask(): MaskContextValue {
  const ctx = useContext(MaskContext);
  if (!ctx) {
    throw new Error('useMask must be used within MaskProvider');
  }
  return ctx;
}
