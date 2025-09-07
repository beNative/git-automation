
import React, { useMemo, useState } from 'react';
import type { Repository, LocalPathState, DetailedStatus, BranchInfo, ToastMessage, VcsType as VcsTypeEnum } from '../types';
import { STATUS_COLORS } from '../constants';
import { useTooltip } from '../hooks/useTooltip';
import { StatusIndicator } from './StatusIndicator';
import { GitBranchIcon } from './icons/GitBranchIcon';
import { SvnIcon } from './icons/SvnIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FolderIcon } from './icons/FolderIcon';
import { TerminalIcon } from './icons/TerminalIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { RocketLaunchIcon } from './icons/RocketLaunchIcon';
import { ArrowTopRightOnSquareIcon } from './icons/ArrowTopRightOnSquareIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CubeTransparentIcon } from './icons/CubeTransparentIcon';

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
  onOpenWeblink: (url: string) => void;
  onOpenTerminal: (path: string) => void;
  setToast: (toast: ToastMessage | null) => void;
  onContextMenu: (event: React.MouseEvent, repo: Repository) => void;
  onRefreshRepoState: (repoId: string) => void;
  isBeingDragged: boolean;
  dropIndicatorPosition: 'before' | 'after' | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const RepositoryCard: React.FC<RepositoryCardProps> = (props) => {
  const { repository, localPathState, detailedStatus, branchInfo, isProcessing } = props;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await props.onRefreshRepoState(repository.id);
    setIsRefreshing(false);
  };

  const VcsIcon = repository.vcs === 'git' ? GitBranchIcon : SvnIcon;

  const dashboardTasks = useMemo(() => repository.tasks.filter(t => t.showOnDashboard), [repository.tasks]);
  const dashboardLaunchConfigs = useMemo(() => (repository.launchConfigs || []).filter(lc => lc.showOnDashboard), [repository.launchConfigs]);

  const hasMoreLaunchOptions = useMemo(() => {
    const unpinnedConfigs = (repository.launchConfigs || []).filter(lc => !lc.showOnDashboard);
    return unpinnedConfigs.length > 0 || props.detectedExecutables.length > 0;
  }, [repository.launchConfigs, props.detectedExecutables]);

  const cardClasses = [
    "relative group bg-white dark:bg-gray-800 rounded-lg shadow-md transition-all duration-200 border-2 border-transparent flex flex-col",
    props.isBeingDragged ? "opacity-50" : "opacity-100",
    isProcessing ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900" : "",
  ].join(' ');

  const nameTooltip = useTooltip(repository.name);
  const vcsTooltip = useTooltip(repository.vcs === 'git' ? 'Git' : 'SVN');
  const pathTooltip = useTooltip(repository.localPath);
  const statusTooltip = useTooltip(`Status: ${repository.status}`);
  const refreshTooltip = useTooltip('Refresh status');
  const editTooltip = useTooltip('Configure repository');
  const deleteTooltip = useTooltip('Delete repository');
  const moreTasksTooltip = useTooltip('Show all tasks');
  const moreLaunchablesTooltip = useTooltip('Show more launch options');

  return (
    <div
      draggable
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onContextMenu={(e) => props.onContextMenu(e, repository)}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
      className={cardClasses}
    >
      {props.dropIndicatorPosition === 'before' && <div className="absolute top-[-0.5rem] left-0 right-0 h-1 bg-green-500 rounded-full animate-pulse" />}
      {props.dropIndicatorPosition === 'after' && <div className="absolute bottom-[-0.5rem] left-0 right-0 h-1 bg-green-500 rounded-full animate-pulse" />}

      {/* Main card content */}
      <div className="p-4 flex-grow">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center min-w-0">
            <span {...vcsTooltip} className="mr-2 flex-shrink-0">
                <VcsIcon className="h-6 w-6 text-gray-400" />
            </span>
            <h3 {...nameTooltip} className="text-lg font-bold text-gray-800 dark:text-gray-200 truncate pr-2">
              {repository.name}
            </h3>
          </div>
          <div className="flex items-center flex-shrink-0 space-x-1">
            <div {...statusTooltip} className={`px-2 py-0.5 text-xs font-semibold text-white rounded-full ${STATUS_COLORS[repository.status]}`}>
              {repository.status}
            </div>
            <button {...refreshTooltip} onClick={handleRefresh} className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <ArrowPathIcon className={`h-4 w-4 ${isRefreshing || isProcessing ? 'animate-spin' : ''}`} />
            </button>
            <button {...editTooltip} onClick={() => props.onEditRepo(repository.id)} className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <PencilIcon className="h-4 w-4" />
            </button>
            <button {...deleteTooltip} onClick={() => props.onDeleteRepo(repository.id)} className="p-1 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900 transition-colors">
                <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Path and Branch info */}
        {localPathState === 'valid' && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex items-center cursor-pointer" onClick={() => props.onOpenLocalPath(repository.localPath)}>
              <FolderIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <p {...pathTooltip} className="font-mono truncate hover:underline">{repository.localPath}</p>
            </div>
            {repository.vcs === 'git' && branchInfo && (
              <div className="flex items-center">
                <GitBranchIcon className="h-4 w-4 mr-2 flex-shrink-0"/>
                <select
                  value={branchInfo.current || ''}
                  onChange={(e) => props.onSwitchBranch(repository.id, e.target.value)}
                  className="bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer"
                >
                  <optgroup label="Local Branches">
                    {branchInfo.local.map(b => <option key={b} value={b}>{b}</option>)}
                  </optgroup>
                  <optgroup label="Remote Branches">
                    {branchInfo.remote.map(b => <option key={b} value={b}>{`origin/${b}`}</option>)}
                  </optgroup>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Status indicator */}
        {localPathState === 'valid' && detailedStatus && <StatusIndicator status={detailedStatus} />}

        {/* Invalid path state */}
        {localPathState !== 'valid' && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/40 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
            <p className="font-semibold">Local path is {localPathState}.</p>
            <div className="mt-2 flex gap-2">
                <button onClick={() => props.onCloneRepo(repository.id)} className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs">Clone here</button>
                <button onClick={() => props.onChooseLocationAndClone(repository.id)} className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs">Clone to...</button>
                <button onClick={() => props.onEditRepo(repository.id)} className="px-2 py-1 border border-yellow-500 text-yellow-700 dark:text-yellow-200 rounded hover:bg-yellow-100 dark:hover:bg-yellow-800/50 text-xs">Set Path</button>
            </div>
          </div>
        )}
      </div>

      {/* Footer with actions */}
      <div className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
        <div className="flex flex-wrap items-center gap-2">
          {dashboardTasks.map(task => (
            <button
              key={task.id}
              onClick={() => props.onRunTask(repository.id, task.id)}
              disabled={localPathState !== 'valid' || isProcessing}
              className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="h-4 w-4 mr-1.5" />
              {task.name}
            </button>
          ))}
          {repository.tasks.length > dashboardTasks.length && (
            <button
              {...moreTasksTooltip}
              onClick={() => props.onOpenTaskSelection(repository.id)}
              disabled={localPathState !== 'valid' || isProcessing}
              className="flex items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CubeTransparentIcon className="h-4 w-4" />
            </button>
          )}

          {dashboardLaunchConfigs.map(config => (
              <button
                key={config.id}
                onClick={() => props.onRunLaunchConfig(repository.id, config.id)}
                disabled={localPathState !== 'valid' || isProcessing}
                className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RocketLaunchIcon className="h-4 w-4 mr-1.5"/>
                {config.name}
              </button>
          ))}
          
          {hasMoreLaunchOptions && (
            <button
              {...moreLaunchablesTooltip}
              onClick={() => props.onOpenLaunchSelection(repository.id)}
              disabled={localPathState !== 'valid' || isProcessing}
              className="flex items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-4 w-4" />
            </button>
          )}

          <div className="flex-grow"></div>
          
          {(repository.webLinks || []).map(link => (
              <button key={link.id} {...useTooltip(link.url)} onClick={() => props.onOpenWeblink(link.url)} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </button>
          ))}
          <button {...useTooltip('Open in Terminal')} onClick={() => props.onOpenTerminal(repository.localPath)} disabled={localPathState !== 'valid'} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <TerminalIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepositoryCard;
