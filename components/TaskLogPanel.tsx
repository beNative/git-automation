import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { LogEntry, Repository } from '../types';
import { LogLevel, RepoStatus } from '../types';
import { XIcon } from './icons/XIcon';

interface TaskLogPanelProps {
  onClosePanel: () => void;
  onCloseTab: (repoId: string) => void;
  onSelectTab: (repoId: string) => void;
  logs: Record<string, LogEntry[]>;
  allRepositories: Repository[];
  activeRepoIds: string[];
  selectedRepoId: string | null;
  height: number;
  setHeight: (height: number) => void;
  isProcessing: Set<string>;
}

const LOG_LEVEL_STYLES: Record<LogLevel, string> = {
  [LogLevel.Info]: 'text-gray-500 dark:text-gray-400',
  [LogLevel.Command]: 'text-blue-600 dark:text-blue-400',
  [LogLevel.Success]: 'text-green-600 dark:text-green-500',
  [LogLevel.Error]: 'text-red-600 dark:text-red-500',
  [LogLevel.Warn]: 'text-yellow-500 dark:text-yellow-400',
};

const MIN_HEIGHT = 100; // Minimum pixel height for the panel

const TaskLogPanel: React.FC<TaskLogPanelProps> = ({
  onClosePanel, onCloseTab, onSelectTab, logs, allRepositories,
  activeRepoIds, selectedRepoId, height, setHeight, isProcessing,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  const selectedRepo = allRepositories.find(r => r.id === selectedRepoId);
  const selectedLogs = selectedRepoId ? logs[selectedRepoId] || [] : [];

  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            const heightValue = getComputedStyle(document.documentElement).getPropertyValue('--status-bar-height').trim();
            const numericHeight = parseFloat(heightValue);
            let pixelHeight = numericHeight;
            if (heightValue.endsWith('rem')) {
                const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
                pixelHeight = numericHeight * rootFontSize;
            } else if (heightValue.endsWith('px')) {
                pixelHeight = numericHeight;
            }
            setStatusBarHeight(pixelHeight);
        } catch (e) {
            console.error("Could not parse --status-bar-height, falling back to 28px.", e);
            setStatusBarHeight(28);
        }
    }
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [selectedLogs]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const maxHeight = window.innerHeight - 100;
      const newHeight = window.innerHeight - e.clientY - statusBarHeight;
      if (newHeight >= MIN_HEIGHT && newHeight <= maxHeight) {
        setHeight(newHeight);
      }
    }
  }, [isResizing, setHeight, statusBarHeight]);

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
      className="relative flex-shrink-0 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700"
      style={{ height: `${height}px` }}
      role="region"
      aria-label="Task Logs"
    >
      <div 
        onMouseDown={handleMouseDown}
        className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize z-10"
        aria-label="Resize log panel"
        role="separator"
      />
      
      <div className="h-full flex flex-col">
        <header className="flex items-center justify-between pl-2 pr-1 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex-1 overflow-x-auto" role="tablist">
            <div className="flex items-center">
              {activeRepoIds.map(repoId => {
                const repo = allRepositories.find(r => r.id === repoId);
                const isSelected = repoId === selectedRepoId;
                const isTaskRunning = isProcessing.has(repoId);
                const status = repo?.status;

                let tabClasses = 'group flex items-center cursor-pointer border-b-2 pt-2 pb-1.5 px-4 text-sm whitespace-nowrap transition-colors ';
                let indicator = null;
                const isCompletedWithStatus = !isTaskRunning && (status === RepoStatus.Success || status === RepoStatus.Failed);

                if (isTaskRunning) {
                    indicator = <span className="mr-2 h-2 w-2 shrink-0 bg-blue-500 rounded-full animate-pulse" title="Task is running"></span>;
                }

                if (isSelected) {
                    tabClasses += 'border-blue-500 font-medium ';
                    if (!isTaskRunning && status === RepoStatus.Success) {
                        tabClasses += 'bg-green-600 text-white dark:bg-green-700';
                    } else if (!isTaskRunning && status === RepoStatus.Failed) {
                        tabClasses += 'bg-red-600 text-white dark:bg-red-700';
                    } else {
                        tabClasses += 'bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white';
                    }
                } else { // Not selected
                    tabClasses += 'border-transparent ';
                    if (!isTaskRunning && status === RepoStatus.Success) {
                        tabClasses += 'bg-green-500 dark:bg-green-800 text-white hover:bg-green-600 dark:hover:bg-green-700';
                    } else if (!isTaskRunning && status === RepoStatus.Failed) {
                        tabClasses += 'bg-red-500 dark:bg-red-800 text-white hover:bg-red-600 dark:hover:bg-red-700';
                    } else {
                        tabClasses += 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/80';
                    }
                }

                return (
                  <div
                    key={repoId}
                    role="tab"
                    aria-selected={isSelected}
                    className={tabClasses}
                    onClick={() => onSelectTab(repoId)}
                  >
                    {indicator}
                    <span className="truncate max-w-[150px]">{repo?.name || '...'}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onCloseTab(repoId); }}
                      className={`ml-2 p-0.5 rounded-full opacity-50 group-hover:opacity-100 ${isCompletedWithStatus ? 'hover:bg-white/20' : 'hover:bg-gray-300 dark:hover:bg-gray-600'} transition-colors`}
                      aria-label={`Close tab for ${repo?.name}`}
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={onClosePanel}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close log panel"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        <main
          ref={logContainerRef}
          className="flex-grow p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto font-mono text-sm"
          role="log"
        >
          {selectedLogs.length > 0 ? selectedLogs.map((log, index) => (
            <div key={index} className={`flex ${LOG_LEVEL_STYLES[log.level]}`}>
              <span className="flex-shrink-0 mr-4 text-gray-400 dark:text-gray-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <p className="whitespace-pre-wrap break-words">
                {log.level === LogLevel.Command && '$ '}{log.message}
              </p>
            </div>
          )) : (
            <p className="text-gray-500">No logs for {selectedRepo?.name || 'this repository'}.</p>
          )}
        </main>
      </div>
    </div>
  );
};

export default TaskLogPanel;