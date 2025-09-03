import React, { useState, useRef, useEffect, useContext } from 'react';
import type { Repository, GitRepository, LocalPathState, DetailedStatus, BranchInfo, Task, LaunchConfig } from '../types';
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
import { ClockIcon } from './icons/ClockIcon';
import { useTooltip } from '../hooks/useTooltip';
import { TooltipContext } from '../contexts/TooltipContext';
import { ArrowTopRightOnSquareIcon } from './icons/ArrowTopRightOnSquareIcon';


interface RepositoryCardProps {
  repository: Repository;
  onOpenTaskSelection: (repoId: string) => void;
  onRunTask: (repoId: string, taskId: string) => void;
  onViewLogs: (repoId: string) => void;
  onViewHistory: (repoId: string) => void;
  onEditRepo: (repoId: string) => void;
  onDeleteRepo: (repoId: string) => void;
  isProcessing: boolean;
  localPathState: LocalPathState;
  detailedStatus: DetailedStatus | null;
  branchInfo: BranchInfo | null;
  onSwitchBranch: (repoId: string, branch: string) => void;
  detectedExecutables: string[];
  onCloneRepo: (repoId: string) => void;
  onChooseLocationAndClone: (repoId: string) => void;
  onRunLaunchConfig: (repoId: string, configId: string) => void;
  onOpenLaunchSelection: (repoId: string) => void;
  onOpenLocalPath: (path: string) => void;
  onOpenTerminal: (path: string) => void;
}

const BranchSwitcher: React.FC<{
  repoId: string,
  branchInfo: BranchInfo | null,
  onSwitchBranch: (repoId: string, branch: string) => void
}> = ({ repoId, branchInfo, onSwitchBranch }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    if (!branchInfo) return null;

    const { local, remote, current } = branchInfo;
    
    // Don't offer to check out remote branches if a local branch of the same name already exists.
    const remoteBranchesToOffer = remote.filter(rBranch => {
        const localEquivalent = rBranch.split('/').slice(1).join('/');
        return !local.includes(localEquivalent);
    });

    const otherLocalBranches = local.filter(b => b !== current);
    const hasOptions = otherLocalBranches.length > 0 || remoteBranchesToOffer.length > 0;

    return (
        <div className="relative inline-block text-left" ref={wrapperRef}>
            <button
                type="button"
                className="inline-flex items-center justify-center w-full rounded-md disabled:cursor-not-allowed"
                onClick={() => hasOptions && setIsOpen(!isOpen)}
                disabled={!hasOptions}
            >
                <span className="truncate max-w-[150px] sm:max-w-[200px]">{current}</span>
                <ChevronDownIcon className={`ml-1 -mr-1 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && hasOptions && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="py-1 max-h-60 overflow-y-auto" role="menu" aria-orientation="vertical">
                        {otherLocalBranches.length > 0 && <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Local</div>}
                        {otherLocalBranches.map(branch => (
                            <button
                                key={`local-${branch}`}
                                onClick={() => { onSwitchBranch(repoId, branch); setIsOpen(false); }}
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
                                    onClick={() => { onSwitchBranch(repoId, branch); setIsOpen(false); }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    role="menuitem"
                                >
                                    {branch}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-components to fix Rules of Hooks violations ---

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
      // @ts-ignore
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
      // @ts-ignore
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
      // @ts-ignore
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
      // @ts-ignore
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


const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repository,
  onOpenTaskSelection,
  onRunTask,
  onViewLogs,
  onViewHistory,
  onEditRepo,
  onDeleteRepo,
  isProcessing,
  localPathState,
  detailedStatus,
  branchInfo,
  onSwitchBranch,
  detectedExecutables,
  onCloneRepo,
  onChooseLocationAndClone,
  onRunLaunchConfig,
  onOpenLaunchSelection,
  onOpenLocalPath,
  onOpenTerminal,
}) => {
  const { id, name, remoteUrl, status, lastUpdated, buildHealth, vcs, tasks, launchConfigs, localPath, webLinks } = repository;
  
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


  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col transition-all duration-300 hover:shadow-blue-500/20 overflow-hidden">
      <div className="p-4 flex-grow">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{name}</h3>
          <div
            className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${STATUS_COLORS[status]}`}
          >
            {status}
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
          <div className="flex items-center">
            <GlobeAltIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
            <a href={remoteUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:text-blue-500 dark:hover:text-blue-400 transition-colors">{remoteUrl}</a>
          </div>
          {isPathSet && (
            <div className="flex items-center">
                <FolderIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <button
// @ts-ignore
                    {...localPathTooltip}
                    onClick={() => {
                      hideTooltip();
                      onOpenLocalPath(localPath);
                    }} 
                    className="truncate text-left hover:text-blue-500 dark:hover:text-blue-400 transition-colors focus:outline-none"
                >
                    {localPath}
                </button>
            </div>
          )}
          <div className="flex items-center">
            {vcs === VcsType.Git ? (
              <>
                <GitBranchIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                <BranchSwitcher repoId={id} branchInfo={branchInfo} onSwitchBranch={onSwitchBranch} />
              </>
            ) : (
              <>
                <SvnIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                <span>SVN Repository</span>
              </>
            )}
          </div>
          {isPathValid && detailedStatus && <StatusIndicator status={detailedStatus} />}
        </div>
        
        {webLinks && webLinks.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {webLinks.map(link => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={link.url}
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="h-3 w-3 mr-1.5" />
                <span className="truncate">{link.name}</span>
              </a>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-400 dark:text-gray-500">Build Health:</span>
          <span className={`font-semibold ${BUILD_HEALTH_COLORS[buildHealth]}`}>
            {buildHealth}
          </span>
        </div>
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-2">
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
          </p>
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
// @ts-ignore
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
// @ts-ignore
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
// @ts-ignore
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
// @ts-ignore
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
// @ts-ignore
                  {...logsTooltip}
                  onClick={() => {
                    hideTooltip();
                    onViewLogs(id);
                  }} 
                  className="p-1.5 text-gray-400 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                </button>
                <button
// @ts-ignore
                  {...configureTooltip}
                  onClick={() => {
                    hideTooltip();
                    onEditRepo(id);
                  }} 
                  className="p-1.5 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
// @ts-ignore
                  {...deleteTooltip}
                  onClick={() => {
                    hideTooltip();
                    onDeleteRepo(id);
                  }} 
                  className="p-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryCard;