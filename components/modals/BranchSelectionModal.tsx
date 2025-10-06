import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VcsType, type BranchInfo } from '../../types';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { XIcon } from '../icons/XIcon';
import { getDisplayBranchName, getRemoteBranchesToOffer, normalizeBranchForComparison } from '../../utils/branchHelpers';

interface BranchSelectionModalProps {
  isOpen: boolean;
  repositoryName: string;
  branchInfo: BranchInfo | null;
  vcs: VcsType;
  onSelectBranch: (branchName: string) => void;
  onClose: () => void;
}

type BranchEntry = {
  key: string;
  name: string;
  type: 'local' | 'remote';
  isCurrent: boolean;
  displayName: string;
  normalized: string;
};

const BranchSelectionModal: React.FC<BranchSelectionModalProps> = ({
  isOpen,
  repositoryName,
  branchInfo,
  vcs,
  onSelectBranch,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const trimmedSearchTerm = searchTerm.trim();
  const normalizedSearchTerm = trimmedSearchTerm.toLowerCase();

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setActiveIndex(0);
      setIsKeyboardNavigating(false);
      const timeout = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [isOpen]);

  const branchEntries = useMemo<BranchEntry[]>(() => {
    if (!branchInfo) {
      return [];
    }

    const { local, current } = branchInfo;
    const normalizedCurrent = current ? normalizeBranchForComparison(current, vcs).toLowerCase() : null;
    const remoteBranchesToOffer = getRemoteBranchesToOffer(branchInfo, vcs);

    const makeEntry = (name: string, type: 'local' | 'remote'): BranchEntry => {
      const displayName = getDisplayBranchName(name, vcs);
      const normalized = normalizeBranchForComparison(name, vcs).toLowerCase();
      return {
        key: `${type}-${name}`,
        name,
        type,
        displayName,
        normalized,
        isCurrent: normalizedCurrent ? normalized === normalizedCurrent : false,
      };
    };

    const localEntries = local.map(name => makeEntry(name, 'local'));
    const remoteEntries = remoteBranchesToOffer.map(name => makeEntry(name, 'remote'));

    return [...localEntries, ...remoteEntries];
  }, [branchInfo, vcs]);

  const filteredEntries = useMemo(() => {
    if (!normalizedSearchTerm) {
      return branchEntries;
    }
    return branchEntries.filter(entry => {
      if (entry.displayName.toLowerCase().includes(normalizedSearchTerm)) {
        return true;
      }
      return entry.name.toLowerCase().includes(normalizedSearchTerm);
    });
  }, [branchEntries, normalizedSearchTerm]);

  const highlightBranchName = useCallback(
    (name: string) => {
      if (!trimmedSearchTerm) {
        return name;
      }

      const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
      const pattern = new RegExp(`(${escapeRegExp(trimmedSearchTerm)})`, 'ig');
      const segments = name.split(pattern);

      return segments.map((segment, index) => {
        if (segment.toLowerCase() === normalizedSearchTerm) {
          return (
            <mark
              key={`match-${index}`}
              className="rounded bg-yellow-200 px-0.5 text-gray-900 dark:bg-yellow-300/60 dark:text-gray-900"
            >
              {segment}
            </mark>
          );
        }

        return (
          <React.Fragment key={`text-${index}`}>{segment}</React.Fragment>
        );
      });
    },
    [normalizedSearchTerm, trimmedSearchTerm],
  );

  useEffect(() => {
    setActiveIndex(prev => {
      if (filteredEntries.length === 0) {
        return 0;
      }
      return Math.min(prev, filteredEntries.length - 1);
    });
  }, [filteredEntries.length]);

  useEffect(() => {
    if (!isOpen || !isKeyboardNavigating) {
      return;
    }
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-branch-item="true"]');
    if (!buttons || buttons.length === 0) {
      inputRef.current?.focus();
      setIsKeyboardNavigating(false);
      return;
    }
    const targetIndex = Math.min(activeIndex, buttons.length - 1);
    const targetButton = buttons[targetIndex];
    if (targetButton) {
      targetButton.focus();
    }
  }, [activeIndex, filteredEntries, isKeyboardNavigating, isOpen]);

  const handleClose = () => {
    setIsKeyboardNavigating(false);
    onClose();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filteredEntries.length === 0) {
        return;
      }
      setIsKeyboardNavigating(true);
      setActiveIndex(0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredEntries.length === 0) {
        return;
      }
      setIsKeyboardNavigating(true);
      setActiveIndex(filteredEntries.length - 1);
    } else if (event.key === 'Enter' && filteredEntries.length > 0) {
      event.preventDefault();
      const entry = filteredEntries[Math.min(activeIndex, filteredEntries.length - 1)];
      if (entry) {
        onSelectBranch(entry.name);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
    }
  };

  const handleItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsKeyboardNavigating(true);
      setActiveIndex(() => {
        if (filteredEntries.length === 0) {
          return 0;
        }
        return Math.min(index + 1, filteredEntries.length - 1);
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsKeyboardNavigating(true);
      setActiveIndex(prev => Math.max(prev - 1, 0));
      if (index === 0) {
        window.setTimeout(() => {
          inputRef.current?.focus();
          setIsKeyboardNavigating(false);
        }, 0);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
    }
  };

  const handleSelect = (branchName: string) => {
    onSelectBranch(branchName);
  };

  if (!isOpen || !branchInfo) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branch-selection-title"
      onMouseDown={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 transform transition-all"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 id="branch-selection-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Switch Branch for '{repositoryName}'
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Search across local and remote branches to quickly switch contexts.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close branch selection dialog"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4" onKeyDown={event => event.stopPropagation()}>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="search"
              value={searchTerm}
              onChange={event => {
                setSearchTerm(event.target.value);
                setIsKeyboardNavigating(false);
              }}
              onKeyDown={handleInputKeyDown}
              className="w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Filter branches..."
              aria-label="Filter branches"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Showing {filteredEntries.length} of {branchEntries.length} branches
            </span>
            {branchInfo.current && (
            <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
                Current branch: <strong className="text-gray-700 dark:text-gray-200">{getDisplayBranchName(branchInfo.current, vcs)}</strong>
              </span>
            )}
          </div>

          <div
            ref={listRef}
            className="max-h-[55vh] overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700"
            role="listbox"
            aria-label="Branch results"
          >
            {filteredEntries.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No branches match your search.
              </div>
            ) : (
              filteredEntries.map((entry, index) => {
                const isActive = isKeyboardNavigating && index === activeIndex;
                const isCurrent = entry.isCurrent;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    data-branch-item="true"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(entry.name)}
                    onKeyDown={event => handleItemKeyDown(event, index)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-100'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${isCurrent ? 'border-l-4 border-blue-500' : ''}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium truncate">{highlightBranchName(entry.displayName)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.type === 'local' ? 'Local branch' : 'Remote branch'}
                      </span>
                    </div>
                    {isCurrent && (
                      <span className="ml-4 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        Current
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchSelectionModal;
