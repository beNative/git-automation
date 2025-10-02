import React from 'react';
import { LoggerContext } from '../contexts/LoggerContext';
import { DebugLogLevel } from '../types';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  componentTrace: string[];
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  static contextType = LoggerContext;
  declare context: React.ContextType<typeof LoggerContext>;

  state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    componentTrace: [],
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error, errorInfo: null, componentTrace: [] };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const componentTrace = this.extractComponentTrace(errorInfo.componentStack);

    console.group('[AppErrorBoundary] Caught unhandled error');
    console.error('Error', error);
    if (error.stack) {
      console.error('Stack trace', error.stack);
    }
    if (componentTrace.length > 0) {
      console.error('Component trace', componentTrace);
    } else if (errorInfo.componentStack) {
      console.error('Raw component stack', errorInfo.componentStack);
    }
    console.groupEnd();

    try {
      const logger = this.context;
      if (logger && typeof logger.addLog === 'function') {
        logger.addLog(DebugLogLevel.ERROR, `Unhandled renderer error: ${error.message}`, {
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          componentTrace,
        });
      }
    } catch (loggingError) {
      console.error('[AppErrorBoundary] Failed to forward error to LoggerContext', loggingError);
    }

    this.setState({ errorInfo, componentTrace });
  }

  private extractComponentTrace(componentStack?: string | null): string[] {
    if (!componentStack) {
      return [];
    }

    return componentStack
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.replace(/^in\s+/, '').replace(/\s+\(.+\)$/, ''))
      .filter(Boolean);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, componentTrace: [] });
  };

  render() {
    if (this.state.hasError) {
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
          {this.state.componentTrace.length > 0 && (
            <div className="max-w-xl space-y-2 rounded border border-red-500/40 bg-black/40 p-3 text-left text-xs text-red-100">
              <div className="font-semibold uppercase tracking-wide text-red-300">Component trace</div>
              <ol className="list-inside list-decimal space-y-1">
                {this.state.componentTrace.map((name, index) => (
                  <li key={`${name}-${index}`}>{name}</li>
                ))}
              </ol>
            </div>
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

    return this.props.children;
  }
}
