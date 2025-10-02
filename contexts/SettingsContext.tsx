import React, { createContext, useState, useCallback, ReactNode, useMemo, useEffect, useContext, useRef, useReducer } from 'react';
// FIX: Import DropTarget type for DnD operations.
import type { GlobalSettings, Repository, Category, DropTarget } from '../types';
import { RepoStatus, BuildHealth, VcsType, TaskStepType } from '../types';
import { MIN_AUTO_CHECK_INTERVAL_SECONDS, MAX_AUTO_CHECK_INTERVAL_SECONDS } from '../constants';
import { createDefaultKeyboardShortcutSettings, mergeKeyboardShortcutSettings } from '../keyboardShortcuts';

interface AppDataContextState {
  settings: GlobalSettings;
  saveSettings: (newSettings: GlobalSettings) => void;
  repositories: Repository[];
  addRepository: (repoData: Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>, categoryId?: string) => void;
  updateRepository: (updatedRepo: Repository) => void;
  deleteRepository: (repoId: string) => void;
  isLoading: boolean;
  categories: Category[];
  uncategorizedOrder: string[];
  addCategory: (name: string) => void;
  updateCategory: (updatedCategory: Category) => void;
  deleteCategory: (categoryId: string) => void;
  // FIX: Update signature to use DropTarget object for atomic updates.
  moveRepositoryToCategory: (repoId: string, sourceId: string | 'uncategorized', target: DropTarget) => void;
  moveRepository: (repoId: string, direction: 'up' | 'down') => void;
  toggleCategoryCollapse: (categoryId: string) => void;
  toggleAllCategoriesCollapse: () => void;
  moveCategory: (categoryId: string, direction: 'up' | 'down') => void;
  reorderCategories: (draggedId: string, targetId: string, position: 'before' | 'after') => void;
}

// FIX: Add missing properties `saveTaskLogs` and `taskLogPath` to align with the GlobalSettings type.
const DEFAULTS: GlobalSettings = {
    defaultBuildCommand: 'npm run build',
    notifications: true,
    simulationMode: true,
    theme: 'dark',
    iconSet: 'feather',
    debugLogging: true,
    allowPrerelease: true,
    openLinksIn: 'default',
    githubPat: '',
    gitExecutablePath: '',
    svnExecutablePath: '',
    zoomFactor: 1,
    saveTaskLogs: true,
    taskLogPath: '',
    autoCheckRepoUpdates: false,
    repoUpdateCheckInterval: 1800,
    repoUpdateCheckIntervalUnit: 'seconds',
    keyboardShortcuts: createDefaultKeyboardShortcutSettings(),
};

const clampRepoUpdateInterval = (value: number) =>
  Math.max(
    MIN_AUTO_CHECK_INTERVAL_SECONDS,
    Math.min(MAX_AUTO_CHECK_INTERVAL_SECONDS, Math.round(value || 0)),
  );

