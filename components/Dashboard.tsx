import React, { useState, useCallback } from 'react';
import type { Repository, Category, LocalPathState, DetailedStatus, BranchInfo, ToastMessage } from '../types';
import RepositoryCard from './RepositoryCard';
import CategoryHeader from './CategoryHeader';
import { PlusIcon } from './icons/PlusIcon';

// Define props based on App.tsx usage
interface DashboardProps {
  repositories: Repository[];
  setRepositories: (repos: Repository[]) => void;
  categories: Category[];
  onAddCategory: (name: string) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onSetCategories: (categories: Category[]) => void;
  onMoveRepositoryToCategory: (repoId: string, sourceCategoryId: string | null, targetCategoryId: string | null, targetIndex: number) => void;
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
    onAddCategory, 
    onMoveRepositoryToCategory 
  } = props;

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
    if (!draggedRepo || draggedRepo.repoId === repoId) {
        setDropIndicator(null);
        return;
    }
    
    const targetElement = e.currentTarget;
    const rect = targetElement.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

    setDropIndicator({ categoryId, repoId, position });
  }, [draggedRepo]);

  const handleDragLeave = useCallback(() => {
    // A small timeout helps prevent flickering when moving between elements
    setTimeout(() => setDropIndicator(null), 100);
  }, []);
  
  const handleDrop = useCallback((targetCategoryId: string | null, targetRepoId: string | null) => {
    if (!draggedRepo) return;
  
    let targetIndex = -1;
    const targetCategory = categories.find(c => c.id === targetCategoryId);
    const targetRepoIds = targetCategory ? targetCategory.repositoryIds : repositories.filter(r => !categories.some(c => c.repositoryIds.includes(r.id))).map(r => r.id);
  
    if (targetRepoId) {
      const idx = targetRepoIds.indexOf(targetRepoId);
      if (dropIndicator?.position === 'after') {
        targetIndex = idx + 1;
      } else {
        targetIndex = idx;
      }
    } else {
      // Dropped on a category header or empty uncategorized area
      targetIndex = targetRepoIds.length;
    }
  
    onMoveRepositoryToCategory(draggedRepo.repoId, draggedRepo.sourceCategoryId, targetCategoryId, targetIndex);
    setDraggedRepo(null);
    setDropIndicator(null);
  }, [draggedRepo, categories, repositories, onMoveRepositoryToCategory, dropIndicator]);


  const getReposForCategory = (categoryId: string | null): Repository[] => {
    if (categoryId === null) { // Uncategorized
      const categorizedRepoIds = new Set(categories.flatMap(c => c.repositoryIds));
      return repositories.filter(repo => !categorizedRepoIds.has(repo.id));
    }
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [];
    
    // Map IDs to actual repo objects, preserving order.
    return category.repositoryIds
      .map(id => repositories.find(repo => repo.id === id))
      .filter((repo): repo is Repository => repo !== undefined);
  };
  
  const renderRepoList = (repos: Repository[], categoryId: string | null) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {repos.map((repo) => {
            const isBeingDragged = draggedRepo?.repoId === repo.id;
            const indicator = dropIndicator?.repoId === repo.id ? dropIndicator : null;
            return (
                <RepositoryCard
                    key={repo.id}
                    repository={repo}
                    isProcessing={props.isProcessing.has(repo.id)}
                    localPathState={props.localPathStates[repo.id] || 'checking'}
                    detailedStatus={props.detailedStatuses[repo.id] || null}
                    branchInfo={props.branchLists[repo.id] || null}
                    detectedExecutables={props.detectedExecutables[repo.id] || []}
                    onDragStart={() => handleDragStart(repo.id, categoryId)}
                    onDragOver={(e) => handleDragOver(e, categoryId, repo.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(categoryId, repo.id)}
                    onDragEnd={() => { setDraggedRepo(null); setDropIndicator(null); }}
                    isBeingDragged={isBeingDragged}
                    dropIndicatorPosition={indicator ? indicator.position : null}
                    // Pass all other props down
                    {...props}
                />
            );
        })}
    </div>
  );

  const uncategorizedRepos = getReposForCategory(null);

  return (
    <div className="space-y-6">
      {categories.map(category => {
        const categoryRepos = getReposForCategory(category.id);
        return (
          <div key={category.id}>
            <CategoryHeader 
                category={category}
                repoCount={categoryRepos.length}
                onUpdate={props.onUpdateCategory}
                onDelete={props.onDeleteCategory}
                onToggleCollapse={props.onToggleCategoryCollapse}
                onDragOver={(e) => handleDragOver(e, category.id, null)}
                onDrop={() => handleDrop(category.id, null)}
            />
            {!(category.collapsed ?? false) && (
              <div className="mt-3">
                {renderRepoList(categoryRepos, category.id)}
                {categoryRepos.length === 0 && (
                  <div 
                    className="p-6 text-center text-gray-500 border-2 border-dashed rounded-lg"
                    onDragOver={(e) => handleDragOver(e, category.id, null)}
                    onDrop={() => handleDrop(category.id, null)}
                  >
                    Drag repositories here to add them to this category.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div>
        <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-3">Uncategorized</h2>
        {renderRepoList(uncategorizedRepos, null)}
        {uncategorizedRepos.length === 0 && (
          <div 
            className="p-6 text-center text-gray-500 border-2 border-dashed rounded-lg"
            onDragOver={(e) => handleDragOver(e, null, null)}
            onDrop={() => handleDrop(null, null)}
          >
            No uncategorized repositories.
          </div>
        )}
      </div>

      <div className="mt-6">
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
