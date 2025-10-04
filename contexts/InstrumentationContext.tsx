import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { loadInstrumentationConfig, createInstrumentationManager } from '../instrumentation';
import type { InstrumentationManager } from '../instrumentation';
import { useLogger } from '../hooks/useLogger';

interface InstrumentationContextValue {
  manager: InstrumentationManager;
}

const InstrumentationContext = createContext<InstrumentationContextValue | null>(null);

export const InstrumentationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const logger = useLogger();

  const config = useMemo(() => loadInstrumentationConfig(), []);

  const manager = useMemo(
    () =>
      createInstrumentationManager({
        logger: {
          debug: logger.debug,
          info: logger.info,
          warn: logger.warn,
          error: logger.error,
        },
        config,
      }),
    [logger, config],
  );

  useEffect(() => {
    manager.start();
    return () => manager.stop();
  }, [manager]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const win = window as typeof window & {
      __instrumentation?: InstrumentationManager;
      __automationBridge?: ReturnType<InstrumentationManager['getAutomationBridge']>;
    };

    win.__instrumentation = manager;
    if (config.testAgent?.allowUiAutomation) {
      win.__automationBridge = manager.getAutomationBridge();
    }

    return () => {
      if (win.__instrumentation === manager) {
        delete win.__instrumentation;
      }
      if (win.__automationBridge === manager.getAutomationBridge()) {
        delete win.__automationBridge;
      }
    };
  }, [manager, config.testAgent]);

  const value = useMemo<InstrumentationContextValue>(() => ({ manager }), [manager]);

  return (
    <InstrumentationContext.Provider value={value}>
      {children}
    </InstrumentationContext.Provider>
  );
};

export const useInstrumentationManager = (): InstrumentationManager | null => {
  const context = useContext(InstrumentationContext);
  return context?.manager ?? null;
};
