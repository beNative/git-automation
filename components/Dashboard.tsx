import React, { useState, useCallback, useMemo, useRef } from 'react';
// FIX: Import DropTarget type for robust DnD.
import type { Repository, Category, LocalPathState, DetailedStatus, BranchInfo, ToastMessage, ReleaseInfo, DropTarget } from '../types';
import RepositoryCard from './RepositoryCard';
import CategoryHeader from './CategoryHeader';
import { PlusIcon } from './icons/PlusIcon';
import { useLogger } from '../hooks/useLogger';
import { useSettings } from '../contexts/SettingsContext';

type RepositoryDragPayload = {
  type: 'repository-list';
  sourceInstanceId?: string;
  sourceCategoryId: string | 'uncategorized';
  repoIds: string[];
  repositories?: Repository[];
};

const CROSS_INSTANCE_MIME = 'application/git-automation-nodes';

interface DashboardProps {
  repositories: Repository[];
  categories: Category[];
  uncategorizedOrder: string[];
  onAddCategory: (name: string) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  // FIX: Update signature to use DropTarget object, fixing stale state issues.
  onMoveRepositoryToCategory: (repoId: string, sourceId: string | 'uncategorized', target: DropTarget) => void;
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
    latestReleases,
    setToast,
  } = props;
  
  const logger = useLogger();
  const { settings, importRepositories } = useSettings();
  const instanceIdRef = useRef<string>('');
  if (!instanceIdRef.current) {
    instanceIdRef.current = `instance_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [draggedRepo, setDraggedRepo] = useState<{ repoId: string; sourceCategoryId: string | 'uncategorized' } | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [categoryDropIndicator, setCategoryDropIndicator] = useState<{ categoryId: string; position: 'before' | 'after' } | null>(null);
  
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleDragStartRepo = useCallback((e: React.DragEvent<HTMLDivElement>, repo: Repository, sourceCategoryId: string | 'uncategorized') => {
    logger.debug('[DnD] Drag Start Repo', { repoId: repo.id, sourceCategoryId });
    const payload: RepositoryDragPayload = {
      type: 'repository-list',
      sourceInstanceId: instanceIdRef.current,
      sourceCategoryId,
      repoIds: [repo.id],
      repositories: [repo],
    };
    const serialized = JSON.stringify(payload);
    try {
      e.dataTransfer.setData(CROSS_INSTANCE_MIME, serialized);
    } catch (error) {
      logger.warn('[DnD] Failed to attach custom MIME payload', { error });
    }
    e.dataTransfer.setData('text/plain', serialized);
    e.dataTransfer.effectAllowed = 'copyMove';
    setDraggedRepo({ repoId: repo.id, sourceCategoryId });
    setDraggedCategoryId(null);
  }, [logger]);
  
  const handleDragStartCategory = useCallback((categoryId: string) => {
    logger.debug('[DnD] Drag Start Category', { categoryId });
    setDraggedCategoryId(categoryId);
    setDraggedRepo(null);
  }, [logger]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.types?.includes(CROSS_INSTANCE_MIME) && !draggedRepo && !draggedCategoryId) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }

    // This logic is only for showing the drop indicator between categories
    if (draggedCategoryId) {
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
  }, [draggedCategoryId, draggedRepo]);

  const handleDragLeave = useCallback(() => {
    setCategoryDropIndicator(null);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    logger.debug('[DnD] Drop event triggered');

    const serialized = e.dataTransfer.getData(CROSS_INSTANCE_MIME) || e.dataTransfer.getData('text/plain');
    let payload: RepositoryDragPayload | null = null;

    if (serialized) {
      try {
        const parsed = JSON.parse(serialized);
        if (parsed && parsed.type === 'repository-list' && Array.isArray(parsed.repoIds)) {
          payload = parsed as RepositoryDragPayload;
        }
      } catch (error) {
        logger.error('[DnD] Failed to parse DataTransfer payload', { error });
      }
    }

    if (!payload && draggedRepo) {
      payload = {
        type: 'repository-list',
        sourceInstanceId: instanceIdRef.current,
        sourceCategoryId: draggedRepo.sourceCategoryId,
        repoIds: [draggedRepo.repoId],
      };
    }

    if (payload && payload.repoIds.length > 0) {
      const draggedRepoId = payload.repoIds[0];
      const sourceCategoryId = payload.sourceCategoryId ?? 'uncategorized';
      let target: DropTarget | null = null;

      const dropElement = e.target as HTMLElement;
      let cardElement: HTMLElement | null = null;
      let categoryElement: HTMLElement | null = null;

      let current: HTMLElement | null = dropElement;
      while (current) {
        if (current.dataset.repoId && !cardElement) {
          cardElement = current;
        }
        if (current.dataset.categoryId && !categoryElement) {
          categoryElement = current;
        }
        if (cardElement && categoryElement) {
          break;
        }
        current = current.parentElement;
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
          position: 'end',
        };
      }

      if (target) {
        const isSameInstance = payload.sourceInstanceId === instanceIdRef.current || payload.repoIds.every(id => Boolean(reposById[id]));

        if (isSameInstance) {
          logger.debug('[DnD] Dispatching move action', { draggedRepoId, sourceCategoryId, target });
          onMoveRepositoryToCategory(draggedRepoId, sourceCategoryId, target);
        } else if (payload.repositories && payload.repositories.length > 0) {
          const imported = importRepositories(payload.repositories, target);
          if (imported.length > 0) {
            logger.info('[DnD] Imported repositories from external instance', { count: imported.length });
            setToast({
              message: imported.length === 1
                ? `Copied “${imported[0].name}” into this workspace.`
                : `Copied ${imported.length} repositories into this workspace.`,
              type: 'success',
            });
          } else {
            logger.warn('[DnD] Import returned no repositories');
          }
        } else {
          logger.warn('[DnD] Missing repository data for cross-instance drop');
        }
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
    setCategoryDropIndicator(null);
  }, [draggedRepo, draggedCategoryId, onMoveRepositoryToCategory, onReorderCategories, categoryDropIndicator, logger, importRepositories, setToast, reposById]);

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
                    onDragStart={(e) => handleDragStartRepo(e, repo, categoryId)}
                    onDragEnd={() => { setDraggedRepo(null); }}
                    isBeingDragged={isBeingDragged}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onContextMenu={(e) => props.onOpenContextMenu(e, repo)}
                    onMoveRepository={props.onMoveRepository}
                    isFirstInList={index === 0}
                    isLastInList={index === repoIds.length - 1}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
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
                    setToast={setToast}
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
    <div className="space-y-6" data-automation-id="dashboard-view">
      {categories.map((category, index) => {
        const categoryRepoIds = category.repositoryIds;
        const showDropIndicatorBefore = categoryDropIndicator?.categoryId === category.id && categoryDropIndicator.position === 'before';
        const showDropIndicatorAfter = categoryDropIndicator?.categoryId === category.id && categoryDropIndicator.position === 'after';
        const isBeingDragged = draggedCategoryId === category.id;
        const isDarkMode = settings.theme === 'dark';
        
        const categoryStyle = {
          backgroundColor: isDarkMode ? category.darkBackgroundColor : category.backgroundColor,
        };

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
              <div className="p-3 rounded-lg" style={categoryStyle}>
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
