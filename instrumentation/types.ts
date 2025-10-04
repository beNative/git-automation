import type { AppView } from '../types';

export type InstrumentationLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface InstrumentationConfig {
  environment: string;
  enableConsoleBridge: boolean;
  performanceSampleIntervalMs: number;
  metricsBufferSize: number;
  testAgent?: {
    allowUiAutomation: boolean;
    defaultTimeoutMs: number;
  };
  additionalMetadata?: Record<string, unknown>;
}

export interface MetricSample {
  timestamp: number;
  fps?: number;
  longTaskCount?: number;
  longTaskDuration?: number;
  memory?: {
    jsHeapSizeLimit?: number;
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
  };
  custom?: Record<string, number>;
}

export type TestHookHandler<TArgs = unknown, TResult = unknown> = (
  args: TArgs,
) => TResult | Promise<TResult>;

export interface UiAutomationSurface {
  getActiveView?: () => AppView;
  setActiveView?: (view: AppView) => void | Promise<void>;
  getStateSnapshot?: () => Record<string, unknown>;
}

export interface InstrumentationPublicApi {
  log: (level: InstrumentationLogLevel, message: string, metadata?: unknown) => void;
  trace: (eventName: string, payload?: unknown) => void;
  registerTestHook: <TArgs = unknown, TResult = unknown>(
    name: string,
    handler: TestHookHandler<TArgs, TResult>,
  ) => () => void;
  invokeTestHook: <TArgs = unknown, TResult = unknown>(
    name: string,
    args?: TArgs,
  ) => Promise<TResult>;
  registerUiSurface: (surface: UiAutomationSurface | undefined) => () => void;
  getUiSurface: () => UiAutomationSurface | undefined;
  registerMetricListener: (listener: (sample: MetricSample) => void) => () => void;
  getMetrics: () => MetricSample[];
  getConfig: () => InstrumentationConfig;
}

export interface InstrumentationManager extends InstrumentationPublicApi {
  start: () => void;
  stop: () => void;
  getAutomationBridge: () => UiAutomationApi;
}

export interface UiAutomationWaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

export interface UiAutomationApi {
  click: (automationId: string) => Promise<void>;
  setInputValue: (automationId: string, value: string) => Promise<void>;
  getTextContent: (automationId: string) => Promise<string | null>;
  waitForTestId: (automationId: string, options?: UiAutomationWaitOptions) => Promise<Element>;
  runHook: <TArgs = unknown, TResult = unknown>(name: string, args?: TArgs) => Promise<TResult>;
  getActiveView: () => AppView | undefined;
  setActiveView: (view: AppView) => Promise<void>;
  getStateSnapshot: () => Record<string, unknown> | undefined;
}
