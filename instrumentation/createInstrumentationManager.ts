import { createUiAutomationBridge } from './uiAutomationBridge';
import { PerformanceMonitor } from './performanceMonitor';
import type {
  InstrumentationConfig,
  InstrumentationLogLevel,
  InstrumentationManager,
  InstrumentationPublicApi,
  MetricSample,
  TestHookHandler,
  UiAutomationApi,
  UiAutomationSurface,
} from './types';

export interface InstrumentationManagerOptions {
  logger: {
    debug: (message: string, metadata?: unknown) => void;
    info: (message: string, metadata?: unknown) => void;
    warn: (message: string, metadata?: unknown) => void;
    error: (message: string, metadata?: unknown) => void;
  };
  config: InstrumentationConfig;
}

export const createInstrumentationManager = ({
  logger,
  config,
}: InstrumentationManagerOptions): InstrumentationManager => {
  const metrics: MetricSample[] = [];
  const metricListeners = new Set<(sample: MetricSample) => void>();
  const testHooks = new Map<string, TestHookHandler<any, any>>();
  let uiSurface: UiAutomationSurface | undefined;

  const log = (level: InstrumentationLogLevel, message: string, metadata?: unknown) => {
    try {
      switch (level) {
        case 'debug':
          logger.debug(message, metadata);
          break;
        case 'info':
          logger.info(message, metadata);
          break;
        case 'warn':
          logger.warn(message, metadata);
          break;
        case 'error':
        default:
          logger.error(message, metadata);
          break;
      }

      if (config.enableConsoleBridge) {
        const payload = metadata ? `${message} :: ${JSON.stringify(metadata)}` : message;
        switch (level) {
          case 'debug':
            console.debug('[instrumentation]', payload);
            break;
          case 'info':
            console.info('[instrumentation]', payload);
            break;
          case 'warn':
            console.warn('[instrumentation]', payload);
            break;
          case 'error':
            console.error('[instrumentation]', payload);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to emit instrumentation log.', error);
    }
  };

  const trace = (eventName: string, payload?: unknown) => {
    log('debug', `TRACE:${eventName}`, payload);
  };

  const registerTestHook = <TArgs, TResult>(
    name: string,
    handler: TestHookHandler<TArgs, TResult>,
  ) => {
    if (testHooks.has(name)) {
      log('warn', 'Replacing existing test hook.', { name });
    }
    testHooks.set(name, handler);
    return () => {
      if (testHooks.get(name) === handler) {
        testHooks.delete(name);
      }
    };
  };

  const invokeTestHook = async <TArgs, TResult>(name: string, args?: TArgs): Promise<TResult> => {
    const handler = testHooks.get(name);
    if (!handler) {
      throw new Error(`No test hook registered for ${name}`);
    }
    try {
      const result = await handler(args as TArgs);
      return result as TResult;
    } catch (error) {
      log('error', 'Test hook invocation failed.', { name, error });
      throw error;
    }
  };

  const registerUiSurface = (surface: UiAutomationSurface | undefined) => {
    uiSurface = surface;
    return () => {
      if (uiSurface === surface) {
        uiSurface = undefined;
      }
    };
  };

  const getUiSurface = () => uiSurface;

  const registerMetricListener = (listener: (sample: MetricSample) => void) => {
    metricListeners.add(listener);
    return () => {
      metricListeners.delete(listener);
    };
  };

  const onSample = (sample: MetricSample) => {
    metrics.push(sample);
    while (metrics.length > config.metricsBufferSize) {
      metrics.shift();
    }
    metricListeners.forEach(listener => {
      try {
        listener(sample);
      } catch (error) {
        log('warn', 'Metric listener threw an error.', { error });
      }
    });
  };

  const performanceMonitor = new PerformanceMonitor({
    sampleIntervalMs: config.performanceSampleIntervalMs,
    onSample,
    logger: {
      debug: (message, metadata) => log('debug', message, metadata),
      warn: (message, metadata) => log('warn', message, metadata),
    },
  });

  const automationBridge: UiAutomationApi = createUiAutomationBridge({
    getSurface: () => uiSurface,
    invokeHook: invokeTestHook,
    defaultTimeoutMs: config.testAgent?.defaultTimeoutMs ?? 5000,
    logger: { log },
  });

  const publicApi: InstrumentationPublicApi = {
    log,
    trace,
    registerTestHook,
    invokeTestHook,
    registerUiSurface,
    getUiSurface,
    registerMetricListener,
    getMetrics: () => [...metrics],
    getConfig: () => config,
  };

  const manager: InstrumentationManager = {
    ...publicApi,
    start: () => performanceMonitor.start(),
    stop: () => performanceMonitor.stop(),
    getAutomationBridge: () => automationBridge,
  };

  return manager;
};
