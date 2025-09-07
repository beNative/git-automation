import { useContext, useMemo } from 'react';
// FIX: Add .tsx extension to module import.
import { LoggerContext } from '../contexts/LoggerContext.tsx';
// FIX: Add .ts extension to module import.
import { DebugLogLevel } from '../types.ts';

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
