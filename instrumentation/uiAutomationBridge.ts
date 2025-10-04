import type {
  InstrumentationLogLevel,
  UiAutomationApi,
  UiAutomationSurface,
  UiAutomationWaitOptions,
} from './types';

type UiAutomationBridgeOptions = {
  getSurface: () => UiAutomationSurface | undefined;
  invokeHook: <TArgs, TResult>(name: string, args?: TArgs) => Promise<TResult>;
  defaultTimeoutMs: number;
  logger: {
    log: (level: InstrumentationLogLevel, message: string, metadata?: unknown) => void;
  };
};

const queryByAutomationId = (automationId: string): Element | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.querySelector(`[data-automation-id="${automationId}"]`);
};

const dispatchInputEvents = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const nativeValueSetter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set;
  nativeValueSetter?.call(element, value);

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

export const createUiAutomationBridge = ({
  getSurface,
  invokeHook,
  defaultTimeoutMs,
  logger,
}: UiAutomationBridgeOptions): UiAutomationApi => {
  const waitForTestId = async (
    automationId: string,
    options?: UiAutomationWaitOptions,
  ): Promise<Element> => {
    const timeout = options?.timeoutMs ?? defaultTimeoutMs;
    const interval = options?.intervalMs ?? 100;
    const start = Date.now();

    while (Date.now() - start <= timeout) {
      const element = queryByAutomationId(automationId);
      if (element) {
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Element with automation id "${automationId}" not found within ${timeout}ms.`);
  };

  const click = async (automationId: string) => {
    const element = await waitForTestId(automationId);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Element with automation id "${automationId}" is not an HTMLElement.`);
    }
    logger.log('debug', 'UI automation click', { automationId });
    element.click();
  };

  const setInputValue = async (automationId: string, value: string) => {
    const element = await waitForTestId(automationId);
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      throw new Error(`Element with automation id "${automationId}" is not an input or textarea element.`);
    }
    logger.log('debug', 'UI automation set input value', { automationId, value });
    dispatchInputEvents(element, value);
  };

  const getTextContent = async (automationId: string) => {
    const element = await waitForTestId(automationId);
    return element.textContent;
  };

  return {
    click,
    setInputValue,
    getTextContent,
    waitForTestId,
    runHook: invokeHook,
    getActiveView: () => getSurface()?.getActiveView?.(),
    setActiveView: async (view) => {
      const surface = getSurface();
      if (!surface?.setActiveView) {
        throw new Error('No UI surface registered or surface does not support setActiveView.');
      }
      logger.log('debug', 'UI automation set active view', { view });
      await surface.setActiveView(view);
    },
    getStateSnapshot: () => getSurface()?.getStateSnapshot?.(),
  };
};
