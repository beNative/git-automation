import React, { useEffect, useRef, useCallback, useState, useContext, useMemo } from 'react';
import { LoggerContext } from '../contexts/LoggerContext';
import { DebugLogLevel } from '../types';
import { XIcon } from './icons/XIcon';
import { TrashIcon } from './icons/TrashIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeSlashIcon } from './icons/EyeSlashIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_CONFIG: Record<DebugLogLevel, { color: string; bg: string; }> = {
    [DebugLogLevel.DEBUG]: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
    [DebugLogLevel.INFO]: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    [DebugLogLevel.WARN]: { color: 'text-yellow-600 dark:text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    [DebugLogLevel.ERROR]: { color: 'text-red-600 dark:text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
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

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const { logs, clearLogs, filters, setFilter, isSavingToFile, toggleSaveToFile } = useContext(LoggerContext);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [height, setHeight] = useState(300);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
      const levelFiltered = logs.filter(log => filters[log.level]);
      if (!searchQuery.trim()) {
        return levelFiltered;
      }
      const lowerCaseQuery = searchQuery.toLowerCase();
      return levelFiltered.filter(log => 
          log.message.toLowerCase().includes(lowerCaseQuery) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(lowerCaseQuery))
      );
  }, [logs, filters, searchQuery]);

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
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= MIN_HEIGHT && newHeight <= maxHeight) {
        setHeight(newHeight);
      }
    }
  }, [isResizing]);

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
      className={`fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 shadow-2xl border-t-2 border-yellow-400 transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      style={{ height: `${height}px` }}
      aria-hidden={!isOpen}
    >
      <div 
        onMouseDown={handleMouseDown}
        className="absolute -top-1.5 left-0 right-0 h-2 cursor-row-resize"
        aria-label="Resize debug panel"
        role="separator"
      >
        {/* The visual separator is the yellow top border of the panel itself. */}
      </div>

      <div className="h-full flex flex-col">
        <header className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 gap-4">
          <h2 className="text-base font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider flex-shrink-0">Debug Console</h2>
          
          <div className="flex-1 min-w-0">
            <div className="relative w-full max-w-md">
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
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {Object.keys(filters).map(level => (
              <button 
                key={level}
                onClick={() => setFilter(level as DebugLogLevel, !filters[level as DebugLogLevel])}
                className={`px-2 py-0.5 text-xs rounded-md flex items-center ${filters[level as DebugLogLevel] ? `${LEVEL_CONFIG[level as DebugLogLevel].bg} ${LEVEL_CONFIG[level as DebugLogLevel].color}` : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
              >
                {filters[level as DebugLogLevel] ? <EyeIcon className="h-3 w-3 mr-1" /> : <EyeSlashIcon className="h-3 w-3 mr-1" />}
                {level}
              </button>
            ))}
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"/>
            <button onClick={toggleSaveToFile} className={`p-1.5 rounded-full ${isSavingToFile ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/50' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`} title={isSavingToFile ? "Stop saving to file" : "Save logs to file"}>
                <DocumentArrowDownIcon className="h-5 w-5" />
            </button>
             <button onClick={clearLogs} className="p-1.5 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" title="Clear logs">
                <TrashIcon className="h-5 w-5" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close debug panel">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main ref={logContainerRef} className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 overflow-y-auto font-mono text-xs">
          {filteredLogs.map(log => (
            <div key={log.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 p-0.5 rounded flex items-start">
              <div className="flex-shrink-0">
                <span className="text-gray-500 mr-2">{log.timestamp.toLocaleTimeString()}.{log.timestamp.getMilliseconds().toString().padStart(3, '0')}</span>
                <span className={`font-bold mr-2 ${LEVEL_CONFIG[log.level].color}`}>{log.level.padEnd(5)}</span>
              </div>
              <div className="flex-grow min-w-0">
                <span className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                    <HighlightedText text={log.message} highlight={searchQuery} />
                </span>
                {log.data && (
                    <pre className="mt-1 ml-4 text-gray-500 text-[11px] whitespace-pre-wrap">
                        <HighlightedText text={JSON.stringify(log.data, null, 2)} highlight={searchQuery} />
                    </pre>
                )}
              </div>
            </div>
          ))}
          {logs.length > 0 && filteredLogs.length === 0 && (
              <p className="text-gray-500">No matching logs for current filter.</p>
          )}
          {logs.length === 0 && <p className="text-gray-500">Waiting for logs...</p>}
        </main>
        <footer className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5 border-t border-gray-200 dark:border-gray-700">
          Showing {filteredLogs.length} of {logs.length} total entries.
        </footer>
      </div>
    </div>
  );
};

export default DebugPanel;