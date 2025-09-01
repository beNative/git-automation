import React from 'react';
import type { Repository, LocalPathState, DetailedStatus, BranchInfo } from '../types';
import RepositoryCard from './RepositoryCard';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

interface DashboardProps {
  repositories: Repository[];
  onOpenTaskSelection: (repoId: string) => void;
  onRunTask: (repoId: string, taskId: string) => void;
  onViewLogs: (repoId: string) => void;
  onEditRepo: (repoId: string) => void;
  onDeleteRepo: (repoId: string) => void;
  isProcessing: Set<string>;
  localPathStates: Record<string, LocalPathState>;
  detectedExecutables: Record<string, string[]>;
  detailedStatuses: Record<string, DetailedStatus | null>;
  branchLists: Record<string, BranchInfo | null>;
  onSwitchBranch: (repoId: string, branch: string) => void;
  onCloneRepo: (repoId: string) => void;
  onChooseLocationAndClone: (repoId: string) => void;
  onRunLaunchConfig: (repoId: string, configId: string) => void;
  onOpenLaunchSelection: (repoId: string) => void;
  onOpenLocalPath: (path: string) => void;
  onOpenTerminal: (path: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  repositories,
  onOpenTaskSelection,
  onRunTask,
  onViewLogs,
  onEditRepo,
  onDeleteRepo,
  isProcessing,
  localPathStates,
  detectedExecutables,
  detailedStatuses,
  branchLists,
  onSwitchBranch,
  onCloneRepo,
  onChooseLocationAndClone,
  onRunLaunchConfig,
  onOpenLaunchSelection,
  onOpenLocalPath,
  onOpenTerminal,
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
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(22rem,1fr))]">
      {repositories.map(repo => (
        <RepositoryCard
          key={repo.id}
          repository={repo}
          onOpenTaskSelection={onOpenTaskSelection}
          onRunTask={onRunTask}
          onViewLogs={onViewLogs}
          onEditRepo={onEditRepo}
          onDeleteRepo={onDeleteRepo}
          isProcessing={isProcessing.has(repo.id)}
          localPathState={localPathStates[repo.id] || 'checking'}
          detailedStatus={detailedStatuses[repo.id] || null}
          branchInfo={branchLists[repo.id] || null}
          onSwitchBranch={onSwitchBranch}
          detectedExecutables={detectedExecutables[repo.id] || []}
          onCloneRepo={onCloneRepo}
          onChooseLocationAndClone={onChooseLocationAndClone}
          onRunLaunchConfig={onRunLaunchConfig}
          onOpenLaunchSelection={onOpenLaunchSelection}
          onOpenLocalPath={onOpenLocalPath}
          onOpenTerminal={onOpenTerminal}
        />
      ))}
    </div>
  );
};

export default Dashboard;
