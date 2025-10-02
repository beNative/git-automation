import React, { createContext, useState, useCallback, ReactNode, useMemo, useRef, useEffect } from 'react';
import type { DebugLogEntry, DebugLogLevel } from '../types';
import { useSettings } from './SettingsContext';
import { createDiagnosticsScope } from '../diagnostics';

type LogFilters = Record<DebugLogLevel, boolean>;

interface LoggerContextState {
  logs: DebugLogEntry[];
  addLog: (level: DebugLogLevel, message: string, data?: any) => void;
  clearLogs: () => void;
  filters: LogFilters;
  setFilter: (level: DebugLogLevel, value: boolean) => void;
  isSavingToFile: boolean;
  toggleSaveToFile: () => void;
}

const initialState: LoggerContextState = {
  logs: [],
  addLog: () => {},
  clearLogs: () => {},
  filters: {
    [('DEBUG')]: true,
    [('INFO')]: true,
    [('WARN')]: true,
    [('ERROR')]: true,
  },
  setFilter: () => {},
  isSavingToFile: false,
  toggleSaveToFile: () => {},
};

export const LoggerContext = createContext<LoggerContextState>(initialState);

let logIdCounter = 0;

export const LoggerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [filters, setFilters] = useState<LogFilters>(initialState.filters);
  const [isSavingToFile, setIsSavingToFile] = useState(false);
  const isSavingToFileRef = useRef(isSavingToFile);
  const diagnostics = useMemo(() => createDiagnosticsScope('LoggerProvider'), []);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  diagnostics.debug('Render cycle executed', { renderCount: renderCountRef.current });
  
  // Ref to track previous state to avoid running effect on mount
  const prevIsSavingToFile = useRef<boolean | undefined>(undefined);


  useEffect(() => {
    isSavingToFileRef.current = isSavingToFile;
    
    // Only send IPC messages when the state actually changes from its previous state.
    // This avoids running on initial mount. `prevIsSavingToFile.current` is initially undefined.
    if (prevIsSavingToFile.current !== undefined && prevIsSavingToFile.current !== isSavingToFile) {
        diagnostics.info('Log file persistence toggled', { isSavingToFile });
        if (isSavingToFile) {
            window.electronAPI?.logToFileInit();
        } else {
            window.electronAPI?.logToFileClose();
        }
    }
    prevIsSavingToFile.current = isSavingToFile;

  }, [isSavingToFile, diagnostics]);

  // Effect for cleanup when the provider unmounts (e.g., app closes)
  useEffect(() => {
    return () => {
      // If we were saving to file when the app closes, tell the main process to close the stream.
      if (isSavingToFileRef.current) {
        diagnostics.info('LoggerProvider unmount cleanup closing log file');
        window.electronAPI?.logToFileClose();
      }
    };
  }, [diagnostics]); // Empty array ensures this only runs on mount and unmount


  const addLog = useCallback((level: DebugLogLevel, message: string, data?: any) => {
    diagnostics.debug('addLog invoked', { level, message, hasData: Boolean(data) });
    // If debug logging is disabled in settings, do nothing.
    if (!settings.debugLogging) {
      diagnostics.debug('Debug logging disabled, skipping addLog');
      return;
    }

    const newLog: DebugLogEntry = {
      id: logIdCounter++,
      timestamp: new Date(),
      level,
      message,
      data,
    };
    setLogs(prev => [...prev.slice(-499), newLog]); // Keep max 500 logs in memory

    if (isSavingToFileRef.current) {
        diagnostics.debug('Forwarding log entry to file persistence', { logId: newLog.id });
        window.electronAPI?.logToFileWrite(newLog);
    }
  }, [settings.debugLogging, diagnostics]);

  const clearLogs = useCallback(() => {
    diagnostics.info('clearLogs invoked');
    setLogs([]);
  }, [diagnostics]);

  const setFilter = useCallback((level: DebugLogLevel, value: boolean) => {
    diagnostics.debug('setFilter invoked', { level, value });
    setFilters(prev => ({ ...prev, [level]: value }));
  }, [diagnostics]);

  const toggleSaveToFile = useCallback(() => {
    diagnostics.info('toggleSaveToFile invoked');
    setIsSavingToFile(prev => !prev);
  }, [diagnostics]);

  const value = useMemo(() => ({
    logs,
    addLog,
    clearLogs,
    filters,
    setFilter,
    isSavingToFile,
    toggleSaveToFile,
  }), [logs, addLog, clearLogs, filters, setFilter, isSavingToFile, toggleSaveToFile]);

  return (
    <LoggerContext.Provider value={value}>
      {children}
    </LoggerContext.Provider>
  );
};
