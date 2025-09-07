import React, { useState, useMemo } from 'react';
import type { Repository, LocalPathState, DetailedStatus, BranchInfo, ToastMessage, Category } from '../types';
import RepositoryCard from './RepositoryCard';
import CategoryHeader from './CategoryHeader';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { PlusIcon } from './icons/PlusIcon';

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
  const { repositories, categories } = props;
  
  // --- Drag & Drop State ---
  const [draggedItem, setDraggedItem] = useState<{ type: 'repo' | 'category'; id: string; sourceCategoryId: string | null } | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ repoId: string; position: 'before' | 'after' } | null>(null);

  const { categorizedRepos, uncategorizedRepos } = useMemo(() => {
    const categorized = new Map<string, Repository[]>();
    const categorizedIds = new Set<string>();

    categories.forEach(cat => {
      const reposForCat = cat.repositoryIds
        .map(repoId => repositories.find(repo => repo.id === repoId))
        .filter((repo): repo is Repository => !!repo);
      
      categorized.set(cat.id, reposForCat);
      cat.repositoryIds.forEach(id => categorizedIds.add(id));
    });
    
    const uncategorized = repositories.filter(repo => !categorizedIds.has(repo.id));
    
    return { categorizedRepos: categorized, uncategorizedRepos: uncategorized };
  }, [repositories, categories]);

  // --- Drag & Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, item: { type: 'repo' | 'category', id: string, sourceCategoryId: string | null }) => {
    e.dataTransfer.setData(`application/json`, JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem(item);
  };
  
  const handleDragOver = (e: React.DragEvent, dropTarget: { type: 'repo' | 'category', id: string }) => {
    e.preventDefault();
    if (draggedItem?.type === 'repo' && dropTarget.type === 'repo' && draggedItem.id !== dropTarget.id) {
        const rect = e.currentTarget.getBoundingClientRect();
        const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        if (dropIndicator?.repoId !== dropTarget.id || dropIndicator?.position !== position) {
            setDropIndicator({ repoId: dropTarget.id, position });
        }
    }
    if (draggedItem?.type === 'category' && dropTarget.type === 'category') {
        setDropTargetId(dropTarget.id);
    }
  };

  const handleDragEnterCategory = (e: React.DragEvent, categoryId: string) => {
    if (draggedItem?.type === 'repo') {
        setDropTargetId(categoryId);
    }
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
    setDropTargetId(null);
  };

  const handleDropOnRepo = (e: React.DragEvent, dropTargetRepoId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== 'repo' || !dropIndicator) return;

    const { id: draggedRepoId, sourceCategoryId } = draggedItem;

    // Find target category based on the drop target repository
    let targetCategoryId: string | null = null;
    let targetCategoryRepos: Repository[] = uncategorizedRepos;
    for (const [catId, repos] of categorizedRepos.entries()) {
        if (repos.some(r => r.id === dropTargetRepoId)) {
            targetCategoryId = catId;
            targetCategoryRepos = repos;
            break;
        }
    }

    // Case 1: Reordering within the same list (either a category or uncategorized)
    if (sourceCategoryId === targetCategoryId) {
        if (sourceCategoryId === null) {
            // Reordering within "Uncategorized" list
            const categorizedIds = new Set(categories.flatMap(cat => cat.repositoryIds));
            const categorizedItems = repositories.filter(r => categorizedIds.has(r.id));
            let uncategorizedItems = repositories.filter(r => !categorizedIds.has(r.id));
            
            const draggedIndex = uncategorizedItems.findIndex(r => r.id === draggedRepoId);
            if (draggedIndex === -1) return;
            
            const [removed] = uncategorizedItems.splice(draggedIndex, 1);
            
            let targetIndexInUncategorized = uncategorizedItems.findIndex(r => r.id === dropTargetRepoId);
            if (dropIndicator.position === 'after') {
                targetIndexInUncategorized++;
            }
            
            uncategorizedItems.splice(targetIndexInUncategorized, 0, removed);
            props.setRepositories([...categorizedItems, ...uncategorizedItems]);

        } else {
            // Reordering within a specific category
            const category = props.categories.find(c => c.id === sourceCategoryId);
            if (!category) return;
            
            const newRepoIds = [...category.repositoryIds];
            const draggedIndex = newRepoIds.indexOf(draggedRepoId);
            if (draggedIndex === -1) return;

            const [removed] = newRepoIds.splice(draggedIndex, 1);

            let targetIndex = newRepoIds.indexOf(dropTargetRepoId);
            if (dropIndicator.position === 'after') {
                targetIndex++;
            }
            newRepoIds.splice(targetIndex, 0, removed);
            
            props.onUpdateCategory({ ...category, repositoryIds: newRepoIds });
        }
    } else {
        // Case 2: Moving between different lists
        let targetIndex = targetCategoryRepos.findIndex(r => r.id === dropTargetRepoId);
        if (dropIndicator.position === 'after') {
            targetIndex++;
        }
        props.onMoveRepositoryToCategory(draggedRepoId, sourceCategoryId, targetCategoryId, targetIndex);
    }
    
    handleDragEnd();
  };
  
  const handleDropOnCategory = (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== 'repo') return;

    const { id: draggedRepoId, sourceCategoryId } = draggedItem;
    const reposInCategory = categorizedRepos.get(targetCategoryId) || [];
    props.onMoveRepositoryToCategory(draggedRepoId, sourceCategoryId, targetCategoryId, reposInCategory.length);
    handleDragEnd();
  }

  const handleDropOnCategoryReorder = (e: React.DragEvent, dropTargetCategoryId: string) => {
    e.preventDefault();
    if (draggedItem?.type === 'category' && draggedItem.id !== dropTargetCategoryId) {
        const draggedIndex = props.categories.findIndex(c => c.id === draggedItem.id);
        const targetIndex = props.categories.findIndex(c => c.id === dropTargetCategoryId);
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        const newCategories = [...props.categories];
        const [removed] = newCategories.splice(draggedIndex, 1);
        newCategories.splice(targetIndex, 0, removed);
        props.onSetCategories(newCategories);
    }
    handleDragEnd();
  }

  const handleDropOnUncategorized = (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedItem?.type === 'repo') {
          props.onMoveRepositoryToCategory(draggedItem.id, draggedItem.sourceCategoryId, null, uncategorizedRepos.length);
      }
      handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTargetId(null);
    setDropIndicator(null);
  };
  
  const handleAddCategory = () => {
      props.onAddCategory('New Category');
  };

  const renderRepoCards = (repos: Repository[], sourceCategoryId: string | null) => (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(22rem,1fr))]">
      {repos.map(repo => (
        <RepositoryCard
          key={repo.id}
          repository={repo}
          onOpenTaskSelection={props.onOpenTaskSelection}
          onRunTask={props.onRunTask}
          onViewLogs={props.onViewLogs}
          onViewHistory={props.onViewHistory}
          onEditRepo={props.onEditRepo}
          onDeleteRepo={props.onDeleteRepo}
          isProcessing={props.isProcessing.has(repo.id)}
          localPathState={props.localPathStates[repo.id] || 'checking'}
          detailedStatus={props.detailedStatuses[repo.id] || null}
          branchInfo={props.branchLists[repo.id] || null}
          onSwitchBranch={props.onSwitchBranch}
          detectedExecutables={props.detectedExecutables[repo.id] || []}
          onCloneRepo={props.onCloneRepo}
          onChooseLocationAndClone={props.onChooseLocationAndClone}
          onRunLaunchConfig={props.onRunLaunchConfig}
          onOpenLaunchSelection={props.onOpenLaunchSelection}
          onOpenLocalPath={props.onOpenLocalPath}
          onOpenWeblink={props.onOpenWeblink}
          onOpenTerminal={props.onOpenTerminal}
          isBeingDragged={draggedItem?.type === 'repo' && repo.id === draggedItem.id}
          dropIndicatorPosition={dropIndicator?.repoId === repo.id ? dropIndicator.position : null}
          onDragStart={(e) => handleDragStart(e, { type: 'repo', id: repo.id, sourceCategoryId })}
          onDragEnd={handleDragEnd}
          setToast={props.setToast}
          onContextMenu={props.onOpenContextMenu}
          onRefreshRepoState={props.onRefreshRepoState}
          onDragOver={(e) => handleDragOver(e, { type: 'repo', id: repo.id })}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropOnRepo(e, repo.id)}
        />
      ))}
    </div>
  );

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
    <div className="space-y-6">
      {categories.map(category => {
        const repos = categorizedRepos.get(category.id) || [];
        return (
          <section 
            key={category.id} 
            aria-labelledby={`category-title-${category.id}`}
            style={{ backgroundColor: category.backgroundColor }}
            onDragOver={(e) => handleDragOver(e, { type: 'category', id: category.id })}
            onDragEnter={(e) => handleDragEnterCategory(e, category.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => draggedItem?.type === 'repo' ? handleDropOnCategory(e, category.id) : handleDropOnCategoryReorder(e, category.id)}
            className={`p-3 rounded-lg transition-all ${dropTargetId === category.id && !category.backgroundColor ? 'bg-blue-500/10' : ''} ${dropTargetId === category.id ? 'ring-2 ring-blue-500' : ''}`}
          >
            <CategoryHeader
              category={category}
              repoCount={repos.length}
              isCollapsed={category.collapsed ?? false}
              onToggleCollapse={() => props.onToggleCategoryCollapse(category.id)}
              onUpdate={(updates) => props.onUpdateCategory({ ...category, ...updates })}
              onDelete={() => props.onDeleteCategory(category.id)}
              onDragStart={(e) => handleDragStart(e, { type: 'category', id: category.id, sourceCategoryId: null })}
              onDragEnd={handleDragEnd}
            />
            {!(category.collapsed ?? false) && (
              <div className="mt-4">
                {repos.length > 0 ? renderRepoCards(repos, category.id) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Drag repositories here to add them to this category.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}

      <section 
        aria-labelledby="uncategorized-title"
        onDragOver={(e) => { e.preventDefault(); setDropTargetId('uncategorized'); }}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnUncategorized}
        className={`p-3 rounded-lg transition-all ${dropTargetId === 'uncategorized' ? 'bg-blue-500/10 ring-2 ring-blue-500' : ''}`}
      >
        <div className="flex items-center gap-2 py-2">
           <h2 id="uncategorized-title" className="text-xl font-bold text-gray-800 dark:text-gray-200">Uncategorized</h2>
           <span className="text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2.5 py-0.5">
             {uncategorizedRepos.length}
           </span>
        </div>
        <div className="mt-4">
          {renderRepoCards(uncategorizedRepos, null)}
        </div>
      </section>
      
      <div className="mt-6">
          <button onClick={handleAddCategory} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <PlusIcon className="h-5 w-5"/>
              <span className="font-semibold">Add Category</span>
          </button>
      </div>
    </div>
  );
};

export default Dashboard;