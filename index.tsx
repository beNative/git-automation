import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LoggerProvider } from './contexts/LoggerContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { InstrumentationProvider } from './contexts/InstrumentationContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <LoggerProvider>
        <InstrumentationProvider>
          <App />
        </InstrumentationProvider>
      </LoggerProvider>
    </SettingsProvider>
  </React.StrictMode>
);
