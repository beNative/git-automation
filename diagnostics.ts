export type DiagnosticsLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DiagnosticsEntry {
  timestamp: string;
  scope: string;
  level: DiagnosticsLevel;
  message: string;
  data?: unknown;
}

const HISTORY_KEY = '__gitAutomationDiagnostics__';
const MAX_HISTORY = 5000;

type GlobalDiagnosticsState = {
  history: DiagnosticsEntry[];
  push: (entry: DiagnosticsEntry) => void;
};

const globalObj = globalThis as typeof globalThis & {
  [HISTORY_KEY]?: GlobalDiagnosticsState;
};

const ensureState = (): GlobalDiagnosticsState => {
  if (!globalObj[HISTORY_KEY]) {
    const history: DiagnosticsEntry[] = [];
    const push = (entry: DiagnosticsEntry) => {
      history.push(entry);
      if (history.length > MAX_HISTORY) {
        history.splice(0, history.length - MAX_HISTORY);
      }
    };
    globalObj[HISTORY_KEY] = { history, push };
  }
  return globalObj[HISTORY_KEY]!;
};

const consoleMethodForLevel: Record<DiagnosticsLevel, 'debug' | 'info' | 'warn' | 'error'> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

const sanitizeForLogging = (value: unknown): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (typeof value === 'function') {
    return '[Function]';
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return {
        summary: '[Unserializable object]',
        type: value.constructor?.name,
      };
    }
  }
  return value;
};

const formatMessage = (scope: string, level: DiagnosticsLevel, message: string) =>
  `[Diagnostics][${scope}][${level.toUpperCase()}] ${message}`;

export const recordDiagnostics = (
  scope: string,
  level: DiagnosticsLevel,
  message: string,
  data?: unknown,
) => {
  const state = ensureState();
  const entry: DiagnosticsEntry = {
    timestamp: new Date().toISOString(),
    scope,
    level,
    message,
    data: data !== undefined ? sanitizeForLogging(data) : undefined,
  };
  state.push(entry);
  const consoleMethod = consoleMethodForLevel[level] ?? 'info';
  try {
    if (data !== undefined) {
      // @ts-expect-error - console methods accept variadic args.
      console[consoleMethod](formatMessage(scope, level, message), data);
    } else {
      // @ts-expect-error - console methods accept variadic args.
      console[consoleMethod](formatMessage(scope, level, message));
    }
  } catch (error) {
    // Last-resort logging in case console method fails.
    console.log(formatMessage(scope, level, message));
  }
};

export const createDiagnosticsScope = (scope: string) => ({
  debug: (message: string, data?: unknown) => recordDiagnostics(scope, 'debug', message, data),
  info: (message: string, data?: unknown) => recordDiagnostics(scope, 'info', message, data),
  warn: (message: string, data?: unknown) => recordDiagnostics(scope, 'warn', message, data),
  error: (message: string, data?: unknown) => recordDiagnostics(scope, 'error', message, data),
});

export const attachDiagnosticsInspector = () => {
  const state = ensureState();
  const globalDiagnostics = globalObj[HISTORY_KEY]!;
  if (typeof window !== 'undefined') {
    const windowObj = window as typeof window & {
      gitAutomationDiagnostics?: GlobalDiagnosticsState;
    };
    windowObj.gitAutomationDiagnostics = globalDiagnostics;
  }
  return state.history;
};

export const diagnosticsHistory = () => ensureState().history;

export const formatErrorForLogging = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
};
