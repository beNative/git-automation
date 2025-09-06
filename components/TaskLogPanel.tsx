import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import type { LogEntry, Repository } from '../types';
import { LogLevel, RepoStatus } from '../types';
import { XIcon } from './icons/XIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';

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

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    if (!highlight.trim()) {
        return <>{text}</>;
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5 py-0 text-gray-900 dark:text-gray-900">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
};


const TaskLogPanel: React.FC<TaskLogPanelProps> = ({
  onClosePanel, onCloseTab, onSelectTab, logs, allRepositories,
  activeRepoIds, selectedRepoId, height, setHeight, isProcessing,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedRepo = allRepositories.find(r => r.id === selectedRepoId);

  const filteredLogs = useMemo(() => {
    const selectedLogs = selectedRepoId ? logs[selectedRepoId] || [] : [];
    if (!searchQuery.trim()) {
      return selectedLogs;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return selectedLogs.filter(log => log.message.toLowerCase().includes(lowerCaseQuery));
  }, [logs, selectedRepoId, searchQuery]);

  useEffect(() => {
    // Clear search when tab changes for a cleaner experience
    setSearchQuery('');
  }, [selectedRepoId]);

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
  }, [filteredLogs]);

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
      className="relative flex-shrink-0 bg-white dark:bg-gray-800 shadow-lg"
      style={{ height: `${height}px` }}
      role="region"
      aria-label="Task Logs"
    >
      <div 
        onMouseDown={handleMouseDown}
        className="absolute -top-1 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-600 hover:bg-blue-500 cursor-row-resize z-10 transition-colors"
        aria-label="Resize log panel"
        role="separator"
      />
      
      <div className="h-full flex flex-col">
        <header className="flex items-center justify-between pr-1 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex-1 overflow-x-auto" role="tablist">
            <div className="flex items-center p-2 gap-2">
              {activeRepoIds.map(repoId => {
                const repo = allRepositories.find(r => r.id === repoId);
                const isSelected = repoId === selectedRepoId;
                const isTaskRunning = isProcessing.has(repoId);
                const status = repo?.status;
                
                let IconComponent: React.ComponentType<{ className: string }> | null = null;
                let textClasses = '';
                let bgClasses = '';

                if (isTaskRunning) {
                    IconComponent = ArrowPathIcon;
                    if (isSelected) {
                        textClasses = 'text-white';
                        bgClasses = 'bg-blue-600 border-blue-700 hover:bg-blue-700';
                    } else {
                        textClasses = 'text-blue-600 dark:text-blue-400';
                        bgClasses = 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600';
                    }
                } else if (status === RepoStatus.Success) {
                    IconComponent = CheckCircleIcon;
                    if (isSelected) {
                        textClasses = 'text-white';
                        bgClasses = 'bg-green-600 border-green-700 hover:bg-green-700';
                    } else {
                        textClasses = 'text-green-600 dark:text-green-500';
                        bgClasses = 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600';
                    }
                } else if (status === RepoStatus.Failed) {
                    IconComponent = XCircleIcon;
                    if (isSelected) {
                        textClasses = 'text-white';
                        bgClasses = 'bg-red-600 border-red-700 hover:bg-red-700';
                    } else {
                        textClasses = 'text-red-600 dark:text-red-500';
                        bgClasses = 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600';
                    }
                } else { // Idle or other statuses
                    if (isSelected) {
                        textClasses = 'text-blue-800 dark:text-blue-300 font-semibold';
                        bgClasses = 'bg-blue-100 dark:bg-gray-600 border-blue-300 dark:border-gray-500';
                    } else {
                        textClasses = 'text-gray-800 dark:text-gray-200';
                        bgClasses = 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600';
                    }
                }

                const baseClasses = 'group relative flex items-center cursor-pointer rounded-md border px-3 py-1.5 text-sm whitespace-nowrap transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500';
                
                const closeButtonHoverClass = isSelected && (isTaskRunning || status === RepoStatus.Success || status === RepoStatus.Failed) 
                    ? 'hover:bg-white/20' 
                    : 'hover:bg-gray-300 dark:hover:bg-gray-600';

                return (
                  <button
                    key={repoId}
                    role="tab"
                    aria-selected={isSelected}
                    className={`${baseClasses} ${bgClasses} ${textClasses}`}
                    onClick={() => onSelectTab(repoId)}
                  >
                    {IconComponent && <IconComponent className={`mr-2 h-4 w-4 shrink-0 ${isTaskRunning ? 'animate-spin' : ''}`} />}
                    <span className="truncate max-w-[150px]">{repo?.name || '...'}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onCloseTab(repoId); }}
                      className={`ml-2 p-0.5 rounded-full opacity-50 group-hover:opacity-100 ${closeButtonHoverClass} transition-colors`}
                      aria-label={`Close tab for ${repo?.name}`}
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 pr-2">
            <div className="relative flex-1 max-w-xs">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900/50 pl-9 pr-7 py-1 text-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute top-1/2 right-2 -translate-y-1/2 p-0.5 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
            </div>
            {searchQuery && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {filteredLogs.length} matches
                </span>
            )}
            <button
                onClick={onClosePanel}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close log panel"
            >
                <XIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main
          ref={logContainerRef}
          className="flex-grow p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto font-mono text-sm"
          role="log"
        >
          {filteredLogs.length > 0 ? filteredLogs.map((log, index) => (
            <div key={index} className={`flex ${LOG_LEVEL_STYLES[log.level]}`}>
              <span className="flex-shrink-0 mr-4 text-gray-400 dark:text-gray-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <p className="whitespace-pre-wrap break-words">
                {log.level === LogLevel.Command && '$ '}
                <HighlightedText text={log.message} highlight={searchQuery} />
              </p>
            </div>
          )) : (
            <p className="text-gray-500">{searchQuery ? 'No matching logs found.' : `No logs for ${selectedRepo?.name || 'this repository'}.`}</p>
          )}
        </main>
      </div>
    </div>
  );
};

export default TaskLogPanel;