import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LoggerProvider } from './contexts/LoggerContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import {
  attachDiagnosticsInspector,
  createDiagnosticsScope,
  formatErrorForLogging,
  recordDiagnostics,
} from './diagnostics';

declare global {
  interface Window {
    __appDiagnosticsRegistered__?: boolean;
  }
}

const diagnostics = createDiagnosticsScope('RendererBootstrap');

const registerGlobalDiagnostics = () => {
  if (typeof window === 'undefined') {
    recordDiagnostics('RendererBootstrap', 'warn', 'registerGlobalDiagnostics invoked without window context');
    return;
  }

  if (window.__appDiagnosticsRegistered__) {
    diagnostics.debug('Global diagnostics already registered');
    return;
  }

  window.__appDiagnosticsRegistered__ = true;

  diagnostics.info('Registering window-level diagnostics handlers');

  window.addEventListener('error', event => {
    diagnostics.error('Unhandled error event', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener('unhandledrejection', event => {
    diagnostics.error('Unhandled promise rejection', {
      reason: event.reason instanceof Error ? formatErrorForLogging(event.reason) : event.reason,
    });
  });
};

registerGlobalDiagnostics();

attachDiagnosticsInspector();

diagnostics.info('Starting application render');

const rootElement = document.getElementById('root');
if (!rootElement) {
  diagnostics.error('Root element not found - aborting render');
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
try {
  diagnostics.debug('Invoking React root render');
  root.render(
    <React.StrictMode>
      <SettingsProvider>
        <LoggerProvider>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </LoggerProvider>
      </SettingsProvider>
    </React.StrictMode>
  );
  diagnostics.info('React root render completed');
} catch (error) {
  diagnostics.error('React root render threw an error', formatErrorForLogging(error));
  throw error;
}