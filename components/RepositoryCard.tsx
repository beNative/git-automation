import React from 'react';
import type { Repository, GitRepository, LocalPathState } from '../types';
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
import { ArrowTopRightOnSquareIcon } from './icons/ArrowTopRightOnSquareIcon';
import { FolderPlusIcon } from './icons/FolderPlusIcon';


interface RepositoryCardProps {
  repository: Repository;
  onOpenTaskSelection: (repoId: string) => void;
  onRunTask: (repoId: string, taskId: string) => void;
  onViewLogs: (repoId: string) => void;
  onEditRepo: (repoId: string) => void;
  onDeleteRepo: (repoId: string) => void;
  isProcessing: boolean;
  localPathState: LocalPathState;
  detectedExecutables: string[];
  onCloneRepo: (repoId: string) => void;
  onChooseLocationAndClone: (repoId: string) => void;
  onLaunchApp: (repoId: string) => void;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repository,
  onOpenTaskSelection,
  onRunTask,
  onViewLogs,
  onEditRepo,
  onDeleteRepo,
  isProcessing,
  localPathState,
  detectedExecutables,
  onCloneRepo,
  onChooseLocationAndClone,
  onLaunchApp,
}) => {
  const { id, name, remoteUrl, status, lastUpdated, buildHealth, vcs, launchCommand, tasks, localPath } = repository;
  
  const isPathValid = localPathState === 'valid';
  const isPathMissing = localPathState === 'missing';
  const isPathSet = localPath && localPath.trim() !== '';
  const cloneVerb = vcs === VcsType.Svn ? 'Checkout' : 'Clone';

  const tasksToShowOnCard = tasks.filter(t => t.showOnDashboard).slice(0, 4);
  const hasMoreTasks = tasks.length > tasksToShowOnCard.length;
  const hasLaunchOptions = (launchCommand && launchCommand.trim() !== '') || (detectedExecutables && detectedExecutables.length > 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col transition-all duration-300 hover:shadow-blue-500/20 hover:scale-[1.02] overflow-hidden">
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
          <div className="flex items-center">
            {vcs === VcsType.Git ? (
              <>
                <GitBranchIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                <span>{(repository as GitRepository).branch}</span>
              </>
            ) : (
              <>
                <SvnIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                <span>SVN Repository</span>
              </>
            )}
          </div>
        </div>

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
                      <button
                        onClick={() => onCloneRepo(id)}
                        disabled={isProcessing}
                        className="flex items-center justify-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                        title={`${cloneVerb} from ${remoteUrl} to ${localPath}`}
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
                        {cloneVerb} Repo
                      </button>
                    ) : (
                      <button
                        onClick={() => onChooseLocationAndClone(id)}
                        disabled={isProcessing}
                        className="flex items-center justify-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                        title={`Choose location and ${cloneVerb.toLowerCase()}`}
                      >
                        <FolderPlusIcon className="h-4 w-4 mr-1.5" />
                        Setup & {cloneVerb}
                      </button>
                    )
               ) : (
                <>
                  {tasksToShowOnCard.map(task => (
                      <button
                          key={task.id}
                          onClick={() => onRunTask(id, task.id)}
                          disabled={isProcessing || !isPathValid}
                          className="flex items-center justify-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                          title={!isPathValid ? 'Local path is not valid' : `Run Task: ${task.name}`}
                      >
                          <PlayIcon className="h-4 w-4 mr-1" />
                          <span className="truncate">{task.name}</span>
                      </button>
                  ))}
                </>
               )}
            </div>

            <div className="flex items-center space-x-0.5">
                {isPathValid && hasMoreTasks && (
                  <button 
                    onClick={() => onOpenTaskSelection(id)}
                    className="p-1.5 text-gray-400 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                    title="Select a task to run..."
                    disabled={isProcessing}
                  >
                    <PlayIcon className="h-5 w-5" />
                  </button>
                )}
                {hasLaunchOptions && isPathValid && (
                    <button 
                      onClick={() => onLaunchApp(id)}
                      className="p-1.5 text-gray-400 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                      title="Launch..."
                      disabled={isProcessing}
                    >
                      <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                    </button>
                )}
                <button 
                  onClick={() => onViewLogs(id)} 
                  className="p-1.5 text-gray-400 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="View Logs"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => onEditRepo(id)} 
                  className="p-1.5 text-gray-400 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Configure Repository"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => onDeleteRepo(id)} 
                  className="p-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"
                  title="Delete Repository"
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