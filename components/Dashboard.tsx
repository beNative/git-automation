import React, { useState, useCallback, useMemo } from 'react';
import type { Repository, Category, LocalPathState, DetailedStatus, BranchInfo, ToastMessage, ReleaseInfo } from '../types';
import RepositoryCard from './RepositoryCard';
import CategoryHeader from './CategoryHeader';
import { PlusIcon } from './icons/PlusIcon';
import { useLogger } from '../hooks/useLogger';

interface DashboardProps {
  repositories: Repository[];
  categories: Category[];
  uncategorizedOrder: string[];
  onAddCategory: (name: string) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onMoveRepositoryToCategory: (repoId: string, sourceId: string | 'uncategorized', targetId: string | 'uncategorized', targetIndex: number) => void;
  onToggleCategoryCollapse: (categoryId: string) => void;
  
  // Pass-through props for RepositoryCard
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
  latestReleases: Record<string, ReleaseInfo | null>;
  onSwitchBranch: (repoId: string, branch: string) => void;
  onCloneRepo: (repoId: string) => void;
  onChooseLocationAndClone: (repoId: string) => void;
  onRunLaunchConfig: (repoId: string, configId: string) => void;
  onOpenLaunchSelection: (repoId: string) => void;
  onOpenLocalPath: (path: string) => void;
  onOpenWeblink: (url: string) => void;
  onOpenTerminal: (path: string) => void;
  setToast: (toast: ToastMessage | null) => void;
  onOpenContextMenu: (event: React.MouseEvent, repo: Repository) => void;
  onRefreshRepoState: (repoId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
  const { 
    repositories, 
    categories, 
    uncategorizedOrder,
    onAddCategory, 
    onMoveRepositoryToCategory,
    latestReleases
  } = props;

  const logger = useLogger();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [draggedRepo, setDraggedRepo] = useState<{ repoId: string; sourceCategoryId: string | null } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ categoryId: string | null; repoId: string | null; position: 'before' | 'after' } | null>(null);
  
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleDragStart = useCallback((repoId: string, sourceCategoryId: string | null) => {
    setDraggedRepo({ repoId, sourceCategoryId });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, categoryId: string | null, repoId: string | null) => {
    e.preventDefault();
    if (!draggedRepo || (draggedRepo.repoId === repoId && categoryId === draggedRepo.sourceCategoryId)) {
        setDropIndicator(null);
        return;
    }
    
    const targetElement = e.currentTarget;
    const rect = targetElement.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

    setDropIndicator({ categoryId, repoId, position });
  }, [draggedRepo]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // If the mouse moves to a child element, it will trigger a leave then an over on the child.
    // A small timeout helps prevent flickering.
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDropIndicator(null);
    }
  }, []);
  
  const handleDrop = useCallback((targetCategoryId: string | null, targetRepoId: string | null) => {
    if (!draggedRepo) return;
  
    const { repoId, sourceCategoryId } = draggedRepo;
    const sourceId = sourceCategoryId ?? 'uncategorized';
    const targetId = targetCategoryId ?? 'uncategorized';

    const targetCategory = categories.find(c => c.id === targetCategoryId);
    const targetList = targetCategory ? targetCategory.repositoryIds : uncategorizedOrder;

    let targetIndex = 0;

    if (targetRepoId) { // Dropped on a repository card
        const indexInList = targetList.indexOf(targetRepoId);
        if (indexInList === -1) {
            console.error("Drop target repo not found in its own list. Aborting drop.");
            return;
        }
        targetIndex = (dropIndicator?.position === 'after') ? indexInList + 1 : indexInList;
    } else { // Dropped on a category header or empty zone
        targetIndex = targetList.length;
    }
    
    // The core fix: adjust the index if we're reordering *within* the same list
    // and moving an item downwards. The removal of the item from its original
    // position will shift the indices of subsequent items.
    if (sourceId === targetId) {
        const sourceList = (sourceCategoryId ? categories.find(c => c.id === sourceCategoryId)?.repositoryIds : uncategorizedOrder) || [];
        const sourceIndex = sourceList.indexOf(repoId);
        if (sourceIndex > -1 && sourceIndex < targetIndex) {
            targetIndex--;
        }
    }
    
    logger.debug('handleDrop: Dispatching move action', { repoId, sourceId, targetId, targetIndex, targetRepoId, position: dropIndicator?.position });
    onMoveRepositoryToCategory(repoId, sourceId, targetId, targetIndex);
  
    setDraggedRepo(null);
    setDropIndicator(null);
  }, [draggedRepo, categories, uncategorizedOrder, onMoveRepositoryToCategory, dropIndicator, logger]);


  const reposById = useMemo(() => 
    repositories.reduce((acc, repo) => {
        acc[repo.id] = repo;
        return acc;
    }, {} as Record<string, Repository>),
    [repositories]
  );
  
  const renderRepoList = (repoIds: string[], categoryId: string | null) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {repoIds.map((repoId) => {
            const repo = reposById[repoId];
            if (!repo) return null; // Should not happen if data is consistent

            const isBeingDragged = draggedRepo?.repoId === repo.id;
            const indicator = dropIndicator?.repoId === repo.id && dropIndicator?.categoryId === categoryId ? dropIndicator : null;
            return (
                <RepositoryCard
                    key={repo.id}
                    repository={repo}
                    isProcessing={props.isProcessing.has(repo.id)}
                    localPathState={props.localPathStates[repo.id] || 'checking'}
                    detailedStatus={props.detailedStatuses[repo.id] || null}
                    branchInfo={props.branchLists[repo.id] || null}
                    latestRelease={latestReleases[repo.id] || null}
                    detectedExecutables={props.detectedExecutables[repo.id] || []}
                    onDragStart={() => handleDragStart(repo.id, categoryId)}
                    onDragEnd={() => { setDraggedRepo(null); setDropIndicator(null); }}
                    isBeingDragged={isBeingDragged}
                    dropIndicatorPosition={indicator ? indicator.position : null}
                    onDragOver={(e) => handleDragOver(e, categoryId, repo.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => { e.stopPropagation(); handleDrop(categoryId, repo.id); }}
                    onContextMenu={(e) => props.onOpenContextMenu(e, repo)}
                    // Pass all other props down from DashboardProps to RepositoryCardProps
                    onOpenTaskSelection={props.onOpenTaskSelection}
                    onRunTask={props.onRunTask}
                    onViewLogs={props.onViewLogs}
                    onViewHistory={props.onViewHistory}
                    onEditRepo={props.onEditRepo}
                    onDeleteRepo={props.onDeleteRepo}
                    onSwitchBranch={props.onSwitchBranch}
                    onCloneRepo={props.onCloneRepo}
                    onChooseLocationAndClone={props.onChooseLocationAndClone}
                    onRunLaunchConfig={props.onRunLaunchConfig}
                    onOpenLaunchSelection={props.onOpenLaunchSelection}
                    onOpenLocalPath={props.onOpenLocalPath}
                    onOpenWeblink={props.onOpenWeblink}
                    onOpenTerminal={props.onOpenTerminal}
                    setToast={props.setToast}
                    onRefreshRepoState={props.onRefreshRepoState}
                />
            );
        })}
    </div>
  );

  const uncategorizedRepos = useMemo(() => 
    uncategorizedOrder.map(id => reposById[id]).filter(Boolean),
    [uncategorizedOrder, reposById]
  );

  return (
    <div className="space-y-6">
      {categories.map(category => {
        const categoryRepoIds = category.repositoryIds;
        return (
          <div key={category.id} className="p-3 rounded-lg" style={{backgroundColor: category.backgroundColor}}>
            <CategoryHeader 
                category={category}
                repoCount={categoryRepoIds.length}
                onUpdate={props.onUpdateCategory}
                onDelete={props.onDeleteCategory}
                onToggleCollapse={props.onToggleCategoryCollapse}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropIndicator({ categoryId: category.id, repoId: null, position: 'after' }); }}
                onDragLeave={handleDragLeave}
                onDrop={(e) => { e.stopPropagation(); handleDrop(category.id, null); }}
            />
            {!(category.collapsed ?? false) && (
              <div 
                className="mt-3"
                onDragOver={(e) => { 
                    if (categoryRepoIds.length === 0) {
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setDropIndicator({ categoryId: category.id, repoId: null, position: 'after' });
                    }
                }}
                onDragLeave={(e) => handleDragLeave(e)}
                onDrop={(e) => { e.stopPropagation(); handleDrop(category.id, null); }}
              >
                {renderRepoList(categoryRepoIds, category.id)}
                {categoryRepoIds.length === 0 && (
                  <div className="p-6 text-center text-gray-500 border-2 border-dashed rounded-lg">
                    Drag repositories here to add them to this category.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div>
        <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-3 px-2">Uncategorized</h2>
        <div 
            className="min-h-[5rem]"
            onDragOver={(e) => { 
                if (uncategorizedRepos.length === 0) {
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    setDropIndicator({ categoryId: null, repoId: null, position: 'after' });
                }
            }}
            onDragLeave={(e) => handleDragLeave(e)}
            onDrop={(e) => { e.stopPropagation(); handleDrop(null, null); }}
        >
            {renderRepoList(uncategorizedOrder, null)}
            {uncategorizedRepos.length === 0 && (
            <div className="p-6 text-center text-gray-500 border-2 border-dashed rounded-lg">
                No uncategorized repositories.
            </div>
            )}
        </div>
      </div>

      <div className="mt-6 px-2">
        {isAddingCategory ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              className="flex-grow bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <button onClick={handleAddCategory} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Add</button>
            <button onClick={() => setIsAddingCategory(false)} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Cancel</button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <PlusIcon className="h-4 w-4 mr-1"/> Add New Category
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;