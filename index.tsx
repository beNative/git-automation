import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LoggerProvider } from './contexts/LoggerContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';

declare global {
  interface Window {
    __appDiagnosticsRegistered__?: boolean;
  }
}

const registerGlobalDiagnostics = () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.__appDiagnosticsRegistered__) {
    return;
  }

  window.__appDiagnosticsRegistered__ = true;

  console.info('[RendererBootstrap] Registering global diagnostics handlers');

  window.addEventListener('error', event => {
    console.error('[RendererBootstrap] Unhandled error event', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener('unhandledrejection', event => {
    console.error('[RendererBootstrap] Unhandled promise rejection', {
      reason: event.reason,
    });
  });
};

registerGlobalDiagnostics();

console.info('[RendererBootstrap] Starting application render');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
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