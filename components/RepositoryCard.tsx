import React from 'react';
import type { Repository } from '../types';
import { RepoStatus, BuildHealth } from '../types';
import { STATUS_COLORS, BUILD_HEALTH_COLORS } from '../constants';
import { PlayIcon } from './icons/PlayIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { GitBranchIcon } from './icons/GitBranchIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';


interface RepositoryCardProps {
  repository: Repository;
  onRunAutomation: (repoId: string) => void;
  onViewLogs: (repoId: string) => void;
  onEditRepo: (repo: Repository) => void;
  onDeleteRepo: (repoId: string) => void;
  isProcessing: boolean;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repository,
  onRunAutomation,
  onViewLogs,
  onEditRepo,
  onDeleteRepo,
  isProcessing,
}) => {
  const { id, name, remoteUrl, branch, status, lastUpdated, buildHealth } = repository;

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-cyan-500/20 hover:scale-[1.02]">
      <div className="p-5 flex-grow">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-100 truncate">{name}</h3>
          <div
            className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${STATUS_COLORS[status]}`}
          >
            {status}
          </div>
        </div>

        <div className="mt-3 space-y-2 text-sm text-gray-400">
           <div className="flex items-center">
            <GlobeAltIcon className="h-4 w-4 mr-2 text-gray-500" />
            <a href={remoteUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:text-cyan-400 transition-colors">{remoteUrl}</a>
           </div>
           <div className="flex items-center">
            <GitBranchIcon className="h-4 w-4 mr-2 text-gray-500" />
            <span>{branch}</span>
           </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">Build Health:</span>
          <span className={`font-semibold ${BUILD_HEALTH_COLORS[buildHealth]}`}>
            {buildHealth}
          </span>
        </div>
      </div>
      
      <div className="border-t border-gray-700 p-3 bg-gray-800/50">
          <p className="text-xs text-gray-500 text-center mb-3">
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
          </p>
          <div className="flex justify-around items-center">
            <button
                onClick={() => onRunAutomation(id)}
                disabled={isProcessing}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                title="Pull & Build"
            >
                <PlayIcon className="h-4 w-4 mr-1" />
                Sync
            </button>
            <button 
              onClick={() => onViewLogs(id)} 
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
              title="View Logs"
            >
              <DocumentTextIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={() => onEditRepo(repository)} 
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
              title="Configure Repository"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={() => onDeleteRepo(id)} 
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-full transition-colors"
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
