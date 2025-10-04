import { InstrumentationConfig } from './types';

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
};

const parseNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? Number(parsed) : fallback;
};

const readEnv = (key: string): string | undefined => {
  if (typeof window !== 'undefined') {
    const win = window as typeof window & { __instrumentationEnv__?: Record<string, string> };
    if (win.__instrumentationEnv__ && key in win.__instrumentationEnv__) {
      return win.__instrumentationEnv__[key];
    }
    if (typeof win?.__instrumentationConfig__ === 'object') {
      const value = (win.__instrumentationConfig__ as Record<string, unknown>)[key];
      if (typeof value === 'string') {
        return value;
      }
    }
  }

  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key];
  }

  return undefined;
};

export const loadInstrumentationConfig = (): InstrumentationConfig => {
  const environment =
    readEnv('INSTRUMENTATION_ENV') ||
    readEnv('NODE_ENV') ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV) ||
    'production';

  const enableConsoleBridge = parseBoolean(readEnv('INSTRUMENTATION_ENABLE_CONSOLE_BRIDGE'), true);
  const allowUiAutomation = parseBoolean(readEnv('INSTRUMENTATION_ENABLE_UI_AUTOMATION'), true);
  const performanceSampleIntervalMs = parseNumber(readEnv('INSTRUMENTATION_SAMPLE_INTERVAL_MS'), 1000);
  const metricsBufferSize = parseNumber(readEnv('INSTRUMENTATION_METRIC_BUFFER_SIZE'), 120);
  const defaultTimeoutMs = parseNumber(readEnv('INSTRUMENTATION_UI_TIMEOUT_MS'), 5000);

  const additionalMetadata: Record<string, unknown> = {};
  const metadataPrefix = 'INSTRUMENTATION_METADATA_';

  if (typeof window !== 'undefined') {
    const win = window as typeof window & { __instrumentationConfig__?: Record<string, unknown> };
    if (win.__instrumentationConfig__) {
      Object.entries(win.__instrumentationConfig__).forEach(([key, value]) => {
        if (key.startsWith(metadataPrefix)) {
          additionalMetadata[key.substring(metadataPrefix.length).toLowerCase()] = value;
        }
      });
    }
  }

  if (typeof process !== 'undefined' && process.env) {
    Object.entries(process.env).forEach(([key, value]) => {
      if (key.startsWith(metadataPrefix) && typeof value === 'string') {
        additionalMetadata[key.substring(metadataPrefix.length).toLowerCase()] = value;
      }
    });
  }

  return {
    environment,
    enableConsoleBridge,
    performanceSampleIntervalMs,
    metricsBufferSize,
    testAgent: {
      allowUiAutomation,
      defaultTimeoutMs,
    },
    additionalMetadata,
  };
};
