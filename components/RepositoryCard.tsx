import React, { useState, useRef, useEffect } from 'react';
import type { Repository, GitRepository } from '../types';
import { RepoStatus, BuildHealth, VcsType } from '../types';
import { STATUS_COLORS, BUILD_HEALTH_COLORS } from '../constants';
import { PlayIcon } from './icons/PlayIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { GitBranchIcon } from './icons/GitBranchIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { SvnIcon } from './icons/SvnIcon';


interface RepositoryCardProps {
  repository: Repository;
  onRunTask: (repoId: string, taskId: string) => void;
  onViewLogs: (repoId: string) => void;
  onEditRepo: (repoId: string) => void;
  onDeleteRepo: (repoId: string) => void;
  isProcessing: boolean;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repository,
  onRunTask,
  onViewLogs,
  onEditRepo,
  onDeleteRepo,
  isProcessing,
}) => {
  const { id, name, remoteUrl, status, lastUpdated, buildHealth, tasks, vcs } = repository;
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownOpensUp, setDropdownOpensUp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const runButtonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDropdownToggle = () => {
    if (!isDropdownOpen && runButtonContainerRef.current) {
        const rect = runButtonContainerRef.current.getBoundingClientRect();
        // A typical dropdown item is ~36px height. Let's say 5 items + padding = ~200px
        const estimatedDropdownHeight = 200; 
        const spaceBelow = window.innerHeight - rect.bottom;

        if (spaceBelow < estimatedDropdownHeight && rect.top > estimatedDropdownHeight) {
            // Not enough space below, but enough space above
            setDropdownOpensUp(true);
        } else {
            setDropdownOpensUp(false);
        }
    }
    setDropdownOpen(prev => !prev);
  };

  const handleRunTask = (taskId: string) => {
    onRunTask(id, taskId);
    setDropdownOpen(false);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col transition-all duration-300 hover:shadow-cyan-500/20 hover:scale-[1.02] ${isDropdownOpen ? 'relative overflow-visible z-10' : 'overflow-hidden'}`}>
      <div className="p-4 flex-grow">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{name}</h3>
          <div
            className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${STATUS_COLORS[status]}`}
          >
            {status}
          </div>
        </div>

        <div className="mt-2 space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
           <div className="flex items-center">
            <GlobeAltIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
            <a href={remoteUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">{remoteUrl}</a>
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
          <div className="flex justify-around items-center">
            <div className="relative" ref={dropdownRef}>
              <div className="flex rounded-md shadow-sm" ref={runButtonContainerRef}>
                 <button
                    onClick={() => tasks.length > 0 && handleRunTask(tasks[0].id)}
                    disabled={isProcessing || tasks.length === 0}
                    className="flex items-center pl-3 pr-2 py-1.5 text-sm font-medium text-white bg-green-600 rounded-l-md hover:bg-green-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    title={tasks.length > 0 ? `Run: ${tasks[0].name}` : 'No tasks available'}
                >
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Run Task
                </button>
                <button
                  onClick={handleDropdownToggle}
                  disabled={isProcessing || tasks.length === 0}
                  className="px-2 py-1.5 text-sm font-medium text-white bg-green-700 rounded-r-md hover:bg-green-800 disabled:bg-gray-600 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                  aria-haspopup="true"
                  aria-expanded={isDropdownOpen}
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </div>

              {isDropdownOpen && (
                <div className={`absolute right-0 w-56 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-20 ${ dropdownOpensUp ? 'origin-bottom-right bottom-full mb-2' : 'origin-top-right top-full mt-2' }`}>
                  <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                    {tasks.map(task => (
                       <button
                        key={task.id}
                        onClick={() => handleRunTask(task.id)}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        role="menuitem"
                      >
                        {task.name}
                      </button>
                    ))}
                    {tasks.length === 0 && (
                       <span className="block px-4 py-2 text-sm text-gray-400 dark:text-gray-400">No tasks configured.</span>
                    )}
                  </div>
                </div>
              )}
            </div>

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
  );
};

export default RepositoryCard;