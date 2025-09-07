import React, { createContext, useState, useCallback, ReactNode, useMemo, useEffect, useContext, useRef } from 'react';
import type { GlobalSettings, Repository, Category } from '../types';
import { RepoStatus, BuildHealth, VcsType, TaskStepType } from '../types';
import { useLogger } from '../hooks/useLogger';

interface AppDataContextState {
  settings: GlobalSettings;
  saveSettings: (newSettings: GlobalSettings) => void;
  repositories: Repository[];
  setRepositories: (repos: Repository[]) => void;
  addRepository: (repoData: Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>) => void;
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
  toggleCategoryCollapse: (categoryId: string) => void;
  toggleAllCategoriesCollapse: () => void;
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
  toggleCategoryCollapse: () => {},
  toggleAllCategoriesCollapse: () => {},
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


export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const logger = useLogger();
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULTS);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uncategorizedOrder, setUncategorizedOrder] = useState<string[]>([]);
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
          setCategories(data.categories || []);
          setUncategorizedOrder(data.uncategorizedOrder || []); // Load the new order
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
  
  const addRepository = useCallback((repoData: Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>) => {
    const newRepo: Repository = {
      id: `repo_${Date.now()}`,
      status: RepoStatus.Idle,
      lastUpdated: null,
      buildHealth: BuildHealth.Unknown,
      ...repoData
    } as Repository;
    setRepositories(prev => [...prev, newRepo]);
    // Add new repo to the start of the uncategorized list
    setUncategorizedOrder(prev => [newRepo.id, ...prev]);
  }, []);
  
  const updateRepository = useCallback((updatedRepo: Repository) => {
    setRepositories(prev => prev.map(repo => (repo.id === updatedRepo.id ? updatedRepo : repo)));
  }, []);
  
  const deleteRepository = useCallback((repoId: string) => {
    setRepositories(prev => prev.filter(repo => repo.id !== repoId));
    // Also remove from any category and uncategorized list
    setCategories(prev => {
        return prev.map(cat => ({
            ...cat,
            repositoryIds: cat.repositoryIds.filter(id => id !== repoId),
        }));
    });
    setUncategorizedOrder(prev => prev.filter(id => id !== repoId));
  }, []);

  const addCategory = useCallback((name: string) => {
    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      name,
      repositoryIds: [],
      collapsed: false,
      color: undefined,
      backgroundColor: undefined,
    };
    setCategories(prev => [...prev, newCategory]);
  }, []);

  const updateCategory = useCallback((updatedCategory: Category) => {
    setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
    const categoryToDelete = categories.find(c => c.id === categoryId);
    if (!categoryToDelete) return;

    // Move repos from the deleted category to the top of the uncategorized list
    setUncategorizedOrder(prev => [...categoryToDelete.repositoryIds, ...prev]);
    // Remove the category itself
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
  }, [categories]);

  const moveRepositoryToCategory = useCallback((repoId: string, sourceId: string | 'uncategorized', targetId: string | 'uncategorized', targetIndex: number) => {
    logger.debug('moveRepositoryToCategory triggered', { repoId, sourceId, targetId, targetIndex });
    
    // Optimistically update state
    setCategories(prevCategories => {
        let newCategories = JSON.parse(JSON.stringify(prevCategories)) as Category[];
        
        setUncategorizedOrder(prevUncategorized => {
            let newUncategorized = [...prevUncategorized];

            // 1. Find and remove the repo from its source list
            let foundInSource = false;
            if (sourceId === 'uncategorized') {
                const index = newUncategorized.indexOf(repoId);
                if (index > -1) {
                    newUncategorized.splice(index, 1);
                    foundInSource = true;
                }
            } else {
                const sourceCategory = newCategories.find(c => c.id === sourceId);
                if (sourceCategory) {
                    const index = sourceCategory.repositoryIds.indexOf(repoId);
                    if (index > -1) {
                        sourceCategory.repositoryIds.splice(index, 1);
                        foundInSource = true;
                    }
                }
            }

            if (!foundInSource) {
              logger.error('DND Error: repoId not found in source list.', { repoId, sourceId });
              // abort state update
              return prevUncategorized;
            }

            // 2. Add the repo to its target list at the correct index
            if (targetId === 'uncategorized') {
                newUncategorized.splice(targetIndex, 0, repoId);
            } else {
                const targetCategory = newCategories.find(c => c.id === targetId);
                if (targetCategory) {
                    targetCategory.repositoryIds.splice(targetIndex, 0, repoId);
                } else {
                   logger.error('DND Error: target category not found', { targetId });
                }
            }

            return newUncategorized;
        });
        
        return newCategories;
    });

  }, [logger]);

  const toggleCategoryCollapse = useCallback((categoryId: string) => {
    setCategories(prev => prev.map(cat => 
        cat.id === categoryId ? { ...cat, collapsed: !(cat.collapsed ?? false) } : cat
    ));
  }, []);
  
  const toggleAllCategoriesCollapse = useCallback(() => {
    setCategories(prev => {
      const shouldCollapseAll = prev.some(c => !(c.collapsed ?? false));
      return prev.map(c => ({ ...c, collapsed: shouldCollapseAll }));
    });
  }, []);

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
    toggleCategoryCollapse,
    toggleAllCategoriesCollapse,
  }), [settings, saveSettings, repositories, isLoading, categories, uncategorizedOrder, addCategory, updateCategory, deleteCategory, moveRepositoryToCategory, toggleCategoryCollapse, toggleAllCategoriesCollapse, addRepository, updateRepository, deleteRepository, setRepositories, setCategories, setUncategorizedOrder]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
    return useContext(SettingsContext);
};