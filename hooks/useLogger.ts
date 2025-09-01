import { useContext } from 'react';
import { LoggerContext } from '../contexts/LoggerContext';
import { DebugLogLevel } from '../types';

export const useLogger = () => {
  const { addLog } = useContext(LoggerContext);

  return {
    debug: (message: string, data?: any) => addLog(DebugLogLevel.DEBUG, message, data),
    info: (message: string, data?: any) => addLog(DebugLogLevel.INFO, message, data),
    warn: (message: string, data?: any) => addLog(DebugLogLevel.WARN, message, data),
    error: (message: string, data?: any) => addLog(DebugLogLevel.ERROR, message, data),
  };
};
