import React, { createContext, useState, useCallback, ReactNode, useMemo, useEffect, useContext } from 'react';
import type { GlobalSettings } from '../types';

interface SettingsContextState {
  settings: GlobalSettings;
  saveSettings: (newSettings: GlobalSettings) => void;
}

const DEFAULTS: GlobalSettings = {
    defaultBuildCommand: 'npm run build',
    notifications: true,
    simulationMode: true,
    theme: 'dark',
    iconSet: 'heroicons',
    debugLogging: true,
};

const initialState: SettingsContextState = {
  settings: DEFAULTS,
  saveSettings: () => {},
};

export const SettingsContext = createContext<SettingsContextState>(initialState);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    try {
      const savedSettings = localStorage.getItem('globalSettings');
      const loaded = savedSettings ? { ...DEFAULTS, ...JSON.parse(savedSettings) } : DEFAULTS;
      return loaded;
    } catch (e: any) {
      console.error('Failed to load settings from localStorage, falling back to defaults.', { error: e.message });
      return DEFAULTS;
    }
  });

  useEffect(() => {
    localStorage.setItem('globalSettings', JSON.stringify(settings));
  }, [settings]);

  const saveSettings = useCallback((newSettings: GlobalSettings) => {
    setSettings(newSettings);
  }, []);

  const value = useMemo(() => ({
    settings,
    saveSettings,
  }), [settings, saveSettings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
    return useContext(SettingsContext);
};
