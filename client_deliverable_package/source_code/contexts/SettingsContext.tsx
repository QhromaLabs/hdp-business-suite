import { createContext, useContext, useEffect, useState } from 'react';
import { TAX_RATE } from '@/lib/tax';

interface SettingsContextValue {
  taxEnabled: boolean;
  taxRate: number;
  setTaxEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'app_tax_enabled';

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [taxEnabled, setTaxEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? false : stored === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, taxEnabled ? 'true' : 'false');
  }, [taxEnabled]);

  return (
    <SettingsContext.Provider value={{ taxEnabled, taxRate: TAX_RATE, setTaxEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
