import React, { createContext, useState, useCallback, ReactNode, useMemo, useEffect, useContext, useRef } from 'react';
import type { GlobalSettings, Repository } from '../types';
import { RepoStatus, BuildHealth, VcsType, TaskStepType } from '../types';

interface AppDataContextState {
  settings: GlobalSettings;
  saveSettings: (newSettings: GlobalSettings) => void;
  repositories: Repository[];
  setRepositories: (repos: Repository[]) => void;
  addRepository: (repoData: Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>) => void;
  updateRepository: (updatedRepo: Repository) => void;
  deleteRepository: (repoId: string) => void;
  isLoading: boolean;
}

const DEFAULTS: GlobalSettings = {
    defaultBuildCommand: 'npm run build',
    notifications: true,
    simulationMode: true,
    theme: 'dark',
    iconSet: 'heroicons',
    debugLogging: true,
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
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULTS);
  const [repositories, setRepositories] = useState<Repository[]>([]);
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
        // Mark initial load as complete after the first run post-loading.
        if (!isLoading) {
            isInitialLoad.current = false;
        }
        return;
    };

    const handler = setTimeout(() => {
        window.electronAPI?.saveAllData({
            globalSettings: settings,
            repositories: repositories
        });
    }, 1000); // Debounce saves

    return () => clearTimeout(handler);
  }, [settings, repositories, isLoading]);

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
  }, []);
  
  const updateRepository = useCallback((updatedRepo: Repository) => {
    setRepositories(prev => prev.map(repo => (repo.id === updatedRepo.id ? updatedRepo : repo)));
  }, []);
  
  const deleteRepository = useCallback((repoId: string) => {
    setRepositories(prev => prev.filter(repo => repo.id !== repoId));
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
  }), [settings, saveSettings, repositories, setRepositories, addRepository, updateRepository, deleteRepository, isLoading]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
    return useContext(SettingsContext);
};