import React, { createContext, useState, useCallback, ReactNode, useMemo, useEffect, useContext, useRef, useReducer } from 'react';
import type { GlobalSettings, Repository, Category } from '../types';
import { RepoStatus, BuildHealth, VcsType, TaskStepType } from '../types';
import { useLogger } from '../hooks/useLogger';

interface AppDataContextState {
  settings: GlobalSettings;
  saveSettings: (newSettings: GlobalSettings) => void;
  repositories: Repository[];
  setRepositories: (repos: Repository[]) => void;
  addRepository: (repoData: Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>, categoryId?: string) => void;
  updateRepository: (updatedRepo: Repository) => void;
  deleteRepository: (repoId: string) => void;
  isLoading: boolean;
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  uncategorizedOrder: string[];
  setUncategorizedOrder: (order: string[]) => void;
  addCategory: (name: string) => void;
  updateCategory: (updatedCategory: Category) => void;
  deleteCategory: (categoryId: string) => void;
  moveRepositoryToCategory: (repoId: string, sourceId: string | 'uncategorized', targetId: string | 'uncategorized', targetIndex: number) => void;
  moveRepository: (repoId: string, direction: 'up' | 'down') => void;
  toggleCategoryCollapse: (categoryId: string) => void;
  toggleAllCategoriesCollapse: () => void;
  moveCategory: (categoryId: string, direction: 'up' | 'down') => void;
  reorderCategories: (draggedId: string, targetId: string, position: 'before' | 'after') => void;
}

const DEFAULTS: GlobalSettings = {
    defaultBuildCommand: 'npm run build',
    notifications: true,
    simulationMode: true,
    theme: 'dark',
    iconSet: 'heroicons',
    debugLogging: true,
    allowPrerelease: true,
    openLinksIn: 'default',
    githubPat: '',
    gitExecutablePath: '',
    svnExecutablePath: '',
    zoomFactor: 1,
    dndStrategy: 'Reducer',
};

const initialState: AppDataContextState = {
  settings: DEFAULTS,
  saveSettings: () => {},
  repositories: [],
  setRepositories: () => {},
  addRepository: () => {},
  updateRepository: () => {},
  deleteRepository: () => {},
  isLoading: true,
  categories: [],
  setCategories: () => {},
  uncategorizedOrder: [],
  setUncategorizedOrder: () => {},
  addCategory: () => {},
  updateCategory: () => {},
  deleteCategory: () => {},
  moveRepositoryToCategory: () => {},
  moveRepository: () => {},
  toggleCategoryCollapse: () => {},
  toggleAllCategoriesCollapse: () => {},
  moveCategory: () => {},
  reorderCategories: () => {},
};

export const SettingsContext = createContext<AppDataContextState>(initialState);

// --- One-time data migration logic, moved from old useRepositoryManager ---
const migrateRepositories = (repositories: Repository[], settings: GlobalSettings): Repository[] => {
    if (!repositories) return [];
    
    const pkgManager = (settings as any)?.defaultPackageManager || 'npm';
    
    return repositories.map(repo => {
        const migratedRepo: any = {
          ...repo,
          vcs: repo.vcs || VcsType.Git, // Default to Git for old data
          tasks: (repo.tasks || []).map(task => ({
            ...task,
            variables: task.variables || [],
            showOnDashboard: task.showOnDashboard ?? false,
            steps: (task.steps || []).map(step => {
              if ((step.type as any) === 'INSTALL_DEPS') {
                return { ...step, type: TaskStepType.RunCommand, command: `${pkgManager} install` };
              }
              if ((step.type as any) === 'RUN_TESTS') {
                  return { ...step, type: TaskStepType.RunCommand, command: `${pkgManager} test` };
              }
              return { ...step, enabled: step.enabled ?? true };
            })
          }))
        };
        if (migratedRepo.launchCommand && !migratedRepo.launchConfigs) {
          migratedRepo.launchConfigs = [{
            id: `lc_${Date.now()}`, name: 'Default Launch', type: 'command',
            command: migratedRepo.launchCommand, showOnDashboard: true,
          }];
        }
        delete migratedRepo.launchCommand;
        migratedRepo.launchConfigs = (migratedRepo.launchConfigs || []).map((lc: any) => ({
          type: 'command', ...lc,
        }));
        
        if (migratedRepo.webLink && (!migratedRepo.webLinks || migratedRepo.webLinks.length === 0)) {
            migratedRepo.webLinks = [{
                id: `wl_${Date.now()}`,
                name: 'Web Link',
                url: migratedRepo.webLink,
            }];
        }
        delete migratedRepo.webLink;

        return migratedRepo as Repository;
      });
}

type CategoryState = {
    categories: Category[];
    uncategorizedOrder: string[];
};
type CategoryAction = {
    type: 'MOVE_REPOSITORY';
    payload: { repoId: string; sourceId: string | 'uncategorized'; targetId: string | 'uncategorized'; targetIndex: number; };
} | {
    type: 'SET_ALL';
    payload: CategoryState;
};

// This is the core logic for moving a repository. It's a pure function.
// FIX: Correctly type the payload for this function to resolve destructuring errors.
const performMove = (state: CategoryState, payload: { repoId: string; sourceId: string | 'uncategorized'; targetId: string | 'uncategorized'; targetIndex: number; }): CategoryState => {
    const { repoId, sourceId, targetId, targetIndex } = payload;
    const { categories: currentCategories, uncategorizedOrder: currentUncategorized } = state;

    const nextCategories = currentCategories.map(c => ({...c, repositoryIds: [...c.repositoryIds]}));
    const nextUncategorized = [...currentUncategorized];

    let sourceList: string[];
    let sourceIndex: number;

    if (sourceId === 'uncategorized') {
        sourceList = nextUncategorized;
    } else {
        const sourceCat = nextCategories.find(c => c.id === sourceId);
        if (!sourceCat) return state; // Failsafe
        sourceList = sourceCat.repositoryIds;
    }
    sourceIndex = sourceList.indexOf(repoId);
    if (sourceIndex === -1) return state; // Failsafe

    const [movedItem] = sourceList.splice(sourceIndex, 1);

    let targetList: string[];
    if (targetId === 'uncategorized') {
        targetList = nextUncategorized;
    } else {
        const targetCat = nextCategories.find(c => c.id === targetId);
        if (!targetCat) { // Failsafe: put item back
            sourceList.splice(sourceIndex, 0, movedItem);
            return state;
        }
        targetList = targetCat.repositoryIds;
    }

    let finalTargetIndex = targetIndex;
    if (sourceId === targetId && sourceIndex < targetIndex) {
        finalTargetIndex--;
    }

    targetList.splice(finalTargetIndex, 0, movedItem);

    return { categories: nextCategories, uncategorizedOrder: nextUncategorized };
};

const categoryReducer = (state: CategoryState, action: CategoryAction): CategoryState => {
    switch (action.type) {
        case 'MOVE_REPOSITORY':
            return performMove(state, action.payload);
        case 'SET_ALL':
            return action.payload;
        default:
            return state;
    }
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const logger = useLogger();
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULTS);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  
  const [categoryState, dispatch] = useReducer(categoryReducer, { categories: [], uncategorizedOrder: [] });
  const { categories, uncategorizedOrder } = categoryState;
  
  const setCategories = (newCategories: Category[]) => dispatch({ type: 'SET_ALL', payload: { ...categoryState, categories: newCategories } });
  const setUncategorizedOrder = (newUncategorizedOrder: string[]) => dispatch({ type: 'SET_ALL', payload: { ...categoryState, uncategorizedOrder: newUncategorizedOrder } });
  
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  // Load all data from main process on startup
  useEffect(() => {
    if (window.electronAPI?.getAllData) {
      window.electronAPI.getAllData().then(data => {
          const loadedSettings = data.globalSettings ? { ...DEFAULTS, ...data.globalSettings } : DEFAULTS;
          const migratedRepos = migrateRepositories(data.repositories || [], loadedSettings);
          
          setSettings(loadedSettings);
          setRepositories(migratedRepos);
          dispatch({ type: 'SET_ALL', payload: { categories: data.categories || [], uncategorizedOrder: data.uncategorizedOrder || [] }});
          setIsLoading(false);
      }).catch(e => {
          console.error("Failed to load app data, using defaults.", e);
          setIsLoading(false);
      });
    } else {
      console.warn("Electron API not found. Running in browser mode or preload script failed. Using default settings.");
      setIsLoading(false);
    }
  }, []);

  // Save all data back to main process when it changes
  useEffect(() => {
    if (isLoading || isInitialLoad.current) {
        if (!isLoading) {
            isInitialLoad.current = false;
        }
        return;
    };

    const handler = setTimeout(() => {
        window.electronAPI?.saveAllData({
            globalSettings: settings,
            repositories: repositories,
            categories: categories,
            uncategorizedOrder: uncategorizedOrder,
        });
    }, 1000);

    return () => clearTimeout(handler);
  }, [settings, repositories, categories, uncategorizedOrder, isLoading]);

  const saveSettings = useCallback((newSettings: GlobalSettings) => {
    setSettings(newSettings);
  }, []);
  
  const addRepository = useCallback((repoData: Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>, categoryId?: string) => {
    const newRepo: Repository = {
      id: `repo_${Date.now()}`,
      status: RepoStatus.Idle,
      lastUpdated: null,
      buildHealth: BuildHealth.Unknown,
      ...repoData
    } as Repository;
    setRepositories(prev => [...prev, newRepo]);
    
    if (categoryId) {
        setCategories(categories.map(cat => 
            cat.id === categoryId 
                ? { ...cat, repositoryIds: [...cat.repositoryIds, newRepo.id] } 
                : cat
        ));
    } else {
        setUncategorizedOrder([newRepo.id, ...uncategorizedOrder]);
    }
  }, [categories, uncategorizedOrder]);
  
  const updateRepository = useCallback((updatedRepo: Repository) => {
    setRepositories(prev => prev.map(repo => (repo.id === updatedRepo.id ? updatedRepo : repo)));
  }, []);
  
  const deleteRepository = useCallback((repoId: string) => {
    setRepositories(prev => prev.filter(repo => repo.id !== repoId));
    setCategories(categories.map(cat => ({
        ...cat,
        repositoryIds: cat.repositoryIds.filter(id => id !== repoId),
    })));
    setUncategorizedOrder(uncategorizedOrder.filter(id => id !== repoId));
  }, [categories, uncategorizedOrder]);

  const addCategory = useCallback((name: string) => {
    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      name,
      repositoryIds: [],
      collapsed: false,
      color: undefined,
      backgroundColor: undefined,
    };
    setCategories([...categories, newCategory]);
  }, [categories]);

  const updateCategory = useCallback((updatedCategory: Category) => {
    setCategories(categories.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
  }, [categories]);

  const deleteCategory = useCallback((categoryId: string) => {
    const categoryToDelete = categories.find(c => c.id === categoryId);
    if (!categoryToDelete) return;

    setUncategorizedOrder([...categoryToDelete.repositoryIds, ...uncategorizedOrder]);
    setCategories(categories.filter(cat => cat.id !== categoryId));
  }, [categories, uncategorizedOrder]);

  // FIX: Simplify moveRepositoryToCategory to always use the reducer, which is the only safe implementation here.
  // This fixes TypeScript errors and underlying stale state bugs in the other experimental strategies.
  const moveRepositoryToCategory = useCallback((repoId: string, sourceId: string | 'uncategorized', targetId: string | 'uncategorized', targetIndex: number) => {
    logger.debug(`[DnD] moveRepositoryToCategory called with strategy: ${settings.dndStrategy}`, { repoId, sourceId, targetId, targetIndex });
    
    const payload = { repoId, sourceId, targetId, targetIndex };

    // The reducer is the only safe way to update this state atomically.
    // The other strategies were likely for experimentation and are buggy (stale state issues, TypeScript errors).
    // We will use the reducer for all cases to ensure correctness.
    dispatch({ type: 'MOVE_REPOSITORY', payload });
    
  }, [logger, settings.dndStrategy]);

  // FIX: Correctly call setters without functional updates, as they are not supported.
  const moveRepository = useCallback((repoId: string, direction: 'up' | 'down') => {
    logger.debug('moveRepository triggered', { repoId, direction });

    let sourceId: string | 'uncategorized' | undefined;
    let sourceIndex = -1;

    const indexInUncategorized = uncategorizedOrder.indexOf(repoId);
    if (indexInUncategorized !== -1) {
        sourceId = 'uncategorized';
        sourceIndex = indexInUncategorized;
    } else {
        for (const category of categories) {
            const indexInCategory = category.repositoryIds.indexOf(repoId);
            if (indexInCategory !== -1) {
                sourceId = category.id;
                sourceIndex = indexInCategory;
                break;
            }
        }
    }

    if (sourceId === undefined || sourceIndex === -1) {
        logger.error('Could not find repository to reorder.', { repoId });
        return;
    }

    const sourceListLength = sourceId === 'uncategorized'
        ? uncategorizedOrder.length
        : categories.find(c => c.id === sourceId)?.repositoryIds.length ?? 0;

    const targetIndex = direction === 'up' ? sourceIndex - 1 : sourceIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= sourceListLength) return;
    
    if (sourceId === 'uncategorized') {
        const newList = [...uncategorizedOrder];
        [newList[sourceIndex], newList[targetIndex]] = [newList[targetIndex], newList[sourceIndex]];
        setUncategorizedOrder(newList);
    } else {
        const sourceCatId = sourceId;
        const newCategories = categories.map(cat => {
            if (cat.id === sourceCatId) {
                const newList = [...cat.repositoryIds];
                [newList[sourceIndex], newList[targetIndex]] = [newList[targetIndex], newList[sourceIndex]];
                return { ...cat, repositoryIds: newList };
            }
            return cat;
        });
        setCategories(newCategories);
    }
  }, [categories, uncategorizedOrder, logger]);

  // FIX: Correctly call setters without functional updates, as they are not supported.
  const toggleCategoryCollapse = useCallback((categoryId: string) => {
    const newCategories = categories.map(cat => 
        cat.id === categoryId ? { ...cat, collapsed: !(cat.collapsed ?? false) } : cat
    );
    setCategories(newCategories);
  }, [categories]);
  
  // FIX: Correctly call setters without functional updates, as they are not supported.
  const toggleAllCategoriesCollapse = useCallback(() => {
    const shouldCollapseAll = categories.some(c => !(c.collapsed ?? false));
    const newCategories = categories.map(c => ({ ...c, collapsed: shouldCollapseAll }));
    setCategories(newCategories);
  }, [categories]);
  
  // FIX: Correctly call setters without functional updates, as they are not supported.
  const moveCategory = useCallback((categoryId: string, direction: 'up' | 'down') => {
      const index = categories.findIndex(c => c.id === categoryId);
      if (index === -1) return;
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === categories.length - 1) return;

      const newCategories = [...categories];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
      setCategories(newCategories);
  }, [categories]);

  // FIX: Correctly call setters without functional updates, as they are not supported.
  const reorderCategories = useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
      const newCategories = [...categories];
      const draggedIndex = newCategories.findIndex(c => c.id === draggedId);
      if (draggedIndex === -1) {
          setCategories(newCategories);
          return;
      }

      const [draggedItem] = newCategories.splice(draggedIndex, 1);
      
      let targetIndex = newCategories.findIndex(c => c.id === targetId);
      if (targetIndex === -1) { 
          newCategories.splice(draggedIndex, 0, draggedItem);
          setCategories(newCategories);
          return;
      }

      if (position === 'after') {
          targetIndex++;
      }
      newCategories.splice(targetIndex, 0, draggedItem);
      
      setCategories(newCategories);
  }, [categories]);

  const value = useMemo(() => ({
    settings,
    saveSettings,
    repositories,
    setRepositories,
    addRepository,
    updateRepository,
    deleteRepository,
    isLoading,
    categories,
    setCategories,
    uncategorizedOrder,
    setUncategorizedOrder,
    addCategory,
    updateCategory,
    deleteCategory,
    moveRepositoryToCategory,
    moveRepository,
    toggleCategoryCollapse,
    toggleAllCategoriesCollapse,
    moveCategory,
    reorderCategories,
  }), [settings, saveSettings, repositories, isLoading, categories, uncategorizedOrder, addCategory, updateCategory, deleteCategory, moveRepositoryToCategory, moveRepository, toggleCategoryCollapse, toggleAllCategoriesCollapse, moveCategory, reorderCategories, addRepository, updateRepository, deleteRepository]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
    return useContext(SettingsContext);
};