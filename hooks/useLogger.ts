import { useContext, useMemo } from 'react';
import { LoggerContext } from '../contexts/LoggerContext';
import { DebugLogLevel } from '../types';

export const useLogger = () => {
  const { addLog } = useContext(LoggerContext);

  // Memoize the logger object to ensure its identity is stable across re-renders.
  // This prevents unnecessary re-renders in components that use this hook.
  return useMemo(() => ({
    debug: (message: string, data?: any) => addLog(DebugLogLevel.DEBUG, message, data),
    info: (message: string, data?: any) => addLog(DebugLogLevel.INFO, message, data),
    warn: (message: string, data?: any) => addLog(DebugLogLevel.WARN, message, data),
    error: (message: string, data?: any) => addLog(DebugLogLevel.ERROR, message, data),
  }), [addLog]);
};