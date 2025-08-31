import React from 'react';
import type { Repository } from '../types';
import RepositoryCard from './RepositoryCard';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

interface DashboardProps {
  repositories: Repository[];
  onInitiateRunTask: (repoId: string) => void;
  onViewLogs: (repoId: string) => void;
  onEditRepo: (repoId: string) => void;
  onDeleteRepo: (repoId: string) => void;
  isProcessing: Set<string>;
}

const Dashboard: React.FC<DashboardProps> = ({
  repositories,
  onInitiateRunTask,
  onViewLogs,
  onEditRepo,
  onDeleteRepo,
  isProcessing
}) => {
  if (repositories.length === 0) {
    return (
      <div className="text-center py-16">
        <PlusCircleIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <h3 className="mt-2 text-lg font-medium text-gray-700 dark:text-gray-300">No repositories added</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new repository.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {repositories.map(repo => (
        <RepositoryCard
          key={repo.id}
          repository={repo}
          onInitiateRunTask={onInitiateRunTask}
          onViewLogs={onViewLogs}
          onEditRepo={onEditRepo}
          onDeleteRepo={onDeleteRepo}
          isProcessing={isProcessing.has(repo.id)}
        />
      ))}
    </div>
  );
};

export default Dashboard;