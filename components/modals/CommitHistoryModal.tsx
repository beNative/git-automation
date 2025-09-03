import React, { useState, useEffect, useCallback } from 'react';
import type { Repository, Commit } from '../../types';
import { ClockIcon } from '../icons/ClockIcon';
import { XIcon } from '../icons/XIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';

interface CommitHistoryModalProps {
  isOpen: boolean;
  repository: Repository | null;
  onClose: () => void;
}

const CommitHistoryModal: React.FC<CommitHistoryModalProps> = ({ isOpen, repository, onClose }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

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
    if (isOpen && repository) {
      const fetchInitialHistory = async () => {
        setIsLoading(true);
        setCommits([]); // Reset on open or new search
        setHasMore(true); // Reset on open or new search
        try {
          const initialCommits = await window.electronAPI.getCommitHistory(repository.localPath, 0, debouncedSearchQuery);
          setCommits(initialCommits);
          setHasMore(initialCommits.length === 100);
        } catch (error) {
          console.error(`Failed to load history for ${repository.name}:`, error);
          setCommits([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchInitialHistory();
    }
  }, [isOpen, repository, debouncedSearchQuery]);
  
  // Reset search query when modal is closed
  useEffect(() => {
    if (!isOpen) {
        setSearchQuery('');
    }
  }, [isOpen]);

  const handleLoadMore = async () => {
    if (!repository || isMoreLoading) return;
    setIsMoreLoading(true);
    try {
        const newCommits = await window.electronAPI.getCommitHistory(repository.localPath, commits.length, debouncedSearchQuery);
        setCommits(prev => [...prev, ...newCommits]);
        setHasMore(newCommits.length === 100);
    } catch (error) {
        console.error(`Failed to load more history for ${repository.name}:`, error);
    } finally {
        setIsMoreLoading(false);
    }
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
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 transform transition-all flex flex-col max-h-[80vh]"
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
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
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
            />
          </div>
        </div>

        <main className="p-4 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-gray-500">Loading history...</p>
          ) : commits.length === 0 ? (
            <p className="text-center text-gray-500">{debouncedSearchQuery ? `No commits found for "${debouncedSearchQuery}".` : 'No commits found.'}</p>
          ) : (
            <>
              <ul className="space-y-3">
                {commits.map(commit => (
                  <li key={commit.hash} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <pre className="font-sans whitespace-pre-wrap text-gray-900 dark:text-gray-100">{commit.message}</pre>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span>{commit.author}</span>
                      <span title={commit.hash} className="font-mono">{commit.shortHash} &bull; {commit.date}</span>
                    </div>
                  </li>
                ))}
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