import React, { useState, useEffect } from 'react';
import type { Repository, Commit, CommitDiffFile } from '../../types';
import { ClockIcon } from '../icons/ClockIcon';
import { XIcon } from '../icons/XIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { ClipboardIcon } from '../icons/ClipboardIcon';

interface CommitHistoryModalProps {
  isOpen: boolean;
  repository: Repository | null;
  initialCommits: Commit[] | null;
  onClose: () => void;
}

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    if (!highlight.trim()) {
        return <>{text}</>;
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5 py-0 text-gray-900 dark:text-gray-900">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};


const DIFF_PAGE_SIZE = 5;

const getFileExtension = (filePath: string): string => {
    const trimmed = filePath.split('/').pop() ?? filePath;
    const lastDot = trimmed.lastIndexOf('.');
    if (lastDot === -1) {
        return '(no extension)';
    }
    return trimmed.slice(lastDot + 1).toLowerCase();
};

const DiffContent: React.FC<{ diff: string }> = ({ diff }) => {
    const lines = diff.split('\n');
    return (
        <pre className="bg-gray-900 text-gray-100 text-xs leading-relaxed rounded-md p-3 overflow-auto max-h-96 whitespace-pre font-mono">
            {lines.map((line, idx) => {
                let lineClass = '';
                if (line.startsWith('+++') || line.startsWith('---')) {
                    lineClass = 'text-blue-300';
                } else if (line.startsWith('@@')) {
                    lineClass = 'text-amber-300';
                } else if (line.startsWith('+')) {
                    lineClass = 'text-emerald-400';
                } else if (line.startsWith('-')) {
                    lineClass = 'text-rose-400';
                } else if (line.startsWith('diff --git') || line.startsWith('Index: ')) {
                    lineClass = 'text-sky-300 font-semibold';
                }

                const classes = ['block'];
                if (lineClass) {
                    classes.push(lineClass);
                }

                return (
                    <code key={idx} className={classes.join(' ')}>{line || '\u00A0'}</code>
                );
            })}
        </pre>
    );
};


const CommitHistoryModal: React.FC<CommitHistoryModalProps> = ({ isOpen, repository, initialCommits, onClose }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [matchStats, setMatchStats] = useState({ commitCount: 0, occurrenceCount: 0 });
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(() => new Set());
  const [diffCache, setDiffCache] = useState<Record<string, CommitDiffFile[]>>({});
  const [diffLoading, setDiffLoading] = useState<Record<string, boolean>>({});
  const [diffErrors, setDiffErrors] = useState<Record<string, string | null>>({});
  const [diffFilters, setDiffFilters] = useState<Record<string, string>>({});
  const [diffVisibleCount, setDiffVisibleCount] = useState<Record<string, number>>({});
  const [copiedCommit, setCopiedCommit] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
        clearTimeout(handler);
    };
  }, [searchQuery]);

  // Fetch initial history when modal opens or search query changes
  useEffect(() => {
    if (!isOpen || !repository) {
      return;
    }

    if (!debouncedSearchQuery && initialCommits) {
      setIsLoading(false);
      setCommits(initialCommits);
      setHasMore(initialCommits.length === 100);
      setMatchStats({ commitCount: initialCommits.length, occurrenceCount: 0 });
      return;
    }

    const fetchInitialHistory = async () => {
      setIsLoading(true);
      setCommits([]);
      setHasMore(true);
      setMatchStats({ commitCount: 0, occurrenceCount: 0 });
      try {
        const fetchedCommits = await window.electronAPI.getCommitHistory(repository, 0, debouncedSearchQuery);
        setCommits(fetchedCommits);
        setHasMore(fetchedCommits.length === 100);

        if (debouncedSearchQuery) {
          let occurrences = 0;
          const regex = new RegExp(debouncedSearchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
          fetchedCommits.forEach(commit => {
            occurrences += (commit.message.match(regex) || []).length;
          });
          setMatchStats({ commitCount: fetchedCommits.length, occurrenceCount: occurrences });
        }
      } catch (error) {
        console.error(`Failed to load history for ${repository.name}:`, error);
        setCommits([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialHistory();
  }, [isOpen, repository, debouncedSearchQuery, initialCommits]);
  
  // Reset search query when modal is closed
  useEffect(() => {
    if (!isOpen) {
        setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
        setExpandedCommits(new Set());
        setDiffCache({});
        setDiffLoading({});
        setDiffErrors({});
        setDiffFilters({});
        setDiffVisibleCount({});
        setCopiedCommit(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!repository) {
        setExpandedCommits(new Set());
        setDiffCache({});
        setDiffLoading({});
        setDiffErrors({});
        setDiffFilters({});
        setDiffVisibleCount({});
        setCopiedCommit(null);
    }
  }, [repository]);

  const handleLoadMore = async () => {
    if (!repository || isMoreLoading) return;
    setIsMoreLoading(true);
    try {
        const newCommits = await window.electronAPI.getCommitHistory(repository, commits.length, debouncedSearchQuery);
        setCommits(prev => [...prev, ...newCommits]);
        setHasMore(newCommits.length === 100);

        if (debouncedSearchQuery) {
            let newOccurrences = 0;
            const regex = new RegExp(debouncedSearchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
            newCommits.forEach(commit => {
              newOccurrences += (commit.message.match(regex) || []).length;
            });
            setMatchStats(prev => ({
              commitCount: prev.commitCount + newCommits.length,
              occurrenceCount: prev.occurrenceCount + newOccurrences
            }));
        }
    } catch (error) {
        console.error(`Failed to load more history for ${repository.name}:`, error);
    } finally {
        setIsMoreLoading(false);
    }
  };

  const loadCommitDiff = async (commit: Commit) => {
    if (!repository) {
        return;
    }

    setDiffLoading(prev => ({ ...prev, [commit.hash]: true }));
    setDiffErrors(prev => ({ ...prev, [commit.hash]: null }));
    try {
        const files = await window.electronAPI.getCommitDiff(repository, commit.hash);
        setDiffCache(prev => ({ ...prev, [commit.hash]: files }));
        setDiffFilters(prev => ({ ...prev, [commit.hash]: 'all' }));
        const initialVisible = files.length === 0 ? 0 : Math.min(DIFF_PAGE_SIZE, files.length);
        setDiffVisibleCount(prev => ({ ...prev, [commit.hash]: initialVisible }));
    } catch (error) {
        console.error(`Failed to load diff for commit ${commit.hash}`, error);
        setDiffErrors(prev => ({ ...prev, [commit.hash]: 'Failed to load diff for this commit.' }));
    } finally {
        setDiffLoading(prev => ({ ...prev, [commit.hash]: false }));
    }
  };

  const handleToggleCommit = (commit: Commit) => {
    const isExpanded = expandedCommits.has(commit.hash);
    setExpandedCommits(prev => {
        const next = new Set(prev);
        if (next.has(commit.hash)) {
            next.delete(commit.hash);
        } else {
            next.add(commit.hash);
        }
        return next;
    });

    if (!isExpanded && !diffCache[commit.hash] && !diffLoading[commit.hash]) {
        loadCommitDiff(commit);
    }
  };

  const handleCopyDiff = async (commitHash: string) => {
    const files = diffCache[commitHash];
    if (!files || files.length === 0) {
        return;
    }

    try {
        if (!navigator?.clipboard?.writeText) {
            console.warn('Clipboard API is not available in this environment.');
            return;
        }
        await navigator.clipboard.writeText(files.map(file => file.diff).join('\n\n'));
        setCopiedCommit(commitHash);
        setTimeout(() => setCopiedCommit(prev => (prev === commitHash ? null : prev)), 2000);
    } catch (error) {
        console.error('Failed to copy diff to clipboard', error);
    }
  };

  const handleFilterChange = (commitHash: string, filter: string) => {
    setDiffFilters(prev => ({ ...prev, [commitHash]: filter }));
    const files = diffCache[commitHash] || [];
    const filteredLength = filter === 'all'
        ? files.length
        : files.filter(file => getFileExtension(file.filePath) === filter).length;
    const nextCount = filteredLength === 0 ? 0 : Math.min(DIFF_PAGE_SIZE, filteredLength);
    setDiffVisibleCount(prev => ({ ...prev, [commitHash]: nextCount }));
  };

  const handleShowMoreFiles = (commitHash: string) => {
    setDiffVisibleCount(prev => ({
        ...prev,
        [commitHash]: (prev[commitHash] || DIFF_PAGE_SIZE) + DIFF_PAGE_SIZE,
    }));
  };


  if (!isOpen || !repository) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
      data-automation-id="commit-history-modal"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 transform transition-all flex flex-col h-[80vh]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center">
            <ClockIcon className="h-6 w-6 text-blue-500 mr-3" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100" id="modal-title">
                Commit History
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">for '{repository.name}'</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            data-automation-id="commit-history-close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search commit messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900/50 pl-10 pr-3 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
              data-automation-id="commit-history-search"
            />
          </div>
          {debouncedSearchQuery && !isLoading && (
            <div className="mt-2 px-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Found <span className="font-bold text-gray-700 dark:text-gray-200">{matchStats.occurrenceCount}</span> occurrence(s) in <span className="font-bold text-gray-700 dark:text-gray-200">{matchStats.commitCount}</span> commit(s).
              </p>
            </div>
          )}
        </div>

        <main className="p-4 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-gray-500">Loading history...</p>
          ) : commits.length === 0 ? (
            <p className="text-center text-gray-500">{debouncedSearchQuery ? `No commits found for "${debouncedSearchQuery}".` : 'No commits found.'}</p>
          ) : (
            <>
              <ul className="space-y-3">
                {commits.map(commit => {
                  const isExpanded = expandedCommits.has(commit.hash);
                  const diffFiles = diffCache[commit.hash] || [];
                  const filter = diffFilters[commit.hash] ?? 'all';
                  const filteredFiles = filter === 'all' ? diffFiles : diffFiles.filter(file => getFileExtension(file.filePath) === filter);
                  const visibleCount = diffVisibleCount[commit.hash] ?? (filteredFiles.length === 0 ? 0 : Math.min(DIFF_PAGE_SIZE, filteredFiles.length));
                  const visibleFiles = filteredFiles.slice(0, visibleCount);
                  const hasMoreFiles = visibleCount < filteredFiles.length;
                  const commitDiffError = diffErrors[commit.hash];
                  const isDiffLoading = diffLoading[commit.hash];
                  const fileTypes = Array.from(new Set(diffFiles.map(file => getFileExtension(file.filePath)))).sort((a, b) => a.localeCompare(b));
                  const copyLabel = copiedCommit === commit.hash ? 'Copied!' : 'Copy patch';
                  const showingCount = Math.min(visibleCount, filteredFiles.length);
                  const noFilesMessage = diffFiles.length === 0 && filter === 'all'
                    ? 'No files changed in this commit.'
                    : 'No files match the selected filter.';

                  return (
                    <li key={commit.hash} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => handleToggleCommit(commit)}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        <span className="mt-1 text-gray-500 dark:text-gray-400">
                          {isExpanded ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                        </span>
                        <div className="flex-1">
                          <div className="font-sans whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                            <HighlightedText text={commit.message} highlight={debouncedSearchQuery} />
                          </div>
                        </div>
                      </button>
                      <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                        <span>{commit.author}</span>
                        <span title={commit.hash} className="font-mono">{commit.shortHash} &bull; {commit.date}</span>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          {isDiffLoading ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Loading diff...</p>
                          ) : commitDiffError ? (
                            <p className="text-sm text-red-500 dark:text-red-400">{commitDiffError}</p>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-3 text-xs dark:border-gray-700 dark:bg-gray-900/60 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1 text-gray-600 dark:text-gray-300">
                                  <p>
                                    Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{showingCount}</span> of{' '}
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{filteredFiles.length}</span> file{filteredFiles.length === 1 ? '' : 's'}
                                    {filter !== 'all' && diffFiles.length > 0 ? (
                                      <span className="ml-1 text-gray-500 dark:text-gray-400">(filtering from {diffFiles.length})</span>
                                    ) : null}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {fileTypes.length > 0 && (
                                    <select
                                      value={filter}
                                      onChange={(event) => handleFilterChange(commit.hash, event.target.value)}
                                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                                    >
                                      <option value="all">All file types</option>
                                      {fileTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                      ))}
                                    </select>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleCopyDiff(commit.hash)}
                                    className="inline-flex items-center gap-1 rounded-md border border-blue-500 px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/40"
                                  >
                                    <ClipboardIcon className="h-4 w-4" />
                                    {copyLabel}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCommit(commit)}
                                    className="inline-flex items-center gap-1 rounded-md border border-gray-400 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                                  >
                                    Collapse
                                  </button>
                                </div>
                              </div>

                              {filteredFiles.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{noFilesMessage}</p>
                              ) : (
                                <div className="space-y-3">
                                  {visibleFiles.map(file => {
                                    const extension = getFileExtension(file.filePath);
                                    return (
                                      <div key={`${commit.hash}-${file.filePath}`} className="overflow-hidden rounded-md border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-200 px-3 py-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                          <span className="truncate" title={file.filePath}>{file.filePath}</span>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded bg-gray-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-700 dark:bg-gray-700 dark:text-gray-200">{extension}</span>
                                            {file.isBinary && (
                                              <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">Binary</span>
                                            )}
                                          </div>
                                        </div>
                                        <DiffContent diff={file.diff} />
                                      </div>
                                    );
                                  })}
                                  {hasMoreFiles && (
                                    <div className="text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleShowMoreFiles(commit.hash)}
                                        className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                                      >
                                        Load more files
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {hasMore && (
                <div className="mt-4 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isMoreLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
                  >
                    {isMoreLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default CommitHistoryModal;