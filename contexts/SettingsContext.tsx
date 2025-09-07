import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import type { GlobalSettings, AllData } from '../types';
import { useLogger } from '../hooks/useLogger';

// Define the shape of the context value
interface SettingsContextValue {
  settings: GlobalSettings;
  setSettings: (newSettings: GlobalSettings) => void;
  isLoaded: boolean;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  theme: 'dark',
  iconSet: 'heroicons',
  openLinksIn: 'default',
  notifications: true,
  simulationMode: false,
  allowPrerelease: false,
  debugLogging: true,
};

// Create the context with a default value
const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

// Create the provider component
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [settings, setSettingsState] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const logger = useLogger();

  // Load initial data
  useEffect(() => {
    if (window.electronAPI) {
        // We are in Electron
        window.electronAPI.getInitialData().then((data: AllData) => {
            if (data && data.globalSettings) {
                // Merge loaded settings with defaults to handle new properties being added to the app
                const mergedSettings = { ...DEFAULT_SETTINGS, ...data.globalSettings };
                setSettingsState(mergedSettings);
                logger.info("SettingsContext: GlobalSettings loaded.", mergedSettings);
            } else {
                logger.warn("SettingsContext: No globalSettings found, using defaults.");
            }
            setIsLoaded(true);
        }).catch(err => {
            logger.error("SettingsContext: Failed to load initial data, using defaults.", err);
            setIsLoaded(true); // Still mark as loaded to unblock UI
        });
    } else {
        // We are in a browser, not Electron
        logger.info("SettingsContext: Running in web mode, using default settings and forcing simulation mode.");
        setSettingsState({ ...DEFAULT_SETTINGS, simulationMode: true });
        setIsLoaded(true);
    }
  }, [logger]);

  // Wrapper for setSettings to also save to main process
  const handleSetSettings = useCallback((newSettings: GlobalSettings) => {
    setSettingsState(newSettings);
    if (window.electronAPI) {
        window.electronAPI.saveSettings(newSettings);
        logger.info("SettingsContext: Settings saved.", newSettings);
    } else {
        logger.info("SettingsContext: Settings updated in web mode state.", newSettings);
    }
  }, [logger]);
  
  // The context value
  const value = {
    settings,
    setSettings: handleSetSettings,
    isLoaded,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Create the custom hook
export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};