import React, { createContext, useState, useCallback, ReactNode, useMemo, useRef, useEffect } from 'react';
import type { DebugLogEntry, DebugLogLevel } from '../types';

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
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [filters, setFilters] = useState<LogFilters>(initialState.filters);
  const [isSavingToFile, setIsSavingToFile] = useState(false);
  const isSavingToFileRef = useRef(isSavingToFile);

  useEffect(() => {
    isSavingToFileRef.current = isSavingToFile;
    if (isSavingToFile) {
        window.electronAPI.logToFileInit();
    } else {
        window.electronAPI.logToFileClose();
    }
  }, [isSavingToFile]);

  const addLog = useCallback((level: DebugLogLevel, message: string, data?: any) => {
    const newLog: DebugLogEntry = {
      id: logIdCounter++,
      timestamp: new Date(),
      level,
      message,
      data,
    };
    setLogs(prev => [...prev.slice(-499), newLog]); // Keep max 500 logs in memory

    if (isSavingToFileRef.current) {
        window.electronAPI.logToFileWrite(newLog);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const setFilter = useCallback((level: DebugLogLevel, value: boolean) => {
    setFilters(prev => ({ ...prev, [level]: value }));
  }, []);
  
  const toggleSaveToFile = useCallback(() => {
    setIsSavingToFile(prev => !prev);
  }, []);

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