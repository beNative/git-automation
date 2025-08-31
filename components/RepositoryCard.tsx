import React, { useState, useRef, useEffect } from 'react';
import type { Repository } from '../types';
import { RepoStatus, BuildHealth } from '../types';
import { STATUS_COLORS, BUILD_HEALTH_COLORS } from '../constants';
import { PlayIcon } from './icons/PlayIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { GitBranchIcon } from './icons/GitBranchIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';


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
  const { id, name, remoteUrl, branch, status, lastUpdated, buildHealth, tasks } = repository;
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleRunTask = (taskId: string) => {
    onRunTask(id, taskId);
    setDropdownOpen(false);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col transition-all duration-300 hover:shadow-cyan-500/20 hover:scale-[1.02] ${isDropdownOpen ? 'relative overflow-visible z-10' : 'overflow-hidden'}`}>
      <div className="p-5 flex-grow">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{name}</h3>
          <div
            className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${STATUS_COLORS[status]}`}
          >
            {status}
          </div>
        </div>

        <div className="mt-3 space-y-2 text-sm text-gray-500 dark:text-gray-400">
           <div className="flex items-center">
            <GlobeAltIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
            <a href={remoteUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">{remoteUrl}</a>
           </div>
           <div className="flex items-center">
            <GitBranchIcon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
            <span>{branch}</span>
           </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-400 dark:text-gray-500">Build Health:</span>
          <span className={`font-semibold ${BUILD_HEALTH_COLORS[buildHealth]}`}>
            {buildHealth}
          </span>
        </div>
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-3">
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
          </p>
          <div className="flex justify-around items-center">
            <div className="relative" ref={dropdownRef}>
              <div className="flex rounded-md shadow-sm">
                 <button
                    onClick={() => tasks.length > 0 && handleRunTask(tasks[0].id)}
                    disabled={isProcessing || tasks.length === 0}
                    className="flex items-center pl-3 pr-2 py-2 text-sm font-medium text-white bg-green-600 rounded-l-md hover:bg-green-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    title={tasks.length > 0 ? `Run: ${tasks[0].name}` : 'No tasks available'}
                >
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Run Task
                </button>
                <button
                  onClick={() => setDropdownOpen(prev => !prev)}
                  disabled={isProcessing || tasks.length === 0}
                  className="px-2 py-2 text-sm font-medium text-white bg-green-700 rounded-r-md hover:bg-green-800 disabled:bg-gray-600 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                  aria-haspopup="true"
                  aria-expanded={isDropdownOpen}
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </div>

              {isDropdownOpen && (
                <div className="origin-top-right absolute right-0 top-full mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
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
              className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="View Logs"
            >
              <DocumentTextIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={() => onEditRepo(id)} 
              className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Configure Repository"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={() => onDeleteRepo(id)} 
              className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"
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