const initialState: AppDataContextState = {
  settings: DEFAULTS,
  saveSettings: () => {},
  repositories: [],
  addRepository: () => {},
  updateRepository: () => {},
  deleteRepository: () => {},
  isLoading: true,
  categories: [],
  uncategorizedOrder: [],
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

// FIX: Centralize all category/order state mutations into a robust reducer.
type CategoryState = {
    categories: Category[];
    uncategorizedOrder: string[];
};

type CategoryAction = 
  | { type: 'SET_ALL_DATA'; payload: { categories: Category[]; uncategorizedOrder: string[] } }
  | { type: 'MOVE_REPOSITORY_DND'; payload: { repoId: string; sourceId: string | 'uncategorized'; target: DropTarget } }
  | { type: 'MOVE_REPOSITORY_BUTTONS'; payload: { repoId: string; direction: 'up' | 'down' } }
  | { type: 'ADD_REPOSITORY'; payload: { repoId: string; categoryId?: string } }
  | { type: 'DELETE_REPOSITORY'; payload: { repoId: string } }
  | { type: 'ADD_CATEGORY'; payload: { name: string } }
  | { type: 'UPDATE_CATEGORY'; payload: { category: Category } }
  | { type: 'DELETE_CATEGORY'; payload: { categoryId: string } }
  | { type: 'TOGGLE_CATEGORY_COLLAPSE'; payload: { categoryId: string } }
  | { type: 'TOGGLE_ALL_CATEGORIES_COLLAPSE' }
  | { type: 'MOVE_CATEGORY'; payload: { categoryId: string; direction: 'up' | 'down' } }
  | { type: 'REORDER_CATEGORIES'; payload: { draggedId: string; targetId: string; position: 'before' | 'after' } };


const categoryReducer = (state: CategoryState, action: CategoryAction): CategoryState => {
    // Create deep copies for mutation to ensure state is immutable.
    const nextState: CategoryState = {
      categories: state.categories.map(c => ({ ...c, repositoryIds: [...c.repositoryIds] })),
      uncategorizedOrder: [...state.uncategorizedOrder]
    };

    switch (action.type) {
        case 'SET_ALL_DATA':
            return action.payload;

        case 'MOVE_REPOSITORY_DND': {
            const { repoId, sourceId, target } = action.payload;
            const { repoId: targetRepoId, categoryId: targetCategoryId, position } = target;

            // 1. Find and remove the item from its source list
            let movedItem: string | undefined;
            if (sourceId === 'uncategorized') {
                const sourceIndex = nextState.uncategorizedOrder.indexOf(repoId);
                if (sourceIndex > -1) [movedItem] = nextState.uncategorizedOrder.splice(sourceIndex, 1);
            } else {
                const sourceCat = nextState.categories.find(c => c.id === sourceId);
                if (sourceCat) {
                    const sourceIndex = sourceCat.repositoryIds.indexOf(repoId);
                    if (sourceIndex > -1) [movedItem] = sourceCat.repositoryIds.splice(sourceIndex, 1);
                }
            }

            if (!movedItem) return state; // Failsafe: if item not found, abort.

            // 2. Find the target list and calculate the target index
            if (targetCategoryId === 'uncategorized') {
                let index = nextState.uncategorizedOrder.length;
                if (targetRepoId && position !== 'end') {
                    const idx = nextState.uncategorizedOrder.indexOf(targetRepoId);
                    if (idx > -1) index = (position === 'after' ? idx + 1 : idx);
                }
                nextState.uncategorizedOrder.splice(index, 0, movedItem);
            } else {
                const targetCat = nextState.categories.find(c => c.id === targetCategoryId);
                if (targetCat) {
                    let index = targetCat.repositoryIds.length;
                    if (targetRepoId && position !== 'end') {
                        const idx = targetCat.repositoryIds.indexOf(targetRepoId);
                        if (idx > -1) index = (position === 'after' ? idx + 1 : idx);
                    }
                    targetCat.repositoryIds.splice(index, 0, movedItem);
                } else {
                    nextState.uncategorizedOrder.push(movedItem); // Failsafe: drop into uncategorized
                }
            }
            return nextState;
        }

        case 'ADD_REPOSITORY': {
            const { repoId, categoryId } = action.payload;
            if (categoryId) {
                const cat = nextState.categories.find(c => c.id === categoryId);
                if (cat) cat.repositoryIds.push(repoId);
            } else {
                nextState.uncategorizedOrder.unshift(repoId);
            }
            return nextState;
        }

        case 'DELETE_REPOSITORY': {
            const { repoId } = action.payload;
            nextState.uncategorizedOrder = nextState.uncategorizedOrder.filter(id => id !== repoId);
            nextState.categories.forEach(cat => {
                cat.repositoryIds = cat.repositoryIds.filter(id => id !== repoId);
            });
            return nextState;
        }

        case 'ADD_CATEGORY': {
            const newCategory: Category = {
                id: `cat_${Date.now()}`,
                name: action.payload.name,
                repositoryIds: [],
                collapsed: false,
            };
            nextState.categories.push(newCategory);
            return nextState;
        }

        case 'UPDATE_CATEGORY': {
             nextState.categories = nextState.categories.map(c => c.id === action.payload.category.id ? action.payload.category : c);
             return nextState;
        }

        case 'DELETE_CATEGORY': {
            const { categoryId } = action.payload;
            const categoryToDelete = state.categories.find(c => c.id === categoryId);
            if (!categoryToDelete) return state;

            nextState.uncategorizedOrder.unshift(...categoryToDelete.repositoryIds);
            nextState.categories = nextState.categories.filter(c => c.id !== categoryId);
            return nextState;
        }

        case 'MOVE_REPOSITORY_BUTTONS': {
            // Find which list the repo is in
            const { repoId, direction } = action.payload;
            let list: string[] | undefined;
            const uncategorizedIndex = state.uncategorizedOrder.indexOf(repoId);

            if (uncategorizedIndex > -1) {
                list = nextState.uncategorizedOrder;
                const targetIndex = direction === 'up' ? uncategorizedIndex - 1 : uncategorizedIndex + 1;
                if (targetIndex >= 0 && targetIndex < list.length) {
                    [list[uncategorizedIndex], list[targetIndex]] = [list[targetIndex], list[uncategorizedIndex]];
                }
            } else {
                for (const category of nextState.categories) {
                    const catIndex = category.repositoryIds.indexOf(repoId);
                    if (catIndex > -1) {
                        list = category.repositoryIds;
                        const targetIndex = direction === 'up' ? catIndex - 1 : catIndex + 1;
                        if (targetIndex >= 0 && targetIndex < list.length) {
                             [list[catIndex], list[targetIndex]] = [list[targetIndex], list[catIndex]];
                        }
                        break;
                    }
                }
            }
            return nextState;
        }

        case 'TOGGLE_CATEGORY_COLLAPSE': {
             nextState.categories = nextState.categories.map(c => c.id === action.payload.categoryId ? { ...c, collapsed: !(c.collapsed ?? false) } : c);
             return nextState;
        }

        case 'TOGGLE_ALL_CATEGORIES_COLLAPSE': {
            const shouldCollapse = state.categories.some(c => !(c.collapsed ?? false));
            nextState.categories = nextState.categories.map(c => ({ ...c, collapsed: shouldCollapse }));
            return nextState;
        }
        
        case 'MOVE_CATEGORY': {
            const { categoryId, direction } = action.payload;
            const index = state.categories.findIndex(c => c.id === categoryId);
            if (index === -1) return state;

            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= state.categories.length) return state;
            
            [nextState.categories[index], nextState.categories[targetIndex]] = [nextState.categories[targetIndex], nextState.categories[index]];
            return nextState;
        }
        
        case 'REORDER_CATEGORIES': {
            const { draggedId, targetId, position } = action.payload;
            const draggedIndex = state.categories.findIndex(c => c.id === draggedId);
            if (draggedIndex === -1) return state;

            const [draggedItem] = nextState.categories.splice(draggedIndex, 1);
            let targetIndex = nextState.categories.findIndex(c => c.id === targetId);
            
            if (targetIndex === -1) { // Failsafe
                nextState.categories.splice(draggedIndex, 0, draggedItem);
                return nextState;
            }
            
            if (position === 'after') targetIndex++;
            nextState.categories.splice(targetIndex, 0, draggedItem);
            return nextState;
        }

        default:
            return state;
    }
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULTS);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  
  // FIX: Use a single reducer for all category/order state.
  const [categoryState, dispatch] = useReducer(categoryReducer, { categories: [], uncategorizedOrder: [] });
  const { categories, uncategorizedOrder } = categoryState;
  
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  // Load all data from main process on startup
  useEffect(() => {
    if (window.electronAPI?.getAllData) {
      window.electronAPI.getAllData().then(data => {
          const loadedSettings = data.globalSettings
            ? { ...DEFAULTS, ...data.globalSettings }
            : { ...DEFAULTS, keyboardShortcuts: createDefaultKeyboardShortcutSettings() };
          loadedSettings.keyboardShortcuts = mergeKeyboardShortcutSettings(
            data.globalSettings?.keyboardShortcuts ?? loadedSettings.keyboardShortcuts,
          );

          const hasSecondsUnit = !!data.globalSettings && 'repoUpdateCheckIntervalUnit' in data.globalSettings;
          if (!hasSecondsUnit && data.globalSettings?.repoUpdateCheckInterval !== undefined) {
            loadedSettings.repoUpdateCheckInterval = clampRepoUpdateInterval(
              loadedSettings.repoUpdateCheckInterval * 60,
            );
          } else {
            loadedSettings.repoUpdateCheckInterval = clampRepoUpdateInterval(
              loadedSettings.repoUpdateCheckInterval,
            );
          }
          loadedSettings.repoUpdateCheckIntervalUnit = 'seconds';
          const migratedRepos = migrateRepositories(data.repositories || [], loadedSettings);
          
          setSettings(loadedSettings);
          setRepositories(migratedRepos);
          // FIX: Dispatch a single action to set initial state atomically.
          dispatch({ type: 'SET_ALL_DATA', payload: { categories: data.categories || [], uncategorizedOrder: data.uncategorizedOrder || [] }});
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
    setSettings(prev => ({
      ...prev,
      ...newSettings,
      repoUpdateCheckInterval: clampRepoUpdateInterval(newSettings.repoUpdateCheckInterval),
      repoUpdateCheckIntervalUnit: 'seconds',
    }));
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
    dispatch({ type: 'ADD_REPOSITORY', payload: { repoId: newRepo.id, categoryId } });
  }, []);
  
  const updateRepository = useCallback((updatedRepo: Repository) => {
    setRepositories(prev => prev.map(repo => (repo.id === updatedRepo.id ? updatedRepo : repo)));
  }, []);
  
  const deleteRepository = useCallback((repoId: string) => {
    setRepositories(prev => prev.filter(repo => repo.id !== repoId));
    dispatch({ type: 'DELETE_REPOSITORY', payload: { repoId } });
  }, []);

  const addCategory = useCallback((name: string) => {
    dispatch({ type: 'ADD_CATEGORY', payload: { name } });
  }, []);

  const updateCategory = useCallback((updatedCategory: Category) => {
    dispatch({ type: 'UPDATE_CATEGORY', payload: { category: updatedCategory } });
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: { categoryId } });
  }, []);

  // FIX: Refactor moveRepositoryToCategory to dispatch an action to the central reducer.
  const moveRepositoryToCategory = useCallback((repoId: string, sourceId: string | 'uncategorized', target: DropTarget) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[DnD] Dispatching MOVE_REPOSITORY_DND', { repoId, sourceId, target });
    }
    dispatch({ type: 'MOVE_REPOSITORY_DND', payload: { repoId, sourceId, target } });
  }, []);

  const moveRepository = useCallback((repoId: string, direction: 'up' | 'down') => {
    dispatch({ type: 'MOVE_REPOSITORY_BUTTONS', payload: { repoId, direction } });
  }, []);

  const toggleCategoryCollapse = useCallback((categoryId: string) => {
    dispatch({ type: 'TOGGLE_CATEGORY_COLLAPSE', payload: { categoryId } });
  }, []);
  
  const toggleAllCategoriesCollapse = useCallback(() => {
    dispatch({ type: 'TOGGLE_ALL_CATEGORIES_COLLAPSE' });
  }, []);
  
  const moveCategory = useCallback((categoryId: string, direction: 'up' | 'down') => {
    dispatch({ type: 'MOVE_CATEGORY', payload: { categoryId, direction } });
  }, []);

  const reorderCategories = useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
    dispatch({ type: 'REORDER_CATEGORIES', payload: { draggedId, targetId, position } });
  }, []);

  const value = useMemo(() => ({
    settings,
    saveSettings,
    repositories,
    addRepository,
    updateRepository,
    deleteRepository,
    isLoading,
    categories,
    uncategorizedOrder,
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
