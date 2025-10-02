import React from 'react';
import { LoggerContext } from '../contexts/LoggerContext';
import { DebugLogLevel } from '../types';
import { createDiagnosticsScope, formatErrorForLogging } from '../diagnostics';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  static contextType = LoggerContext;
  declare context: React.ContextType<typeof LoggerContext>;

  private diagnostics = createDiagnosticsScope('AppErrorBoundary');

  state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    createDiagnosticsScope('AppErrorBoundary').error('getDerivedStateFromError triggered', formatErrorForLogging(error));
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.diagnostics.error('componentDidCatch captured error', {
      error: formatErrorForLogging(error),
      componentStack: errorInfo.componentStack,
    });
    console.error('[AppErrorBoundary] Caught unhandled error', error, errorInfo);

    try {
      const logger = this.context;
      if (logger && typeof logger.addLog === 'function') {
        logger.addLog(DebugLogLevel.ERROR, `Unhandled renderer error: ${error.message}`, {
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        });
      }
    } catch (loggingError) {
      console.error('[AppErrorBoundary] Failed to forward error to LoggerContext', loggingError);
    }

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.diagnostics.info('Retry button clicked');
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      this.diagnostics.debug('Rendering fallback UI', {
        message: this.state.error?.message,
        stack: this.state.error?.stack,
      });
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-red-900/10 p-8 text-center">
          <h1 className="text-2xl font-semibold text-red-600 dark:text-red-400">Something went wrong</h1>
          <p className="max-w-xl text-sm text-gray-700 dark:text-gray-200">
            The renderer crashed before it could finish loading. Check the developer console for the full stack trace.
            A copy of the error message and component stack has been forwarded to the in-app debug log.
          </p>
          {this.state.error && (
            <pre className="max-w-xl overflow-auto rounded bg-black/60 p-3 text-left text-xs text-red-200">
              {this.state.error.message}
              {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
              {this.state.errorInfo?.componentStack ? `\n\nComponent stack:${this.state.errorInfo.componentStack}` : ''}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Retry loading
          </button>
        </div>
      );
    }

    this.diagnostics.debug('Rendering children');
    return this.props.children;
  }
}
