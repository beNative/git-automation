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
  onMoveCategory: (categoryId: string, direction: 'up' | 'down') => void;
  onReorderCategories: (draggedId: string, targetId: string, position: 'before' | 'after') => void;
  
  // Pass-through props for RepositoryCard
  onOpenRepoForm: (repoId: string | 'new', categoryId?: string) => void;
  onOpenTaskSelection: (repoId: string) => void;
  onRunTask: (repoId: string, taskId: string) => void;
  onViewLogs: (repoId: string) => void;
  onViewHistory: (repoId: string) => void;
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
    onReorderCategories,
    latestReleases
  } = props;

  const logger = useLogger();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [draggedRepo, setDraggedRepo] = useState<{ repoId: string; sourceCategoryId: string | null } | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);

  const [repoDropIndicator, setRepoDropIndicator] = useState<{ categoryId: string | null; repoId: string | null; position: 'before' | 'after' } | null>(null);
  const [categoryDropIndicator, setCategoryDropIndicator] = useState<{ categoryId: string; position: 'before' | 'after' } | null>(null);
  
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleDragStartRepo = useCallback((repoId: string, sourceCategoryId: string | null) => {
    setDraggedRepo({ repoId, sourceCategoryId });
    setDraggedCategoryId(null);
  }, []);
  
  const handleDragStartCategory = useCallback((categoryId: string) => {
    setDraggedCategoryId(categoryId);
    setDraggedRepo(null);
  }, []);

  const handleDragOverRepo = useCallback((e: React.DragEvent<HTMLDivElement>, categoryId: string | null, repoId: string | null) => {
    e.preventDefault();
    if (!draggedRepo || (draggedRepo.repoId === repoId && categoryId === draggedRepo.sourceCategoryId)) {
        setRepoDropIndicator(null);
        return;
    }
    const targetElement = e.currentTarget;
    const rect = targetElement.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setRepoDropIndicator({ categoryId, repoId, position });
  }, [draggedRepo]);
  
  const handleDragOverCategory = useCallback((e: React.DragEvent<HTMLDivElement>, categoryId: string) => {
    // ONLY handle this event if a category is being dragged over a DIFFERENT category.
    if (draggedCategoryId && draggedCategoryId !== categoryId) {
      e.preventDefault();
      e.stopPropagation(); // Stop this event from going further.
      const targetElement = e.currentTarget;
      const rect = targetElement.getBoundingClientRect();
      const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      setCategoryDropIndicator({ categoryId, position });
    } else {
      // If we are dragging a repo, or dragging a category over itself, do nothing here.
      // Let the event propagate to child elements which have their own onDragOver handlers for repos.
      setCategoryDropIndicator(null);
    }
  }, [draggedCategoryId]);

  const handleDragLeave = useCallback(() => {
    setRepoDropIndicator(null);
    setCategoryDropIndicator(null);
  }, []);
  
  const handleDrop = useCallback((
    targetType: 'category' | 'repo' | 'uncategorized' | 'category-empty',
    targetId: string | null, // repoId, categoryId, or null for uncategorized
  ) => {
    if (draggedRepo) {
        const { repoId, sourceCategoryId } = draggedRepo;
        const sourceId = sourceCategoryId ?? 'uncategorized';

        let targetCategoryId: string | 'uncategorized';
        let targetIndex: number;

        if (targetType === 'repo') {
            const targetCategoryData = categories.find(c => c.repositoryIds.includes(targetId!))
            targetCategoryId = targetCategoryData ? targetCategoryData.id : 'uncategorized';
            const targetList = targetCategoryData ? targetCategoryData.repositoryIds : uncategorizedOrder;
            const indexInList = targetList.indexOf(targetId!);
            targetIndex = (repoDropIndicator?.position === 'after') ? indexInList + 1 : indexInList;
        } else { // 'category' or 'uncategorized' or 'category-empty'
            targetCategoryId = targetId ?? 'uncategorized';
            const targetCategory = categories.find(c => c.id === targetCategoryId);
            const targetList = targetCategory ? targetCategory.repositoryIds : uncategorizedOrder;
            targetIndex = targetList.length;
        }

        if (sourceId === targetCategoryId) {
            const sourceList = (sourceCategoryId ? categories.find(c => c.id === sourceCategoryId)?.repositoryIds : uncategorizedOrder) || [];
            const sourceIndex = sourceList.indexOf(repoId);
            if (sourceIndex > -1 && sourceIndex < targetIndex) {
                targetIndex--;
            }
        }
        
        onMoveRepositoryToCategory(repoId, sourceId, targetCategoryId, targetIndex);

    } else if (draggedCategoryId) {
        if (targetType === 'category' && targetId && draggedCategoryId !== targetId && categoryDropIndicator) {
            onReorderCategories(draggedCategoryId, targetId, categoryDropIndicator.position);
        }
    }
  
    setDraggedRepo(null);
    setDraggedCategoryId(null);
    setRepoDropIndicator(null);
    setCategoryDropIndicator(null);
  }, [draggedRepo, draggedCategoryId, categories, uncategorizedOrder, onMoveRepositoryToCategory, onReorderCategories, repoDropIndicator, categoryDropIndicator, logger]);

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
            const indicator = repoDropIndicator?.repoId === repo.id && repoDropIndicator?.categoryId === categoryId ? repoDropIndicator : null;
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
                    onDragStart={() => handleDragStartRepo(repo.id, categoryId)}
                    onDragEnd={() => { setDraggedRepo(null); setRepoDropIndicator(null); }}
                    isBeingDragged={isBeingDragged}
                    dropIndicatorPosition={indicator ? indicator.position : null}
                    onDragOver={(e) => handleDragOverRepo(e, categoryId, repo.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop('repo', repo.id)}
                    onContextMenu={(e) => props.onOpenContextMenu(e, repo)}
                    // Pass all other props down from DashboardProps to RepositoryCardProps
                    onEditRepo={(repoId) => props.onOpenRepoForm(repoId)}
                    onOpenTaskSelection={props.onOpenTaskSelection}
                    onRunTask={props.onRunTask}
                    onViewLogs={props.onViewLogs}
                    onViewHistory={props.onViewHistory}
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
      {categories.map((category, index) => {
        const categoryRepoIds = category.repositoryIds;
        const showDropIndicatorBefore = categoryDropIndicator?.categoryId === category.id && categoryDropIndicator.position === 'before';
        const showDropIndicatorAfter = categoryDropIndicator?.categoryId === category.id && categoryDropIndicator.position === 'after';
        const isBeingDragged = draggedCategoryId === category.id;

        return (
          <div
            key={category.id}
            className={`transition-opacity duration-300 ${isBeingDragged ? 'opacity-40' : 'opacity-100'}`}
            onDragOver={(e) => handleDragOverCategory(e, category.id)}
            onDrop={(e) => {
              // Only handle the drop if a category was being dragged.
              if (draggedCategoryId) {
                e.preventDefault();
                e.stopPropagation();
                handleDrop('category', category.id);
              }
            }}
            onDragLeave={handleDragLeave}
          >
             {showDropIndicatorBefore && <div className="h-2 my-2 bg-blue-500 rounded-lg" />}
              <div className="p-3 rounded-lg" style={{backgroundColor: category.backgroundColor}}>
                <CategoryHeader 
                    category={category}
                    repoCount={categoryRepoIds.length}
                    isFirst={index === 0}
                    isLast={index === categories.length - 1}
                    onUpdate={props.onUpdateCategory}
                    onDelete={props.onDeleteCategory}
                    onToggleCollapse={props.onToggleCategoryCollapse}
                    onMoveCategory={props.onMoveCategory}
                    onAddRepo={() => props.onOpenRepoForm('new', category.id)}
                    onDragStart={() => handleDragStartCategory(category.id)}
                    onDropRepo={() => handleDrop('category', category.id)}
                    onDragEnd={() => { setDraggedCategoryId(null); setCategoryDropIndicator(null); }}
                />
                {!(category.collapsed ?? false) && (
                  <div 
                    className="mt-3"
                    onDragOver={(e) => { 
                        if (categoryRepoIds.length === 0) {
                           handleDragOverRepo(e, category.id, null)
                        }
                    }}
                    onDragLeave={(e) => handleDragLeave()}
                    onDrop={() => handleDrop('category-empty', category.id)}
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
            {showDropIndicatorAfter && <div className="h-2 my-2 bg-blue-500 rounded-lg" />}
          </div>
        );
      })}

      <div>
        <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-3 px-2">Uncategorized</h2>
        <div 
            className="min-h-[5rem]"
            onDragOver={(e) => { 
                if (uncategorizedRepos.length === 0) {
                    handleDragOverRepo(e, null, null);
                }
            }}
            onDragLeave={(e) => handleDragLeave()}
            onDrop={() => handleDrop('uncategorized', null)}
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