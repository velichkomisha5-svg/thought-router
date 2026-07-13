import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { SECURE_KEY_ALIAS } from '../config/constants';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [apiKey, setApiKeyState] = useState('');
  useEffect(() => { SecureStore.getItemAsync(SECURE_KEY_ALIAS).then(k => k && setApiKeyState(k)); }, []);
  const saveApiKey = useCallback(async (key) => { await SecureStore.setItemAsync(SECURE_KEY_ALIAS, key); setApiKeyState(key); }, []);
  const clearApiKey = useCallback(async () => { await SecureStore.deleteItemAsync(SECURE_KEY_ALIAS); setApiKeyState(''); }, []);
  return <SettingsContext.Provider value={{ apiKey, saveApiKey, clearApiKey }}>{children}</SettingsContext.Provider>;
}
export const useSettings = () => useContext(SettingsContext);
