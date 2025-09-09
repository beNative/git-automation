import React, { useState, useCallback, useMemo } from 'react';
// FIX START: Import DropTarget type for robust DnD.
import type { Repository, Category, LocalPathState, DetailedStatus, BranchInfo, ToastMessage, ReleaseInfo, DndStrategy, DropTarget } from '../types';
// FIX END
import RepositoryCard from './RepositoryCard';
import CategoryHeader from './CategoryHeader';
import { PlusIcon } from './icons/PlusIcon';
import { useLogger } from '../hooks/useLogger';
import { useSettings } from '../contexts/SettingsContext';

interface DashboardProps {
  repositories: Repository[];
  categories: Category[];
  uncategorizedOrder: string[];
  onAddCategory: (name: string) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  // FIX START: Update signature to use DropTarget object, fixing stale state issues.
  onMoveRepositoryToCategory: (repoId: string, sourceId: string | 'uncategorized', target: DropTarget) => void;
  // FIX END
  onMoveRepository: (repoId: string, direction: 'up' | 'down') => void;
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
  
  const { settings } = useSettings();
  const logger = useLogger();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [draggedRepo, setDraggedRepo] = useState<{ repoId: string; sourceCategoryId: string | 'uncategorized' } | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);

  const [repoDropIndicator, setRepoDropIndicator] = useState<{ categoryId: string | 'uncategorized'; repoId: string | null; position: 'before' | 'after' } | null>(null);
  const [categoryDropIndicator, setCategoryDropIndicator] = useState<{ categoryId: string; position: 'before' | 'after' } | null>(null);
  
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleDragStartRepo = useCallback((e: React.DragEvent<HTMLDivElement>, repoId: string, sourceCategoryId: string | 'uncategorized') => {
    logger.debug('[DnD] Drag Start Repo', { repoId, sourceCategoryId });
    e.dataTransfer.setData('text/plain', JSON.stringify({ repoId, sourceCategoryId }));
    setDraggedRepo({ repoId, sourceCategoryId });
    setDraggedCategoryId(null);
  }, [logger]);
  
  const handleDragStartCategory = useCallback((categoryId: string) => {
    logger.debug('[DnD] Drag Start Category', { categoryId });
    setDraggedCategoryId(categoryId);
    setDraggedRepo(null);
  }, [logger]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // The "IndicatorState" strategy is the only one that needs this complex logic.
    // All other strategies calculate the drop position inside handleDrop.
    if (settings.dndStrategy !== 'IndicatorState') {
      return;
    }

    if (draggedRepo) {
      const targetElement = e.currentTarget;
      const rect = targetElement.getBoundingClientRect();
      const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      const repoId = targetElement.dataset.repoId || null;
      const categoryId = targetElement.dataset.categoryId as string | 'uncategorized' || 'uncategorized';
      setRepoDropIndicator({ categoryId, repoId, position });
    } else if (draggedCategoryId) {
      const targetCategoryId = e.currentTarget.dataset.categoryId;
      if (targetCategoryId && draggedCategoryId !== targetCategoryId) {
          const targetElement = e.currentTarget;
          const rect = targetElement.getBoundingClientRect();
          const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
          setCategoryDropIndicator({ categoryId: targetCategoryId, position });
      } else {
          setCategoryDropIndicator(null);
      }
    }
  }, [draggedRepo, draggedCategoryId, settings.dndStrategy]);

  const handleDragLeave = useCallback(() => {
    setRepoDropIndicator(null);
    setCategoryDropIndicator(null);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    logger.debug('[DnD] Drop event triggered', { strategy: settings.dndStrategy });
    
    // --- Universal Dragged Item Identification ---
    let currentDraggedRepo: { repoId: string; sourceCategoryId: string | 'uncategorized' } | null = null;
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.repoId) {
        currentDraggedRepo = data;
      }
    } catch (err) {
      logger.error('[DnD] Failed to parse DataTransfer data. Using component state.', { error: err, state: draggedRepo });
      currentDraggedRepo = draggedRepo;
    }

    if (currentDraggedRepo) {
      const { repoId: draggedRepoId, sourceCategoryId } = currentDraggedRepo;
      let target: DropTarget | null = null;

      // --- STRATEGY-BASED TARGET CALCULATION ---
      switch (settings.dndStrategy) {
        case 'IndicatorState': { // The previous, flawed logic
          logger.debug('[DnD] Using "IndicatorState" strategy');
          if (repoDropIndicator) {
              target = {
                  repoId: repoDropIndicator.repoId,
                  categoryId: repoDropIndicator.categoryId,
                  position: repoDropIndicator.position,
              };
          } else {
             const categoryId = (e.currentTarget as HTMLElement).dataset.categoryId as string | 'uncategorized' || 'uncategorized';
             target = { repoId: null, categoryId, position: 'end' };
          }
          break;
        }

        case 'DropTargetDirect':
        case 'ElementFromPoint':
        case 'DropTargetTraversal':
        case 'Hybrid': {
          let dropElement: HTMLElement | null = null;
          if (settings.dndStrategy === 'ElementFromPoint') {
              logger.debug('[DnD] Using "ElementFromPoint" strategy');
              dropElement = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
          } else { // DropTargetDirect, DropTargetTraversal, Hybrid
              logger.debug(`[DnD] Using "${settings.dndStrategy}" strategy`);
              dropElement = e.target as HTMLElement;
          }

          let cardElement: HTMLElement | null = null;
          let categoryElement: HTMLElement | null = null;
          
          // Find the relevant elements by traversing up the DOM
          let current = dropElement;
          while(current) {
            if (current.dataset.repoId && !cardElement) {
              cardElement = current;
            }
            if (current.dataset.categoryId && !categoryElement) {
              categoryElement = current;
            }
            if (cardElement && categoryElement) break;
            current = current.parentElement;
          }
          
          // Hybrid strategy fallback
          if (settings.dndStrategy === 'Hybrid' && !cardElement && !categoryElement) {
            logger.debug('[DnD] Hybrid strategy falling back to currentTarget');
            cardElement = (e.currentTarget as HTMLElement).dataset.repoId ? (e.currentTarget as HTMLElement) : null;
            categoryElement = e.currentTarget as HTMLElement;
          }

          if (cardElement) {
            const rect = cardElement.getBoundingClientRect();
            target = {
              repoId: cardElement.dataset.repoId!,
              categoryId: cardElement.dataset.categoryId as string | 'uncategorized',
              position: e.clientY < rect.top + rect.height / 2 ? 'before' : 'after',
            };
          } else if (categoryElement) {
            target = {
              repoId: null,
              categoryId: categoryElement.dataset.categoryId as string | 'uncategorized',
              position: 'end'
            };
          }
          break;
        }
      }

      if (target) {
        logger.debug('[DnD] Dispatching move action', { draggedRepoId, sourceCategoryId, target });
        onMoveRepositoryToCategory(draggedRepoId, sourceCategoryId, target);
      } else {
        logger.warn('[DnD] Could not determine a valid drop target.');
      }
    } else if (draggedCategoryId) {
        const targetCategoryId = (e.currentTarget as HTMLElement).dataset.categoryId;
        if (targetCategoryId && draggedCategoryId !== targetCategoryId && categoryDropIndicator) {
            logger.debug('[DnD] Reordering category', { draggedCategoryId, targetCategoryId, position: categoryDropIndicator.position });
            onReorderCategories(draggedCategoryId, targetCategoryId, categoryDropIndicator.position);
        }
    }
  
    setDraggedRepo(null);
    setDraggedCategoryId(null);
    setRepoDropIndicator(null);
    setCategoryDropIndicator(null);
  }, [draggedRepo, draggedCategoryId, onMoveRepositoryToCategory, onReorderCategories, repoDropIndicator, categoryDropIndicator, logger, settings.dndStrategy]);
  // FIX END

  const reposById = useMemo(() => 
    repositories.reduce((acc, repo) => {
        acc[repo.id] = repo;
        return acc;
    }, {} as Record<string, Repository>),
    [repositories]
  );
  
  const renderRepoList = (repoIds: string[], categoryId: string | 'uncategorized') => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {repoIds.map((repoId, index) => {
            const repo = reposById[repoId];
            if (!repo) return null; // Should not happen if data is consistent

            const isBeingDragged = draggedRepo?.repoId === repo.id;
            const indicator = repoDropIndicator?.repoId === repo.id && repoDropIndicator?.categoryId === categoryId ? repoDropIndicator : null;
            return (
                <RepositoryCard
                    key={repo.id}
                    repository={repo}
                    categoryId={categoryId}
                    isProcessing={props.isProcessing.has(repo.id)}
                    localPathState={props.localPathStates[repo.id] || 'checking'}
                    detailedStatus={props.detailedStatuses[repo.id] || null}
                    branchInfo={props.branchLists[repo.id] || null}
                    latestRelease={latestReleases[repo.id] || null}
                    detectedExecutables={props.detectedExecutables[repo.id] || []}
                    onDragStart={(e) => handleDragStartRepo(e, repo.id, categoryId)}
                    onDragEnd={() => { setDraggedRepo(null); setRepoDropIndicator(null); }}
                    isBeingDragged={isBeingDragged}
                    dropIndicatorPosition={indicator ? indicator.position : null}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onContextMenu={(e) => props.onOpenContextMenu(e, repo)}
                    onMoveRepository={props.onMoveRepository}
                    isFirstInList={index === 0}
                    isLastInList={index === repoIds.length - 1}
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
            data-category-id={category.id}
            className={`transition-opacity duration-300 ${isBeingDragged ? 'opacity-40' : 'opacity-100'}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
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
                    onDropRepo={handleDrop}
                    onDragEnd={() => { setDraggedCategoryId(null); setCategoryDropIndicator(null); }}
                />
                {!(category.collapsed ?? false) && (
                  <div 
                    className="mt-3"
                    data-category-id={category.id}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
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
            data-category-id="uncategorized"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {renderRepoList(uncategorizedOrder, 'uncategorized')}
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
