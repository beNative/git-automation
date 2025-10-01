import React, { useState, useRef, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import type { Repository, GitRepository, LocalPathState, DetailedStatus, BranchInfo, Task, LaunchConfig, WebLinkConfig, ToastMessage, ReleaseInfo } from '../types';
import { VcsType } from '../types';
import { STATUS_COLORS, BUILD_HEALTH_COLORS } from '../constants';
import { PlayIcon } from './icons/PlayIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { GitBranchIcon } from './icons/GitBranchIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { SvnIcon } from './icons/SvnIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { LightningBoltIcon } from './icons/LightningBoltIcon';
import { FolderPlusIcon } from './icons/FolderPlusIcon';
import { FolderIcon } from './icons/FolderIcon';
import { TerminalIcon } from './icons/TerminalIcon';
import { StatusIndicator } from './StatusIndicator';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { ClockIcon } from './icons/ClockIcon';
import { useTooltip } from '../hooks/useTooltip';
import { TooltipContext } from '../contexts/TooltipContext';
import { ArrowTopRightOnSquareIcon } from './icons/ArrowTopRightOnSquareIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import BranchSelectionModal from './modals/BranchSelectionModal';


interface RepositoryCardProps {
  repository: Repository;
  categoryId: string | 'uncategorized';
  onOpenTaskSelection: (repoId: string) => void;
  onRunTask: (repoId: string, taskId: string) => void;
  onViewLogs: (repoId: string) => void;
  onViewHistory: (repoId: string) => void;
  onEditRepo: (repoId: string) => void;
  onDeleteRepo: (repoId: string) => void;
  onMoveRepository: (repoId: string, direction: 'up' | 'down') => void;
  isFirstInList: boolean;
  isLastInList: boolean;
  isProcessing: boolean;
  localPathState: LocalPathState;
  detailedStatus: DetailedStatus | null;
  branchInfo: BranchInfo | null;
  latestRelease: ReleaseInfo | null;
  onSwitchBranch: (repoId: string, branch: string) => void;
  detectedExecutables: string[];
  onCloneRepo: (repoId: string) => void;
  onChooseLocationAndClone: (repoId: string) => void;
  onRunLaunchConfig: (repoId: string, configId: string) => void;
  onOpenLaunchSelection: (repoId: string) => void;
  onOpenLocalPath: (path: string) => void;
  onOpenWeblink: (url: string) => void;
  onOpenTerminal: (path: string) => void;
  isBeingDragged: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  setToast: (toast: ToastMessage | null) => void;
  onContextMenu: (event: React.MouseEvent, repo: Repository) => void;
  onRefreshRepoState: (repoId: string) => void;
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
}

const BranchSwitcher: React.FC<{
  repoId: string;
  repoName: string;
  branchInfo: BranchInfo | null;
  onSwitchBranch: (repoId: string, branch: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}> = ({ repoId, repoName, branchInfo, onSwitchBranch, isOpen, onToggle, onClose }) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const dropdownHeight = 240; // Estimated height for max-h-60

            let top: number;
            
            // Position vertically: open upwards if not enough space below
            if ((rect.bottom + dropdownHeight + 4) > window.innerHeight && rect.top > dropdownHeight) {
                top = rect.top - dropdownHeight - 4;
            } else {
                top = rect.bottom + 4;
            }

            // Position horizontally, aligning to the right of the button
            let left = rect.right - 224; // 224 is w-56 from tailwind
            
            // Clamp to viewport to prevent going off-screen
            if (left < 5) left = 5;
            if (left + 224 > window.innerWidth - 5) left = window.innerWidth - 224 - 5;

            setDropdownStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
            });
        }
    }, [isOpen]);

    // Effect to handle clicks outside the dropdown to close it
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    if (!branchInfo) return null;

    const { local, remote, current } = branchInfo;
    
    const remoteBranchesToOffer = remote.filter(rBranch => {
        const localEquivalent = rBranch.split('/').slice(1).join('/');
        return !local.includes(localEquivalent);
    });

    const otherLocalBranches = local.filter(b => b !== current);
    const hasOptions = otherLocalBranches.length > 0 || remoteBranchesToOffer.length > 0;
    
    const handleBranchClick = (branch: string) => {
      onSwitchBranch(repoId, branch);
      onClose();
    };

    const openModal = () => {
      setIsModalOpen(true);
      onClose();
    };

    const closeModal = () => {
      setIsModalOpen(false);
    };

    const handleModalSelect = (branch: string) => {
      onSwitchBranch(repoId, branch);
      setIsModalOpen(false);
    };

    const DropdownContent = (
        <div 
            ref={dropdownRef}
            style={dropdownStyle}
            className="w-56 z-50 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
            <div className="py-1 max-h-60 overflow-y-auto" role="menu" aria-orientation="vertical">
                {otherLocalBranches.length > 0 && <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Local</div>}
                {otherLocalBranches.map(branch => (
                    <button
                        key={`local-${branch}`}
                        onClick={() => handleBranchClick(branch)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        role="menuitem"
                    >
                        {branch}
                    </button>
                ))}
                {remoteBranchesToOffer.length > 0 && <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-t border-gray-200 dark:border-gray-700">Remote</div>}
                {remoteBranchesToOffer.map(branch => {
                     return (
                        <button
                            key={`remote-${branch}`}
                            onClick={() => handleBranchClick(branch)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            role="menuitem"
                        >
                            {branch}
                        </button>
                    )
                })}
            </div>
        </div>
    );

    return (
        <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
                <button
                    ref={buttonRef}
                    type="button"
                    className="inline-flex items-center justify-center w-full rounded-md disabled:cursor-not-allowed"
                    onClick={onToggle}
                    disabled={!hasOptions}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                >
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">{current}</span>
                    <ChevronDownIcon className={`ml-1 -mr-1 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>
            <button
                type="button"
                onClick={openModal}
                className="flex-shrink-0 p-1.5 rounded-md text-gray-500 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Open branch search dialog"
            >
                <MagnifyingGlassIcon className="h-4 w-4" />
            </button>

            {isOpen && hasOptions && createPortal(DropdownContent, document.body)}
            <BranchSelectionModal
                isOpen={isModalOpen}
                repositoryName={repoName}
                branchInfo={branchInfo}
                onSelectBranch={handleModalSelect}
                onClose={closeModal}
            />
        </div>
    );
};

const ReleaseInfoDisplay: React.FC<{
  vcs: VcsType;
  latestRelease: ReleaseInfo | null | undefined;
  onOpenWeblink: (url: string) => void;
}> = ({ vcs, latestRelease, onOpenWeblink }) => {
  const releaseUrlTooltip = useTooltip(latestRelease?.url);

  if (vcs !== VcsType.Git) {
    return null;
  }

  let content;
  if (latestRelease) {
    const { tagName, isDraft, isPrerelease } = latestRelease;
    let badge;
    if (isDraft) {
      badge = <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">Draft</span>;
    } else if (isPrerelease) {
      badge = <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200">Pre-release</span>;
    } else {
      badge = <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-200">Published</span>;
    }
    content = (
      <div className="flex items-center gap-2">
        <a
          {...releaseUrlTooltip}
          href={latestRelease.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { e.preventDefault(); onOpenWeblink(latestRelease.url); }}
          className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {tagName}
        </a>
        {badge}
      </div>
    );
  } else if (latestRelease === null) {
    content = <span className="font-semibold text-gray-400">No releases found.</span>;
  } else {
    content = <span className="font-semibold text-gray-400 italic">Checking...</span>;
  }

  return (
    <div className="mt-1 flex items-center justify-between text-sm">
      <span className="text-gray-400 dark:text-gray-500">Latest Release:</span>
      {content}
    </div>
  );
};


// --- Sub-components to fix Rules of Hooks violations ---

const CopyButton: React.FC<{ textToCopy: string; tooltipText: string; setToast: (toast: ToastMessage | null) => void; }> = ({ textToCopy, tooltipText, setToast }) => {
  const tooltip = useTooltip(tooltipText);
  const { hideTooltip } = useContext(TooltipContext);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    hideTooltip();
    navigator.clipboard.writeText(textToCopy).then(() => {
      setToast({ message: 'Copied to clipboard!', type: 'success' });
    }, (err) => {
      setToast({ message: `Failed to copy: ${err}`, type: 'error' });
    });
  };

  return (
    <button
      {...tooltip}
      onClick={handleCopy}
      className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0"
    >
      <ClipboardIcon className="h-4 w-4" />
    </button>
  );
};

const CloneToPathButton: React.FC<{
  cloneVerb: string;
  remoteUrl: string;
  localPath: string;
  isProcessing: boolean;
  onClone: () => void;
}> = ({ cloneVerb, remoteUrl, localPath, isProcessing, onClone }) => {
  const tooltip = useTooltip(`${cloneVerb} from ${remoteUrl} to ${localPath}`);
  const { hideTooltip } = useContext(TooltipContext);
  return (
    <button
      {...tooltip}
      onClick={() => {
        hideTooltip();
        onClone();
      }}
      disabled={isProcessing}
      className="flex items-center justify-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
    >
      <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
      {cloneVerb} Repo
    </button>
  );
};

const ChooseLocationButton: React.FC<{
  cloneVerb: string;
  isProcessing: boolean;
  onChooseLocation: () => void;
}> = ({ cloneVerb, isProcessing, onChooseLocation }) => {
  const tooltip = useTooltip(`Choose location and ${cloneVerb.toLowerCase()}`);
  const { hideTooltip } = useContext(TooltipContext);
  return (
    <button
      {...tooltip}
      onClick={() => {
        hideTooltip();
        onChooseLocation();
      }}
      disabled={isProcessing}
      className="flex items-center justify-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
    >
      <FolderPlusIcon className="h-4 w-4 mr-1.5" />
      Setup & {cloneVerb}
    </button>
  );
};

const TaskButton: React.FC<{
  task: Task;
  isPathValid: boolean;
  isProcessing: boolean;
  onRunTask: () => void;
}> = ({ task, isPathValid, isProcessing, onRunTask }) => {
  const tooltip = useTooltip(!isPathValid ? 'Local path is not valid' : `Run Task: ${task.name}`);
  const { hideTooltip } = useContext(TooltipContext);
  return (
    <button
      {...tooltip}
      onClick={() => {
        hideTooltip();
        onRunTask();
      }}
      disabled={isProcessing || !isPathValid}
      className="flex items-center justify-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
    >
      <PlayIcon className="h-4 w-4 mr-1" />
      <span className="truncate">{task.name}</span>
    </button>
  );
};

const LaunchConfigButton: React.FC<{
  config: LaunchConfig;
  isPathValid: boolean;
  isProcessing: boolean;
  onRunLaunchConfig: () => void;
}> = ({ config, isPathValid, isProcessing, onRunLaunchConfig }) => {
  const tooltip = useTooltip(!isPathValid ? 'Local path is not valid' : `Launch: ${config.name}`);
  const { hideTooltip } = useContext(TooltipContext);
  return (
    <button
      {...tooltip}
      onClick={() => {
        hideTooltip();
        onRunLaunchConfig();
      }}
      disabled={isProcessing || !isPathValid}
      className="flex items-center justify-center px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
    >
      <LightningBoltIcon className="h-4 w-4 mr-1" />
      <span className="truncate">{config.name}</span>
    </button>
  );
};

const WebLinkButton: React.FC<{ link: WebLinkConfig; onOpen: (url: string) => void }> = ({ link, onOpen }) => {
  const tooltip = useTooltip(link.url);
  const { hideTooltip } = useContext(TooltipContext);
  return (
    <button
      {...tooltip}
      onClick={() => {
        hideTooltip();
        onOpen(link.url);
      }}
      className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
    >
      <ArrowTopRightOnSquareIcon className="h-3 w-3 mr-1.5" />
      <span className="truncate">{link.name}</span>
    </button>
  );
};


const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repository,
  categoryId,
  onOpenTaskSelection,
  onRunTask,
  onViewLogs,
  onViewHistory,
  onEditRepo,
  onDeleteRepo,
  onMoveRepository,
  isFirstInList,
  isLastInList,
  isProcessing,
  localPathState,
  detailedStatus,
  branchInfo,
  latestRelease,
  onSwitchBranch,
  detectedExecutables,
  onCloneRepo,
  onChooseLocationAndClone,
  onRunLaunchConfig,
  onOpenLaunchSelection,
  onOpenLocalPath,
  onOpenWeblink,
  onOpenTerminal,
  isBeingDragged,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  setToast,
  onContextMenu,
  onRefreshRepoState,
  activeDropdown,
  setActiveDropdown,
}) => {
  const { id, name, remoteUrl, status, lastUpdated, buildHealth, vcs, tasks, launchConfigs, localPath, webLinks } = repository;
  
  const isDropdownOpen = activeDropdown === id;
  const toggleDropdown = () => setActiveDropdown(isDropdownOpen ? null : id);
  const closeDropdown = () => setActiveDropdown(null);

  const isPathValid = localPathState === 'valid';
  const isPathMissing = localPathState === 'missing';
  const isPathSet = localPath && localPath.trim() !== '';
  const cloneVerb = vcs === VcsType.Svn ? 'Checkout' : 'Clone';

  const tasksToShowOnCard = (tasks || []).filter(t => t.showOnDashboard).slice(0, 4);
  const hasMoreTasks = (tasks || []).length > tasksToShowOnCard.length;

  const launchConfigsToShowOnCard = (launchConfigs || []).filter(lc => lc.showOnDashboard).slice(0, 4);
  const unpinnedLaunchConfigs = (launchConfigs || []).filter(lc => !lc.showOnDashboard);
  const hasMoreLaunchOptions = unpinnedLaunchConfigs.length > 0 || (detectedExecutables && detectedExecutables.length > 0);
  
  const { hideTooltip } = useContext(TooltipContext);

  // Tooltips
  const localPathTooltip = useTooltip(`Open: ${localPath}`);
  const moreTasksTooltip = useTooltip('Select a task to run...');
  const moreLaunchTooltip = useTooltip('More launch options...');
  const terminalTooltip = useTooltip(!isPathValid ? "Local path must be valid to open terminal" : "Open in Terminal");
  const historyTooltip = useTooltip(!isPathValid ? "Local path must be valid to view history" : "View Commit History");
  const logsTooltip = useTooltip('View Logs');
  const configureTooltip = useTooltip('Configure Repository');
  const deleteTooltip = useTooltip('Delete Repository');
  const refreshTooltip = useTooltip('Refresh Status');
  const moveUpTooltip = useTooltip('Move Up');
  const moveDownTooltip = useTooltip('Move Down');

  const cardClasses = [
    'relative group',
    'bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col',
    'transition-all duration-300 hover:shadow-blue-500/20',
    isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100',
  ].join(' ');
  

  return (
    <div
      draggable="true"
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onContextMenu={(e) => onContextMenu(e, repository)}
      className={cardClasses}
      data-repo-id={id}
      data-category-id={categoryId}
    >
      <div className="p-4 flex-grow">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{name}</h3>
          <div className="flex items-center gap-1.5">
            <div
              className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${STATUS_COLORS[status]}`}
            >
              {status}
            </div>
            <div className="flex items-center group-hover:opacity-100 opacity-0 transition-opacity">
                <button {...moveUpTooltip} onClick={() => onMoveRepository(id, 'up')} disabled={isFirstInList} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/50 rounded-full transition-colors disabled:opacity-30"><ArrowUpIcon className="h-4 w-4"/></button>
                <button {...moveDownTooltip} onClick={() => onMoveRepository(id, 'down')} disabled={isLastInList} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/50 rounded-full transition-colors disabled:opacity-30"><ArrowDownIcon className="h-4 w-4"/></button>
            </div>
            <button
                {...refreshTooltip}
                onClick={() => {
                  hideTooltip();
                  onRefreshRepoState(id);
                }}
                disabled={isProcessing}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
            </button>
            <button
                {...configureTooltip}
                onClick={() => {
                  hideTooltip();
                  onEditRepo(id);
                }} 
                className="p-1.5 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                {...deleteTooltip}
                onClick={() => {
                  hideTooltip();
                  onDeleteRepo(id);
                }} 
                className="p-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
          </div>
        </div>
        
        {localPathState === 'not_a_repo' && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/40 rounded-md text-xs text-yellow-700 dark:text-yellow-300 flex items-center">
                <ExclamationCircleIcon className="h-4 w-4 mr-2 flex-shrink-0"/>
                <span className="truncate">Local path exists but is not a valid repository.</span>
            </div>
        )}
        {localPathState === 'checking' && (
             <div className="mt-2 text-xs text-gray-400 italic">Checking local path...</div>
        )}

        <div className="mt-2 space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <button onClick={() => onOpenWeblink(remoteUrl)} className="truncate hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex-grow text-left">{remoteUrl}</button>
            <CopyButton textToCopy={remoteUrl} tooltipText="Copy URL" setToast={setToast} />
          </div>
          {isPathSet && (
            <div className="flex items-center gap-2">
                <FolderIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <button
                    {...localPathTooltip}
                    onClick={() => {
                      hideTooltip();
                      onOpenLocalPath(localPath);
                    }} 
                    className="truncate text-left hover:text-blue-500 dark:hover:text-blue-400 transition-colors focus:outline-none flex-grow"
                >
                    {localPath}
                </button>
                <CopyButton textToCopy={localPath} tooltipText="Copy Path" setToast={setToast} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              {vcs === VcsType.Git ? (
                <>
                  <GitBranchIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <BranchSwitcher
                    isOpen={isDropdownOpen}
                    onToggle={toggleDropdown}
                    onClose={closeDropdown}
                    repoId={id}
                    repoName={name}
                    branchInfo={branchInfo}
                    onSwitchBranch={onSwitchBranch}
                  />
                </>
              ) : (
                <>
                  <SvnIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="truncate">SVN Repository</span>
                </>
              )}
            </div>
            <div className="flex-shrink-0 ml-4">
              {isPathValid && detailedStatus && <StatusIndicator status={detailedStatus} />}
            </div>
          </div>
        </div>
        
        {webLinks && webLinks.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {webLinks.map(link => (
              <WebLinkButton key={link.id} link={link} onOpen={onOpenWeblink} />
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-400 dark:text-gray-500">Build Health:</span>
          <span className={`font-semibold ${BUILD_HEALTH_COLORS[buildHealth]}`}>
            {buildHealth}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-gray-400 dark:text-gray-500">Last updated:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
                {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
            </span>
        </div>
        <ReleaseInfoDisplay vcs={vcs} latestRelease={latestRelease} onOpenWeblink={onOpenWeblink} />
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-between items-center gap-1">
            <div className="flex-1 flex flex-wrap gap-2 items-center">
               {isPathMissing ? (
                    isPathSet ? (
                        <CloneToPathButton
                            cloneVerb={cloneVerb}
                            remoteUrl={remoteUrl}
                            localPath={localPath}
                            isProcessing={isProcessing}
                            onClone={() => onCloneRepo(id)}
                        />
                    ) : (
                        <ChooseLocationButton
                            cloneVerb={cloneVerb}
                            isProcessing={isProcessing}
                            onChooseLocation={() => onChooseLocationAndClone(id)}
                        />
                    )
               ) : (
                <>
                  {tasksToShowOnCard.map(task => (
                      <TaskButton
                          key={task.id}
                          task={task}
                          isPathValid={isPathValid}
                          isProcessing={isProcessing}
                          onRunTask={() => onRunTask(id, task.id)}
                      />
                  ))}
                  {launchConfigsToShowOnCard.map(config => (
                      <LaunchConfigButton
                          key={config.id}
                          config={config}
                          isPathValid={isPathValid}
                          isProcessing={isProcessing}
                          onRunLaunchConfig={() => onRunLaunchConfig(id, config.id)}
                      />
                  ))}
                </>
               )}
            </div>

            <div className="flex items-center space-x-0.5">
                {isPathValid && hasMoreTasks && (
                  <button
                    {...moreTasksTooltip}
                    onClick={() => {
                      hideTooltip();
                      onOpenTaskSelection(id);
                    }}
                    className="p-1.5 text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    <PlayIcon className="h-5 w-5" />
                  </button>
                )}
                {isPathValid && hasMoreLaunchOptions && (
                    <button
                      {...moreLaunchTooltip}
                      onClick={() => {
                        hideTooltip();
                        onOpenLaunchSelection(id);
                      }}
                      className="p-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors disabled:opacity-50"
                      disabled={isProcessing}
                    >
                      <LightningBoltIcon className="h-5 w-5" />
                    </button>
                )}
                <button
                  {...terminalTooltip}
                  onClick={() => {
                    hideTooltip();
                    onOpenTerminal(localPath);
                  }}
                  disabled={!isPathValid}
                  className="p-1.5 text-gray-400 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TerminalIcon className="h-5 w-5" />
                </button>
                <button
                  {...historyTooltip}
                  onClick={() => {
                    hideTooltip();
                    onViewHistory(id);
                  }}
                  disabled={!isPathValid}
                  className="p-1.5 text-gray-400 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                >
                  <ClockIcon className="h-5 w-5" />
                </button>
                <button
                  {...logsTooltip}
                  onClick={() => {
                    hideTooltip();
                    onViewLogs(id);
                  }} 
                  className="p-1.5 text-gray-400 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryCard;