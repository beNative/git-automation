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
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  
  // --- Drag & Drop State ---
  const [draggedItem, setDraggedItem] = useState<{ type: 'repo' | 'category'; id: string; sourceCategoryId: string | null } | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

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

  const handleToggleCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };
  
  // --- Drag & Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, item: { type: 'repo' | 'category', id: string, sourceCategoryId: string | null }) => {
    e.dataTransfer.setData(`application/json`, JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem(item);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string) => {
    if (draggedItem && draggedItem.id !== targetId) {
      setDropTargetId(targetId);
    }
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, dropTarget: { type: 'repo' | 'category', id: string }) => {
    e.preventDefault();
    if (!draggedItem) return;

    // --- REPO REORDERING & MOVING ---
    if (draggedItem.type === 'repo' && dropTarget.type === 'repo' && draggedItem.id !== dropTarget.id) {
      const draggedIndex = props.repositories.findIndex(r => r.id === draggedItem.id);
      const targetIndex = props.repositories.findIndex(r => r.id === dropTarget.id);
      if (draggedIndex === -1 || targetIndex === -1) return;
      
      const newRepos = [...props.repositories];
      const [removed] = newRepos.splice(draggedIndex, 1);
      newRepos.splice(targetIndex, 0, removed);
      props.setRepositories(newRepos);
    }

    // --- REPO TO CATEGORY ASSIGNMENT ---
    if (draggedItem.type === 'repo' && dropTarget.type === 'category') {
        const reposInCategory = categorizedRepos.get(dropTarget.id) || [];
        props.onMoveRepositoryToCategory(draggedItem.id, draggedItem.sourceCategoryId, dropTarget.id, reposInCategory.length);
    }
    
    // --- CATEGORY REORDERING ---
    if (draggedItem.type === 'category' && dropTarget.type === 'category' && draggedItem.id !== dropTarget.id) {
        const draggedIndex = props.categories.findIndex(c => c.id === draggedItem.id);
        const targetIndex = props.categories.findIndex(c => c.id === dropTarget.id);
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        const newCategories = [...props.categories];
        const [removed] = newCategories.splice(draggedIndex, 1);
        newCategories.splice(targetIndex, 0, removed);
        props.onSetCategories(newCategories);
    }
    
    handleDragEnd();
  };
  
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
  };
  
  const handleAddCategory = () => {
      props.onAddCategory('New Category');
  };

  // FIX: Removed wrapping div and passed drag/drop props directly to RepositoryCard to fix missing properties error.
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
          isDropTarget={dropTargetId === repo.id}
          onDragStart={(e, repoId) => handleDragStart(e, { type: 'repo', id: repoId, sourceCategoryId })}
          onDragEnd={handleDragEnd}
          setToast={props.setToast}
          onContextMenu={props.onOpenContextMenu}
          onRefreshRepoState={props.onRefreshRepoState}
          onDragOver={handleDragOver}
          onDragEnter={(e, repoId) => handleDragEnter(e, repoId)}
          onDragLeave={handleDragLeave}
          onDrop={(e, repoId) => handleDrop(e, { type: 'repo', id: repoId })}
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
        const isCollapsed = collapsedCategories[category.id] || false;
        return (
          <section 
            key={category.id} 
            aria-labelledby={`category-title-${category.id}`}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, category.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, { type: 'category', id: category.id })}
            className={`p-3 rounded-lg transition-all ${dropTargetId === category.id ? 'bg-blue-500/10 ring-2 ring-blue-500' : ''}`}
          >
            <CategoryHeader
              category={category}
              repoCount={repos.length}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => handleToggleCollapse(category.id)}
              onUpdateName={(name) => props.onUpdateCategory({ ...category, name })}
              onDelete={() => props.onDeleteCategory(category.id)}
              onDragStart={(e) => handleDragStart(e, { type: 'category', id: category.id, sourceCategoryId: null })}
              onDragEnd={handleDragEnd}
            />
            {!isCollapsed && (
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
        onDragOver={handleDragOver}
        onDrop={handleDropOnUncategorized}
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