import React, { createContext, useContext, useState, useCallback } from 'react';
import { loadFinanceData, saveFinanceDataAtomic, syncObsidianFinance, withFinanceLock } from '../services/storage';

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [financeSummary, setFinanceSummary] = useState({ expenses: [], subscriptions: [] });
  const [financeSaving, setFinanceSaving] = useState(false);
  const refresh = useCallback(async () => { setFinanceSummary(await loadFinanceData()); }, []);

  const addTransaction = useCallback(async (entry, { isSubscription }) => {
    setFinanceSaving(true);
    try {
      await withFinanceLock(async () => {
        const current = await loadFinanceData();
        if (isSubscription) {
          current.subscriptions = current.subscriptions.filter(s => s.item.toLowerCase() !== entry.item.toLowerCase());
          current.subscriptions.push(entry);
        } else {
          current.expenses.push(entry);
        }
        await saveFinanceDataAtomic(current);
        await syncObsidianFinance(current);
        setFinanceSummary(current);
      });
    } finally {
      setFinanceSaving(false);
    }
  }, []);

  return <FinanceContext.Provider value={{ financeSummary, financeSaving, refresh, addTransaction }}>{children}</FinanceContext.Provider>;
}
export const useFinance = () => useContext(FinanceContext);
