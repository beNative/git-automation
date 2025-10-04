import type { InstrumentationManager, UiAutomationApi } from './instrumentation';

declare global {
  interface Window {
    __instrumentation?: InstrumentationManager;
    __automationBridge?: UiAutomationApi;
    __instrumentationConfig__?: Record<string, unknown>;
    __instrumentationEnv__?: Record<string, string>;
  }
}

export {};
