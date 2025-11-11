import React, { useEffect, useRef, useCallback, useState, useContext, useMemo } from 'react';
import { LoggerContext } from '../contexts/LoggerContext';
import { DebugLogLevel } from '../types';
import { XIcon } from './icons/XIcon';
import { TrashIcon } from './icons/TrashIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeSlashIcon } from './icons/EyeSlashIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { DocumentDuplicateIcon } from './icons/DocumentDuplicateIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

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

const arraysEqual = (a: number[], b: number[]) => a.length === b.length && a.every((value, index) => value === b[index]);

type CopyOptions = {
    includeTimestamp: boolean;
    includeLevel: boolean;
    includeData: boolean;
    preserveLineBreaks: boolean;
};

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
  const [selectedLogIds, setSelectedLogIds] = useState<number[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragAnchorIndex, setDragAnchorIndex] = useState<number | null>(null);
  const [isCopyOptionsOpen, setIsCopyOptionsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyOptionsContainerRef = useRef<HTMLDivElement>(null);
  const [copyOptions, setCopyOptions] = useState<CopyOptions>({
      includeTimestamp: true,
      includeLevel: true,
      includeData: true,
      preserveLineBreaks: true,
  });
  const textSelectionCandidateRef = useRef<number | null>(null);
  const clearBrowserTextSelection = useCallback(() => {
      if (typeof window === 'undefined') {
          return;
      }
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
          selection.removeAllRanges();
      }
  }, []);

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

  const logIndexMap = useMemo(() => new Map(filteredLogs.map((log, index) => [log.id, index])), [filteredLogs]);

  const normalizeSelection = useCallback((ids: number[]) => {
      const seen = new Set<number>();
      const normalized = ids
          .filter(id => {
              if (!logIndexMap.has(id) || seen.has(id)) {
                  return false;
              }
              seen.add(id);
              return true;
          })
          .sort((a, b) => (logIndexMap.get(a)! - logIndexMap.get(b)!));
      return normalized;
  }, [logIndexMap]);

  useEffect(() => {
      setSelectedLogIds(prev => {
          const normalized = normalizeSelection(prev);
          return arraysEqual(prev, normalized) ? prev : normalized;
      });
  }, [normalizeSelection]);

  useEffect(() => {
      if (selectedLogIds.length === 0) {
          setLastSelectedIndex(null);
          return;
      }

      if (lastSelectedIndex !== null) {
          const logAtIndex = filteredLogs[lastSelectedIndex];
          if (!logAtIndex || !selectedLogIds.includes(logAtIndex.id)) {
              const lastSelectedId = selectedLogIds[selectedLogIds.length - 1];
              if (lastSelectedId === undefined) {
                  setLastSelectedIndex(null);
                  return;
              }
              const recalculatedIndex = logIndexMap.get(lastSelectedId);
              if (recalculatedIndex === undefined) {
                  setLastSelectedIndex(null);
              } else if (recalculatedIndex !== lastSelectedIndex) {
                  setLastSelectedIndex(recalculatedIndex);
              }
          }
      }
  }, [filteredLogs, lastSelectedIndex, logIndexMap, selectedLogIds]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  useEffect(() => {
      const handleMouseUp = () => {
          setIsDraggingSelection(false);
          setDragAnchorIndex(null);
          textSelectionCandidateRef.current = null;
      };

      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  useEffect(() => {
      if (!isCopyOptionsOpen) {
          return;
      }
      const handleClick = (event: MouseEvent) => {
          if (copyOptionsContainerRef.current && !copyOptionsContainerRef.current.contains(event.target as Node)) {
              setIsCopyOptionsOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
  }, [isCopyOptionsOpen]);

  useEffect(() => () => {
      if (copyFeedbackTimeoutRef.current) {
          clearTimeout(copyFeedbackTimeoutRef.current);
      }
  }, []);

  const applySelectionWithModifiers = useCallback((index: number, modifiers: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; }) => {
      const log = filteredLogs[index];
      if (!log) {
          return;
      }

      const hasMeta = Boolean(modifiers.metaKey || modifiers.ctrlKey);
      const hasShift = Boolean(modifiers.shiftKey);

      setSelectedLogIds(prev => {
          let nextSelection: number[] = prev;
          if (hasShift && lastSelectedIndex !== null) {
              const start = Math.min(lastSelectedIndex, index);
              const end = Math.max(lastSelectedIndex, index);
              const rangeIds = filteredLogs.slice(start, end + 1).map(entry => entry.id);
              if (hasMeta) {
                  const merged = new Set(prev);
                  rangeIds.forEach(id => merged.add(id));
                  nextSelection = Array.from(merged);
              } else {
                  nextSelection = rangeIds;
              }
          } else if (hasShift && lastSelectedIndex === null) {
              nextSelection = [log.id];
          } else if (hasMeta) {
              const updated = new Set(prev);
              if (updated.has(log.id)) {
                  updated.delete(log.id);
              } else {
                  updated.add(log.id);
              }
              nextSelection = Array.from(updated);
          } else {
              nextSelection = [log.id];
          }

          const normalized = normalizeSelection(nextSelection);
          return arraysEqual(prev, normalized) ? prev : normalized;
      });

      setLastSelectedIndex(index);
  }, [filteredLogs, lastSelectedIndex, normalizeSelection]);

  const handleSelection = useCallback((
      event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
      index: number,
      options: { preventDefault?: boolean } = {},
  ) => {
      if (options.preventDefault !== false) {
          event.preventDefault();
      }
      textSelectionCandidateRef.current = null;
      applySelectionWithModifiers(index, {
          metaKey: 'metaKey' in event ? event.metaKey : false,
          ctrlKey: 'ctrlKey' in event ? event.ctrlKey : false,
          shiftKey: event.shiftKey,
      });
  }, [applySelectionWithModifiers, textSelectionCandidateRef]);

  const handleLogMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, index: number) => {
      if (event.button !== 0) {
          return;
      }
      const hasModifier = event.metaKey || event.ctrlKey || event.shiftKey;
      const target = event.target as HTMLElement | null;
      const isTextSelectionTarget = Boolean(target?.closest('[data-text-content="true"]'));

      if (hasModifier) {
          clearBrowserTextSelection();
          handleSelection(event, index);
          event.currentTarget.focus();
          setIsDraggingSelection(false);
          setDragAnchorIndex(null);
          return;
      }

      if (isTextSelectionTarget) {
          textSelectionCandidateRef.current = index;
          setIsDraggingSelection(false);
          setDragAnchorIndex(null);
          return;
      }

      clearBrowserTextSelection();
      handleSelection(event, index);
      event.currentTarget.focus();
      setIsDraggingSelection(true);
      setDragAnchorIndex(index);
  }, [clearBrowserTextSelection, handleSelection, textSelectionCandidateRef]);

  const handleLogMouseEnter = useCallback((index: number) => {
      if (!isDraggingSelection || dragAnchorIndex === null) {
          return;
      }
      const start = Math.min(dragAnchorIndex, index);
      const end = Math.max(dragAnchorIndex, index);
      const rangeIds = filteredLogs.slice(start, end + 1).map(entry => entry.id);
      setSelectedLogIds(prev => {
          const normalized = normalizeSelection(rangeIds);
          return arraysEqual(prev, normalized) ? prev : normalized;
      });
      setLastSelectedIndex(index);
  }, [dragAnchorIndex, filteredLogs, isDraggingSelection, normalizeSelection]);

  const handleLogKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
      if (event.key === ' ' || event.key === 'Enter') {
          handleSelection(event, index);
          return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (filteredLogs.length === 0) {
              return;
          }
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          const nextIndex = Math.min(Math.max(0, index + delta), filteredLogs.length - 1);
          applySelectionWithModifiers(nextIndex, {
              metaKey: event.metaKey,
              ctrlKey: event.ctrlKey,
              shiftKey: event.shiftKey,
          });
          const container = logContainerRef.current;
          const nextElement = container?.querySelector<HTMLDivElement>(`[data-log-index="${nextIndex}"]`);
          nextElement?.focus();
          nextElement?.scrollIntoView({ block: 'nearest' });
          return;
      }
  }, [applySelectionWithModifiers, filteredLogs.length, handleSelection]);

  const handleLogClick = useCallback((event: React.MouseEvent<HTMLDivElement>, index: number) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) {
          event.preventDefault();
          event.currentTarget.focus();
          return;
      }

      const target = event.target as HTMLElement | null;
      const isTextSelectionTarget = Boolean(target?.closest('[data-text-content="true"]'));
      const candidateIndex = textSelectionCandidateRef.current;
      const selection = typeof window !== 'undefined' ? window.getSelection() : null;
      const hasActiveTextSelection = Boolean(selection && !selection.isCollapsed && selection.toString().trim().length > 0);

      if (candidateIndex === index) {
          textSelectionCandidateRef.current = null;
          if (hasActiveTextSelection) {
              return;
          }
      }

      if (isTextSelectionTarget && hasActiveTextSelection) {
          return;
      }

      handleSelection(event, index, { preventDefault: false });
      event.currentTarget.focus();
  }, [handleSelection, textSelectionCandidateRef]);

  const handleLogContainerKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.key === 'a' || event.key === 'A') && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          setSelectedLogIds(prev => {
              const allIds = filteredLogs.map(log => log.id);
              const normalized = normalizeSelection(allIds);
              return arraysEqual(prev, normalized) ? prev : normalized;
          });
          setLastSelectedIndex(filteredLogs.length ? filteredLogs.length - 1 : null);
      }
  }, [filteredLogs, normalizeSelection]);

  const selectedLogs = useMemo(() => {
      if (selectedLogIds.length === 0) {
          return [];
      }
      const selectedSet = new Set(selectedLogIds);
      return filteredLogs.filter(log => selectedSet.has(log.id));
  }, [filteredLogs, selectedLogIds]);

  const selectedLogSet = useMemo(() => new Set(selectedLogIds), [selectedLogIds]);

  const formatLogForCopy = useCallback((log: typeof filteredLogs[number]) => {
      const segments: string[] = [];
      if (copyOptions.includeTimestamp) {
          segments.push(`${log.timestamp.toLocaleTimeString()}.${log.timestamp.getMilliseconds().toString().padStart(3, '0')}`);
      }
      if (copyOptions.includeLevel) {
          segments.push(log.level);
      }
      const message = copyOptions.preserveLineBreaks
          ? log.message
          : log.message.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
      segments.push(message);
      let entry = segments.filter(Boolean).join(' | ');

      if (copyOptions.includeData && log.data !== undefined && log.data !== null && log.data !== '') {
          let dataString: string;
          if (typeof log.data === 'string') {
              dataString = log.data;
          } else {
              try {
                  dataString = JSON.stringify(log.data, null, copyOptions.preserveLineBreaks ? 2 : 0);
              } catch (error) {
                  dataString = String(log.data);
              }
          }

          if (!copyOptions.preserveLineBreaks) {
              dataString = dataString.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
              entry = `${entry} | data=${dataString}`;
          } else {
              entry = `${entry}\n${dataString}`;
          }
      }

      return entry;
  }, [copyOptions]);

  const handleCopySelected = useCallback(async () => {
      if (selectedLogs.length === 0) {
          return;
      }

      const payload = selectedLogs.map(formatLogForCopy).join(copyOptions.preserveLineBreaks ? '\n\n' : '\n');

      const complete = (status: 'success' | 'error') => {
          setCopyStatus(status);
          if (copyFeedbackTimeoutRef.current) {
              clearTimeout(copyFeedbackTimeoutRef.current);
          }
          copyFeedbackTimeoutRef.current = setTimeout(() => setCopyStatus('idle'), status === 'success' ? 2000 : 4000);
      };

      try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(payload);
          } else {
              const textarea = document.createElement('textarea');
              textarea.value = payload;
              textarea.setAttribute('readonly', '');
              textarea.style.position = 'absolute';
              textarea.style.left = '-9999px';
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
          }
          complete('success');
      } catch (error) {
          console.error('Failed to copy logs', error);
          complete('error');
      }
  }, [copyOptions.preserveLineBreaks, formatLogForCopy, selectedLogs]);

  const handleCopyOptionToggle = useCallback((option: keyof CopyOptions) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const { checked } = event.target;
      setCopyOptions(prev => ({ ...prev, [option]: checked }));
  }, []);

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
        <header className="flex flex-wrap items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 gap-4">
          <h2 className="text-base font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider flex-shrink-0">Debug Console</h2>

          <div className="flex-1 min-w-[220px] order-3 w-full md:order-2 md:w-auto">
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

          <div className="flex items-center flex-wrap justify-end gap-2 flex-shrink-0 order-2 md:order-3">
            <div className="relative flex items-center" ref={copyOptionsContainerRef}>
              <button
                onClick={handleCopySelected}
                disabled={selectedLogs.length === 0}
                className={`px-2 py-1 text-xs rounded-l-md border flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-yellow-500 ${selectedLogs.length === 0 ? 'text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                aria-disabled={selectedLogs.length === 0}
                title={selectedLogs.length === 0 ? 'Select one or more logs to copy' : `Copy ${selectedLogs.length} selected log${selectedLogs.length > 1 ? 's' : ''}`}
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Copy</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCopyOptionsOpen(prev => !prev)}
                className={`px-1.5 py-1 text-xs rounded-r-md border border-l-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-yellow-500 ${selectedLogs.length === 0 ? 'text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                aria-label="Copy formatting options"
                aria-haspopup="true"
                aria-expanded={isCopyOptionsOpen}
              >
                <ChevronDownIcon className="h-4 w-4" />
              </button>
              {isCopyOptionsOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-3 text-xs space-y-3 z-10">
                  <fieldset className="space-y-2">
                    <legend className="font-semibold text-gray-700 dark:text-gray-200 text-[11px] uppercase tracking-wide">Copy formatting</legend>
                    <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-yellow-500 focus:ring-yellow-500" checked={copyOptions.includeTimestamp} onChange={handleCopyOptionToggle('includeTimestamp')} />
                      <span>Include timestamps</span>
                    </label>
                    <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-yellow-500 focus:ring-yellow-500" checked={copyOptions.includeLevel} onChange={handleCopyOptionToggle('includeLevel')} />
                      <span>Include log levels</span>
                    </label>
                    <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-yellow-500 focus:ring-yellow-500" checked={copyOptions.includeData} onChange={handleCopyOptionToggle('includeData')} />
                      <span>Include structured data</span>
                    </label>
                    <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-yellow-500 focus:ring-yellow-500" checked={copyOptions.preserveLineBreaks} onChange={handleCopyOptionToggle('preserveLineBreaks')} />
                      <span>Preserve line breaks</span>
                    </label>
                  </fieldset>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Copied logs use the on-screen order for easy sharing and triage.</p>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 min-w-[90px]" aria-live="polite">
              {selectedLogs.length > 0 ? `${selectedLogs.length} selected` : 'No selection'}
            </div>
            <div className="text-xs min-w-[72px]" aria-live="polite">
              {copyStatus === 'success' && <span className="text-green-600 dark:text-green-400">Copied!</span>}
              {copyStatus === 'error' && <span className="text-red-600 dark:text-red-400">Copy failed</span>}
            </div>
            <div className="hidden sm:block w-px h-5 bg-gray-300 dark:bg-gray-600" />
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

        <main
          ref={logContainerRef}
          className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 overflow-y-auto font-mono text-xs focus:outline-none"
          role="listbox"
          aria-label="Debug logs"
          aria-multiselectable="true"
          tabIndex={0}
          onKeyDown={handleLogContainerKeyDown}
        >
          {filteredLogs.map((log, index) => {
            const isSelected = selectedLogSet.has(log.id);
            return (
              <div
                key={log.id}
                data-log-index={index}
                tabIndex={0}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(event) => handleLogMouseDown(event, index)}
                onMouseEnter={() => handleLogMouseEnter(index)}
                onKeyDown={(event) => handleLogKeyDown(event, index)}
                onClick={(event) => handleLogClick(event, index)}
                className={`p-0.5 rounded flex items-start cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 ${isSelected ? 'bg-yellow-100 dark:bg-yellow-800/40 ring-1 ring-yellow-400 dark:ring-yellow-500' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
              >
                <div className="flex-shrink-0">
                  <span className="text-gray-500 mr-2">{log.timestamp.toLocaleTimeString()}.{log.timestamp.getMilliseconds().toString().padStart(3, '0')}</span>
                  <span className={`font-bold mr-2 ${LEVEL_CONFIG[log.level].color}`}>{log.level.padEnd(5)}</span>
                </div>
                <div className="flex-grow min-w-0">
                  <span className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words" data-text-content="true">
                    <HighlightedText text={log.message} highlight={searchQuery} />
                  </span>
                  {log.data && (
                    <pre className="mt-1 ml-4 text-gray-500 text-[11px] whitespace-pre-wrap" data-text-content="true">
                      <HighlightedText text={JSON.stringify(log.data, null, 2)} highlight={searchQuery} />
                    </pre>
                  )}
                </div>
              </div>
            );
          })}
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