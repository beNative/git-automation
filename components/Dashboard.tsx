import React, { useState } from 'react';
import type { Repository, Category, LocalPathState, DetailedStatus, BranchInfo, Launchable, ToastMessage } from '../types';
import RepositoryCard from './RepositoryCard';
// FIX: Add .tsx extension to module import.
import CategoryHeader from './CategoryHeader.tsx';
// FIX: Add .tsx extension to module import.
import CategoryColorModal from './modals/CategoryColorModal.tsx';

interface DashboardProps {
  repositories: Repository[];
  categories: Category[];
  onRunTask: (repoId: string, taskId: string) => void;
  onEditRepo: (repoId: string) => void;
  onDeleteRepo: (repoId: string) => void;
  onOpenTaskSelection: (repoId: string) => void;
  onOpenLaunchSelection: (repoId: string) => void;
  onViewLogs: (repoId: string) => void;
  onViewHistory: (repoId: string) => void;
  onRefreshRepoState: (repoId: string) => void;
  localPathStates: Record<string, LocalPathState>;
  detailedStatuses: Record<string, DetailedStatus | null>;
  branchInfos: Record<string, BranchInfo | null>;
  detectedExecutables: Record<string, string[]>;
  setToast: (toast: ToastMessage | null) => void;
  confirmAction: (options: any) => void;
  onRunLaunchable: (repo: Repository, launchable: Launchable) => void;
  isProcessing: Set<string>;
  onCloneRepo: (repoId: string) => void;
  onChooseLocationAndClone: (repoId: string) => void;
  onOpenLocalPath: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onOpenWeblink: (url: string) => void;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
  const [draggedRepoId, setDraggedRepoId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const uncategorizedRepos = props.repositories.filter(r => !r.category);

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-fade-in">
        {props.categories.map(category => (
            <div key={category.id}>
                <CategoryHeader 
                    category={category} 
                    onToggleCollapse={() => { /* Placeholder */ }} 
                    onEditColor={() => {
                        setEditingCategory(category);
                        setIsColorModalOpen(true);
                    }}
                />
                {!category.isCollapsed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 mt-4">
                        {props.repositories.filter(r => r.category === category.id).map(repo => (
                            <RepositoryCard
                                key={repo.id}
                                repository={repo}
                                onRunTask={props.onRunTask}
                                onEditRepo={props.onEditRepo}
                                onDeleteRepo={props.onDeleteRepo}
                                onOpenTaskSelection={props.onOpenTaskSelection}
                                onOpenLaunchSelection={props.onOpenLaunchSelection}
                                onViewLogs={props.onViewLogs}
                                onViewHistory={props.onViewHistory}
                                localPathState={props.localPathStates[repo.id] || 'checking'}
                                detailedStatus={props.detailedStatuses[repo.id] || null}
                                branchInfo={props.branchInfos[repo.id] || null}
                                detectedExecutables={props.detectedExecutables[repo.id] || []}
                                isProcessing={props.isProcessing.has(repo.id)}
                                setToast={props.setToast}
                                isBeingDragged={draggedRepoId === repo.id}
                                dropIndicatorPosition={dropTarget?.id === repo.id ? dropTarget.position : null}
                                onDragStart={() => setDraggedRepoId(repo.id)}
                                onDragOver={() => { /* Placeholder */ }}
                                onDragLeave={() => setDropTarget(null)}
                                onDrop={() => { /* Placeholder */ }}
                                onDragEnd={() => setDraggedRepoId(null)}
                                onContextMenu={(e, r) => { /* Placeholder */ }}
                                onRefreshRepoState={props.onRefreshRepoState}
                                onCloneRepo={props.onCloneRepo}
                                onChooseLocationAndClone={props.onChooseLocationAndClone}
                                onOpenLocalPath={props.onOpenLocalPath}
                                onOpenTerminal={props.onOpenTerminal}
                                onOpenWeblink={props.onOpenWeblink}
                                onRunLaunchConfig={(repoId, configId) => {
                                    const launchConfig = repo.launchConfigs.find(lc => lc.id === configId);
                                    if(launchConfig) props.onRunLaunchable(repo, { type: 'manual', config: launchConfig });
                                }}
                                onSwitchBranch={() => { /* Placeholder */ }}
                            />
                        ))}
                    </div>
                )}
            </div>
        ))}

        {uncategorizedRepos.length > 0 && (
            <div>
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">Uncategorized</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 mt-4">
                    {uncategorizedRepos.map(repo => (
                        <RepositoryCard
                            key={repo.id}
                            repository={repo}
                            onRunTask={props.onRunTask}
                            onEditRepo={props.onEditRepo}
                            onDeleteRepo={props.onDeleteRepo}
                            onOpenTaskSelection={props.onOpenTaskSelection}
                            onOpenLaunchSelection={props.onOpenLaunchSelection}
                            onViewLogs={props.onViewLogs}
                            onViewHistory={props.onViewHistory}
                            localPathState={props.localPathStates[repo.id] || 'checking'}
                            detailedStatus={props.detailedStatuses[repo.id] || null}
                            branchInfo={props.branchInfos[repo.id] || null}
                            detectedExecutables={props.detectedExecutables[repo.id] || []}
                            isProcessing={props.isProcessing.has(repo.id)}
                            setToast={props.setToast}
                            isBeingDragged={draggedRepoId === repo.id}
                            dropIndicatorPosition={dropTarget?.id === repo.id ? dropTarget.position : null}
                            onDragStart={() => setDraggedRepoId(repo.id)}
                            onDragOver={() => { /* Placeholder */ }}
                            onDragLeave={() => setDropTarget(null)}
                            onDrop={() => { /* Placeholder */ }}
                            onDragEnd={() => setDraggedRepoId(null)}
                            onContextMenu={(e, r) => { /* Placeholder */ }}
                            onRefreshRepoState={props.onRefreshRepoState}
                            onCloneRepo={props.onCloneRepo}
                            onChooseLocationAndClone={props.onChooseLocationAndClone}
                            onOpenLocalPath={props.onOpenLocalPath}
                            onOpenTerminal={props.onOpenTerminal}
                            onOpenWeblink={props.onOpenWeblink}
                             onRunLaunchConfig={(repoId, configId) => {
                                const launchConfig = repo.launchConfigs.find(lc => lc.id === configId);
                                if(launchConfig) props.onRunLaunchable(repo, { type: 'manual', config: launchConfig });
                            }}
                            onSwitchBranch={() => { /* Placeholder */ }}
                        />
                    ))}
                </div>
            </div>
        )}
        {isColorModalOpen && editingCategory && (
            <CategoryColorModal 
                isOpen={isColorModalOpen}
                category={editingCategory}
                onClose={() => setIsColorModalOpen(false)}
                onSaveColor={(color) => {
                    // Placeholder for saving color
                    setIsColorModalOpen(false);
                }}
            />
        )}
    </div>
  );
};

export default Dashboard;
