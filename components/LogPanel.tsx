import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { LogEntry, Repository } from '../types';
import { LogLevel } from '../types';
import { XIcon } from './icons/XIcon';

interface LogPanelProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  repository: Repository | undefined;
  height: number;
  setHeight: (height: number) => void;
}

const LOG_LEVEL_STYLES: Record<LogLevel, string> = {
  [LogLevel.Info]: 'text-gray-500 dark:text-gray-400',
  [LogLevel.Command]: 'text-cyan-600 dark:text-cyan-400',
  [LogLevel.Success]: 'text-green-600 dark:text-green-400',
  [LogLevel.Error]: 'text-red-600 dark:text-red-400',
  [LogLevel.Warn]: 'text-yellow-600 dark:text-yellow-400',
};

const MIN_HEIGHT = 100;
const MAX_HEIGHT = window.innerHeight - 100;

const LogPanel: React.FC<LogPanelProps> = ({ isOpen, onClose, logs, repository, height, setHeight }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= MIN_HEIGHT && newHeight <= MAX_HEIGHT) {
        setHeight(newHeight);
      }
    }
  }, [isResizing, setHeight]);
  
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);


  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-800 shadow-2xl border-t border-gray-200 dark:border-gray-700 transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      style={{ height: `${height}px` }}
    >
      <div 
        ref={resizeHandleRef}
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-0 right-0 h-2 cursor-row-resize flex items-center justify-center group"
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-cyan-500 transition-colors"/>
      </div>

      <div className="h-full flex flex-col pt-2">
        <header className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Logs: <span className="text-cyan-600 dark:text-cyan-400">{repository?.name || '...'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        <main
          ref={logContainerRef}
          className="flex-grow px-4 pb-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto font-mono text-sm"
        >
          {logs.map((log, index) => (
            <div key={index} className={`flex ${LOG_LEVEL_STYLES[log.level]}`}>
              <span className="flex-shrink-0 mr-4 text-gray-400 dark:text-gray-600">{log.timestamp}</span>
              <p className="whitespace-pre-wrap break-words">
                {log.level === LogLevel.Command && '$ '}{log.message}
              </p>
            </div>
          ))}
          {logs.length === 0 && <p className="text-gray-500">Waiting for logs...</p>}
        </main>
      </div>
    </div>
  );
};

export default LogPanel;