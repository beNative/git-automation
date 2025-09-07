import React, { useState } from 'react';
import type { Repository, LocalPathState, DetailedStatus, BranchInfo, ToastMessage } from '../types';
import RepositoryCard from './RepositoryCard';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

interface DashboardProps {
  repositories: Repository[];
  setRepositories: (repos: Repository[]) => void;
  onOpenTaskSelection: (repoId: string) => void;
  onRunTask: (repoId: string, taskId: string) => void;
  onViewLogs: (repoId: string) => void;
  onViewHistory: (repoId: string) => void;
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
  setToast: (toast: ToastMessage | null) => void;
  onOpenContextMenu: (event: React.MouseEvent, repo: Repository) => void;
  onRefreshRepoState: (repoId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  repositories,
  setRepositories,
  onOpenTaskSelection,
  onRunTask,
  onViewLogs,
  onViewHistory,
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
  setToast,
  onOpenContextMenu,
  onRefreshRepoState,
}) => {
  const [draggedRepoId, setDraggedRepoId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, repoId: string) => {
    e.dataTransfer.setData('repoId', repoId);
    setDraggedRepoId(repoId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, targetRepoId: string) => {
    if (targetRepoId !== draggedRepoId) {
        setDropTargetId(targetRepoId);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetRepoId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('repoId');
    if (!draggedId || draggedId === targetRepoId) {
        setDropTargetId(null);
        return;
    }

    const draggedRepo = repositories.find(r => r.id === draggedId);
    if (!draggedRepo) return;

    const remainingRepos = repositories.filter(r => r.id !== draggedId);
    const targetIndex = remainingRepos.findIndex(r => r.id === targetRepoId);

    if (targetIndex !== -1) {
        remainingRepos.splice(targetIndex, 0, draggedRepo);
        setRepositories(remainingRepos);
    }
    
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setDraggedRepoId(null);
    setDropTargetId(null);
  };

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
          onViewHistory={onViewHistory}
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
          isBeingDragged={repo.id === draggedRepoId}
          isDropTarget={repo.id === dropTargetId}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          setToast={setToast}
          onContextMenu={onOpenContextMenu}
          onRefreshRepoState={onRefreshRepoState}
        />
      ))}
    </div>
  );
};

export default Dashboard;