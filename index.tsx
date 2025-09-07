import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Correctly import from .tsx files
import App from './App.tsx';
import { LoggerProvider } from './contexts/LoggerContext';
// FIX: Correctly import from .tsx files
import { SettingsProvider } from './contexts/SettingsContext.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <LoggerProvider>
        <App />
      </LoggerProvider>
    </SettingsProvider>
  </React.StrictMode>
);