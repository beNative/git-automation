
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRepositoryManager } from './hooks/useRepositoryManager';
import type { Repository, GlobalSettings, AppView, Task, LogEntry, LocalPathState, Launchable, LaunchConfig, DetailedStatus, BranchInfo, UpdateStatusMessage, ToastMessage } from './types';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import RepoEditView from './components/modals/RepoFormModal';
import Toast from './components/Toast';
import InfoView from './components/InfoView';
import SettingsView from './components/SettingsView';
import TaskLogPanel from './components/TaskLogPanel';
import DebugPanel from './components/DebugPanel';
import { IconContext } from './contexts/IconContext';
import CommandPalette from './components/CommandPalette';
import StatusBar from './components/StatusBar';
import DirtyRepoModal from './components/modals/DirtyRepoModal';
import TaskSelectionModal from './components/modals/TaskSelectionModal';
import LaunchSelectionModal from './components/modals/LaunchSelectionModal';
import CommitHistoryModal from './components/modals/CommitHistoryModal';
import ExecutableSelectionModal from './components/modals/ExecutableSelectionModal';
import { VcsType } from './types';
import { TooltipProvider } from './contexts/TooltipContext';
import Tooltip from './components/Tooltip';
import { useLogger } from './hooks/useLogger';
import { useSettings } from './contexts/SettingsContext';
import ContextMenu from './components/ContextMenu';

const App: React.FC = () => {
  const logger = useLogger();
  const { 
    settings, 
    saveSettings, 
    repositories,
    setRepositories,
    addRepository,
    updateRepository,
    deleteRepository,
    isLoading: isDataLoading 
  } = useSettings();

  const {
    runTask,
    cloneRepository,
    launchApplication,
    launchExecutable,
    logs,
    clearLogs,
    isProcessing,
  } = useRepositoryManager({ repositories, updateRepository });
  
  const [repoToEditId, setRepoToEditId] = useState<string | 'new' | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [localPathStates, setLocalPathStates] = useState<Record<string, LocalPathState>>({});
  const [detectedExecutables, setDetectedExecutables] = useState<Record<string, string[]>>({});
  const [appVersion, setAppVersion] = useState<string>('');
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  // New states for deeper VCS integration
  const [detailedStatuses, setDetailedStatuses] = useState<Record<string, DetailedStatus | null>>({});
  const [branchLists, setBranchLists] = useState<Record<string, BranchInfo | null>>({});
  
  const [taskLogState, setTaskLogState] = useState({
    isOpen: false,
    activeIds: [] as string[],
    selectedId: null as string | null,
    height: 300,
  });

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    repo: Repository | null;
  }>({ isOpen: false, x: 0, y: 0, repo: null });

  const [dirtyRepoModal, setDirtyRepoModal] = useState<{
    isOpen: boolean;
    repo: Repository | null;
    task: Task | null;
    status: { untrackedFiles: string[]; changedFiles: string[]; output: string; } | null;
    resolve: ((choice: 'stash' | 'force' | 'cancel' | 'ignored_and_continue') => void) | null;
    isIgnoring: boolean;
  }>({ isOpen: false, repo: null, task: null, status: null, resolve: null, isIgnoring: false });

  const [taskSelectionModal, setTaskSelectionModal] = useState<{
    isOpen: boolean;
    repo: Repository | null;
  }>({ isOpen: false, repo: null });

  const [launchSelectionModal, setLaunchSelectionModal] = useState<{
    isOpen: boolean;
    repo: Repository | null;
    launchables: Launchable[];
  }>({ isOpen: false, repo: null, launchables: [] });

  const [executableSelectionModal, setExecutableSelectionModal] = useState<{
    isOpen: boolean;
    repo: Repository | null;
    launchConfig: LaunchConfig | null;
    executables: string[];
  }>({ isOpen: false, repo: null, launchConfig: null, executables: [] });

  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    repo: Repository | null;
  }>({ isOpen: false, repo: null });

  // Effect for app version
  useEffect(() => {
    logger.debug('App component mounted. Initializing API listeners.');
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(setAppVersion);
    }
  }, [logger]);

  // Effect for auto-updater
  useEffect(() => {
    const handleUpdateStatus = (_event: any, data: UpdateStatusMessage) => {
        logger.info(`Update status change received: ${data.status}`, data);
        switch (data.status) {
            case 'available':
                setToast({ message: data.message, type: 'info' });
                break;
            case 'downloaded':
                setToast({ message: data.message, type: 'success' });
                break;
            case 'error':
                setToast({ message: data.message, type: 'error' });
                break;
        }
    };

    if (window.electronAPI?.onUpdateStatusChange) {
        window.electronAPI.onUpdateStatusChange(handleUpdateStatus);
    }

    return () => {
        if (window.electronAPI?.removeUpdateStatusChangeListener) {
            window.electronAPI.removeUpdateStatusChangeListener(handleUpdateStatus);
        }
    };
  }, [logger]);
  
  // Effect to check local paths
  useEffect(() => {
    if (isDataLoading) return;
    const checkPaths = async () => {
        if (repositories.length === 0) {
            setLocalPathStates({});
            return;
        }
        logger.debug('Checking local paths for repositories.', { count: repositories.length });
        
        const checkingStates: Record<string, LocalPathState> = {};
        for (const repo of repositories) {
            checkingStates[repo.id] = 'checking';
        }
        setLocalPathStates(checkingStates);

        const finalStates: Record<string, LocalPathState> = {};
        for (const repo of repositories) {
            finalStates[repo.id] = await window.electronAPI?.checkLocalPath(repo.localPath) ?? 'missing';
        }
        setLocalPathStates(finalStates);
        logger.info('Local path check complete.', finalStates);
    };
    checkPaths();
  }, [repositories, isDataLoading, logger]);
  
  // New effect to fetch detailed VCS statuses and branch lists
  useEffect(() => {
    if (isDataLoading) return;
    const fetchStatuses = async () => {
      logger.debug('Fetching detailed VCS statuses and branch lists.');
      const statusPromises = repositories.map(async (repo) => {
        if (localPathStates[repo.id] === 'valid') {
          const status = await window.electronAPI?.getDetailedVcsStatus(repo);
          return { repoId: repo.id, status };
        }
        return { repoId: repo.id, status: null };
      });
      const statuses = await Promise.all(statusPromises);
      setDetailedStatuses(statuses.reduce((acc, s) => ({ ...acc, [s.repoId]: s.status }), {}));
      
      const branchPromises = repositories.map(async (repo) => {
        if (localPathStates[repo.id] === 'valid' && repo.vcs === VcsType.Git) {
          const branches = await window.electronAPI?.listBranches(repo.localPath);
          return { repoId: repo.id, branches };
        }
        return { repoId: repo.id, branches: null };
      });
      const branches = await Promise.all(branchPromises);
      setBranchLists(branches.reduce((acc, b) => ({ ...acc, [b.repoId]: b.branches }), {}));
      logger.info('VCS status and branch fetch complete.');
    };

    fetchStatuses();
  }, [repositories, localPathStates, isDataLoading, logger]);


  // Effect to detect executables when paths are validated
  useEffect(() => {
    if (isDataLoading) return;
    const detectAll = async () => {
      logger.debug('Detecting executables for valid repositories.');
      const executablesByRepo: Record<string, string[]> = {};
      for (const repo of repositories) {
        if (localPathStates[repo.id] === 'valid' && repo.localPath) {
          try {
            executablesByRepo[repo.id] = await window.electronAPI?.detectExecutables(repo.localPath) ?? [];
          } catch (error: any) {
            logger.error(`Failed to detect executables for ${repo.name}:`, { error: error.message });
            executablesByRepo[repo.id] = [];
          }
        }
      }
      setDetectedExecutables(executablesByRepo);
      logger.info('Executable detection complete.', executablesByRepo);
    };
    detectAll();
  }, [repositories, localPathStates, isDataLoading, logger]);

  // Effect to apply theme
  useEffect(() => {
    if (settings?.theme) {
        logger.debug('Applying theme setting.', { theme: settings.theme });
        if (settings.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
    }
  }, [settings?.theme, logger]);
  
  // Effect for Command Palette & Debug Panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setCommandPaletteOpen(prev => !prev);
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
            e.preventDefault();
            setIsDebugPanelOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const refreshRepoState = useCallback(async (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo || localPathStates[repo.id] !== 'valid') return;
    logger.info('Refreshing repository state', { repoId, name: repo.name });

    const status = await window.electronAPI?.getDetailedVcsStatus(repo);
    setDetailedStatuses(prev => ({ ...prev, [repoId]: status }));

    if (repo.vcs === VcsType.Git) {
        const branches = await window.electronAPI?.listBranches(repo.localPath);
        setBranchLists(prev => ({ ...prev, [repoId]: branches }));
        // If the current branch in the state is different from the one on disk, update it
        if (branches?.current && repo.branch !== branches.current) {
            logger.info('Branch changed on disk, updating repository state.', { repoId, old: repo.branch, new: branches.current });
            updateRepository({ ...repo, branch: branches.current });
        }
    }
  }, [repositories, localPathStates, updateRepository, logger]);

  const handleOpenContextMenu = useCallback((event: React.MouseEvent, repo: Repository) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      repo: repo,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false, repo: null }));
  }, []);

  useEffect(() => {
    if (contextMenu.isOpen) {
      const handleClick = () => handleCloseContextMenu();
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCloseContextMenu();
        }
      };
      window.addEventListener('click', handleClick);
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('click', handleClick);
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [contextMenu.isOpen, handleCloseContextMenu]);

  const handleCheckAllForUpdates = useCallback(async () => {
    const validRepos = repositories.filter(r => localPathStates[r.id] === 'valid');
    if (validRepos.length === 0) {
      setToast({ message: 'No repositories with valid local paths to check.', type: 'info' });
      return;
    }

    setIsCheckingAll(true);
    setToast({ message: `Checking ${validRepos.length} repositories for updates...`, type: 'info' });

    const updatePromises = validRepos.map(repo => refreshRepoState(repo.id));
    
    try {
        await Promise.all(updatePromises);
        setToast({ message: 'Update check complete.', type: 'success' });
    } catch (e: any) {
        logger.error('An error occurred during the update check for all repos.', { error: e.message });
        setToast({ message: 'An error occurred during update check.', type: 'error' });
    } finally {
        setIsCheckingAll(false);
    }
  }, [repositories, localPathStates, refreshRepoState, logger]);

  const handleSwitchBranch = useCallback(async (repoId: string, branch: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo || repo.vcs !== VcsType.Git) return;
    logger.info('Attempting to switch branch', { repoId, branch });

    try {
        const result = await window.electronAPI?.checkoutBranch(repo.localPath, branch);
        if (result?.success) {
            setToast({ message: `Switched to branch '${branch}'`, type: 'success' });
            await refreshRepoState(repoId);
        } else {
            logger.error('Failed to switch branch', { repoId, branch, error: result?.error || 'Electron API not available' });
            setToast({ message: `Failed to switch branch: ${result?.error || 'Electron API not available'}`, type: 'error' });
        }
    } catch (e: any) {
        logger.error('An exception occurred while switching branch', { repoId, branch, error: e.message });
        setToast({ message: e.message || 'An error occurred.', type: 'error' });
    }
  }, [repositories, refreshRepoState, logger]);

  const handleSaveSettings = (newSettings: GlobalSettings) => {
    logger.info('Saving new global settings.', { newSettings });
    saveSettings(newSettings);
    setToast({ message: 'Settings saved successfully!', type: 'success' });
  };

  const handleEditRepository = (repoId: string | 'new') => {
    logger.info('Changing view to edit-repository', { repoId });
    setRepoToEditId(repoId);
    setActiveView('edit-repository');
  };

  const handleCancelEditRepository = useCallback(() => {
    logger.info('Changing view to dashboard');
    setRepoToEditId(null);
    setActiveView('dashboard');
  }, [logger]);
  
  const handleSaveRepo = (repo: Repository) => {
    if (repositories.some(r => r.id === repo.id)) {
      logger.info('Updating repository', { repoId: repo.id, name: repo.name });
      updateRepository(repo);
      setToast({ message: 'Repository updated!', type: 'success' });
    } else {
      logger.info('Adding new repository', { name: repo.name });
      addRepository(repo);
      setToast({ message: 'Repository added!', type: 'success' });
    }
    handleCancelEditRepository();
  };

  const handleDeleteRepo = (repoId: string) => {
    if (window.confirm('Are you sure you want to delete this repository?')) {
      logger.warn('Deleting repository', { repoId });
      deleteRepository(repoId);
      setToast({ message: 'Repository deleted.', type: 'error' });
    }
  };

  const openLogPanelForRepo = useCallback((repoId: string, clearPreviousLogs: boolean) => {
    if (clearPreviousLogs) {
        clearLogs(repoId);
    }
    setTaskLogState(prev => {
        const newActiveIds = prev.activeIds.includes(repoId)
            ? prev.activeIds
            : [...prev.activeIds, repoId];
        return {
            ...prev,
            isOpen: true,
            activeIds: newActiveIds,
            selectedId: repoId,
        };
    });
  }, [clearLogs]);

  const handleRunTask = useCallback(async (repoId: string, taskId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    const task = repo?.tasks.find(t => t.id === taskId);
    if (!repo || !task) {
      logger.error('Could not run task: repository or task not found', { repoId, taskId });
      setToast({ message: 'Repository or task not found.', type: 'error' });
      return;
    }

    logger.info(`Running task '${task.name}' on '${repo.name}'`, { repoId, taskId });
    openLogPanelForRepo(repo.id, true);
    
    const onDirty = (statusResult: { untrackedFiles: string[]; changedFiles: string[]; output: string; }) => {
      return new Promise<'stash' | 'force' | 'cancel' | 'ignored_and_continue'>((resolve) => {
        setDirtyRepoModal({ isOpen: true, repo, task, status: statusResult, resolve, isIgnoring: false });
      });
    };

    try {
      await runTask(repo, task, settings, onDirty);
    } catch (e: any) {
      if (e.message !== 'cancelled') { // Don't show toast for user cancellation
        logger.error(`Task '${task.name}' failed on '${repo.name}'`, { repoId, taskId, error: e.message });
        setToast({ message: e.message || 'Task failed!', type: 'error' });
      } else {
        logger.warn(`Task '${task.name}' was cancelled by user.`, { repoId, taskId });
        setToast({ message: 'Task was cancelled.', type: 'info' });
      }
    } finally {
        refreshRepoState(repoId); // Refresh status after task run
    }
  }, [repositories, settings, runTask, openLogPanelForRepo, refreshRepoState, logger]);

  const handleDirtyRepoChoice = async (choice: 'stash' | 'force' | 'cancel' | 'ignore', filesToIgnore?: string[]) => {
    const { resolve, repo } = dirtyRepoModal;

    if (choice === 'ignore' && filesToIgnore && repo) {
      if (filesToIgnore.length === 0) {
        setToast({ message: 'No files selected to ignore.', type: 'info' });
        return;
      }
      setDirtyRepoModal(prev => ({ ...prev, isIgnoring: true }));
      try {
        const result = await window.electronAPI.ignoreFilesAndPush({ repo, filesToIgnore });
        if (result.success) {
          setToast({ message: '.gitignore updated and pushed successfully.', type: 'success' });
          if (resolve) resolve('ignored_and_continue');
          setDirtyRepoModal({ isOpen: false, repo: null, task: null, status: null, resolve: null, isIgnoring: false });
        } else {
          throw new Error(result.error);
        }
      } catch (e: any) {
        setToast({ message: `Failed to update .gitignore: ${e.message}`, type: 'error' });
        setDirtyRepoModal(prev => ({ ...prev, isIgnoring: false }));
      }
    } else if (choice === 'stash' || choice === 'force' || choice === 'cancel') {
      if (resolve) resolve(choice);
      setDirtyRepoModal({ isOpen: false, repo: null, task: null, status: null, resolve: null, isIgnoring: false });
    }
  };

  const handleOpenTaskSelection = (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (repo && repo.tasks.length > 0) {
      setTaskSelectionModal({ isOpen: true, repo });
    }
  };

  const handleViewLogs = (repoId: string) => {
    openLogPanelForRepo(repoId, false);
  };
  
  const handleViewHistory = useCallback((repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (repo) {
        setHistoryModal({ isOpen: true, repo });
    }
  }, [repositories]);

  const handleRunLaunchable = useCallback(async (repo: Repository, launchable: Launchable) => {
      logger.info('Running launchable', { repoId: repo.id, launchable });
      openLogPanelForRepo(repo.id, true);
      if (launchable.type === 'manual') {
        if(launchable.config.type === 'command' && launchable.config.command) {
            await launchApplication(repo, launchable.config.command);
        } else if (launchable.config.type === 'select-executable') {
            handleOpenExecutableSelection(repo.id, launchable.config.id);
        }
      } else {
        await launchExecutable(repo, launchable.path);
      }
    }, [launchApplication, launchExecutable, openLogPanelForRepo, repositories, detectedExecutables, logger]);

  const handleRunLaunchConfig = useCallback(async (repoId: string, configId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    const config = repo?.launchConfigs?.find(lc => lc.id === configId);
    if (!repo || !config) {
        logger.error('Could not run launch config: not found', { repoId, configId });
        setToast({ message: 'Repository or launch config not found.', type: 'error' });
        return;
    }

    if (config.type === 'command' && config.command) {
        logger.info('Running launch config (command)', { repoId, config });
        openLogPanelForRepo(repoId, true);
        await launchApplication(repo, config.command);
    } else if (config.type === 'select-executable') {
        logger.info('Opening executable selection for launch config', { repoId, config });
        handleOpenExecutableSelection(repoId, configId);
    }
  }, [repositories, launchApplication, openLogPanelForRepo, detectedExecutables, logger]);

  const handleOpenLaunchSelection = useCallback((repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) return;
    
    const unpinnedConfigs = (repo.launchConfigs || []).filter(lc => !lc.showOnDashboard);
    const detected = detectedExecutables[repo.id] || [];

    const launchables: Launchable[] = [
        ...unpinnedConfigs.map(config => ({ type: 'manual' as const, config })),
        ...detected.map(path => ({ type: 'detected' as const, path }))
    ];

    if (launchables.length > 0) {
        setLaunchSelectionModal({ isOpen: true, repo, launchables });
    } else {
        setToast({ message: 'No other launch options found.', type: 'info' });
    }
  }, [repositories, detectedExecutables]);

  const handleOpenExecutableSelection = (repoId: string, configId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    const config = repo?.launchConfigs?.find(lc => lc.id === configId);
    const executables = detectedExecutables[repoId] || [];

    if (repo && config && executables.length > 0) {
      setExecutableSelectionModal({
        isOpen: true,
        repo,
        launchConfig: config,
        executables
      });
    } else {
      setToast({ message: 'No executables detected in release/dist/build folders.', type: 'info' });
    }
  };


  const handleCloneRepo = useCallback(async (repo: Repository) => {
    logger.info('Cloning repository', { repoId: repo.id, url: repo.remoteUrl });
    openLogPanelForRepo(repo.id, true);
    
    try {
        await cloneRepository(repo);
        // After cloning, re-check the path status
        const newState = await window.electronAPI?.checkLocalPath(repo.localPath) ?? 'missing';
        setLocalPathStates(prev => ({...prev, [repo.id]: newState}));
    } catch (e: any) {
        logger.error('Clone failed', { repoId: repo.id, error: e.message });
        setToast({ message: e.message || 'Clone failed!', type: 'error' });
    }
  }, [cloneRepository, openLogPanelForRepo, logger]);

  const handleChooseLocationAndClone = useCallback(async (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) {
      setToast({ message: 'Repository not found.', type: 'error' });
      return;
    }

    try {
      const result = await window.electronAPI?.showDirectoryPicker();
      if (!result || result.canceled || result.filePaths.length === 0) {
        setToast({ message: 'Location selection was cancelled.', type: 'info' });
        return;
      }

      const parentDir = result.filePaths[0];
      // Sanitize repo name to be used as a directory name
      const repoDirName = repo.name.replace(/[^a-zA-Z0-9_.-]/g, '-').toLowerCase();
      const newLocalPath = await window.electronAPI?.pathJoin(parentDir, repoDirName);

      if (!newLocalPath) {
        setToast({ message: 'Failed to construct repository path.', type: 'error' });
        return;
      }

      const updatedRepo = { ...repo, localPath: newLocalPath };
      updateRepository(updatedRepo);
      
      // Immediately trigger the clone with the updated repo object
      await handleCloneRepo(updatedRepo);

    } catch (e: any) {
      logger.error('Failed to set up path for cloning', { repoId, error: e.message });
      setToast({ message: e.message || 'Failed to set up repository path.', type: 'error' });
    }
  }, [repositories, updateRepository, handleCloneRepo, logger]);

  const handleOpenLocalPath = useCallback(async (path: string) => {
    if (!path) {
      setToast({ message: 'Local path is not configured.', type: 'info' });
      return;
    }
    try {
      const result = await window.electronAPI?.openLocalPath(path);
      if (!result?.success) {
        setToast({ message: result?.error || 'Failed to open the local folder.', type: 'error' });
      }
    } catch (e: any) {
      setToast({ message: e.message || 'An error occurred while trying to open the folder.', type: 'error' });
    }
  }, []);

  const handleOpenTerminal = useCallback(async (path: string) => {
    if (!path) {
      setToast({ message: 'Local path is not configured.', type: 'info' });
      return;
    }
    try {
      const result = await window.electronAPI?.openTerminal(path);
      if (result?.success) {
        setToast({ message: 'Terminal opened successfully.', type: 'success' });
      } else {
        setToast({ message: result?.error || 'Failed to open terminal.', type: 'error' });
      }
    } catch (e: any) {
      setToast({ message: e.message || 'An error occurred while opening the terminal.', type: 'error' });
    }
  }, []);


  const latestLog = useMemo(() => {
    const allLogs = Object.values(logs).flat();
    if (allLogs.length === 0) return null;
    return allLogs.reduce((latest, current) => new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest);
  }, [logs]);

  const repositoryToEdit = useMemo(() => {
    if (repoToEditId === 'new' || !repoToEditId) {
        return null;
    }
    return repositories.find(r => r.id === repoToEditId) || null;
  }, [repoToEditId, repositories]);

  useEffect(() => {
    logger.debug(`App view changed to: ${activeView}`, { view: activeView, repoToEditId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, repoToEditId]);

  const mainContentClass = useMemo(() => {
    const baseClasses = "flex-1 flex flex-col min-h-0";
    switch (activeView) {
      case 'dashboard':
        return `${baseClasses} p-3 sm:p-4 lg:p-6 overflow-y-auto`;
      case 'info':
        return `${baseClasses} overflow-y-auto`;
      case 'settings':
      case 'edit-repository':
        return `${baseClasses} overflow-hidden`;
      default:
        return baseClasses;
    }
  }, [activeView]);

  // Log Panel Handlers
  const handleSelectLogTab = useCallback((repoId: string) => {
    setTaskLogState(prev => ({ ...prev, selectedId: repoId }));
  }, []);

  const handleCloseLogTab = useCallback((repoIdToClose: string) => {
    setTaskLogState(prev => {
        const newActiveIds = prev.activeIds.filter(id => id !== repoIdToClose);

        if (newActiveIds.length === 0) {
            return { ...prev, isOpen: false, activeIds: [], selectedId: null };
        }

        if (prev.selectedId === repoIdToClose) {
            const closingIndex = prev.activeIds.indexOf(repoIdToClose);
            const newSelectedId = newActiveIds[Math.max(0, closingIndex - 1)];
            return { ...prev, activeIds: newActiveIds, selectedId: newSelectedId };
        }

        return { ...prev, activeIds: newActiveIds };
    });
  }, []);

  const handleCloseLogPanel = useCallback(() => {
    setTaskLogState(prev => ({ ...prev, isOpen: false, activeIds: [], selectedId: null }));
  }, []);

  const handleRunTaskAndClose = (repoId: string, taskId: string) => {
    handleRunTask(repoId, taskId);
    handleCloseContextMenu();
  };

  const handleRunLaunchableAndClose = (repo: Repository, launchable: Launchable) => {
    handleRunLaunchable(repo, launchable);
    handleCloseContextMenu();
  }


  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-600 dark:text-gray-400">Loading application data...</p>
      </div>
    );
  }

  return (
    <IconContext.Provider value={settings.iconSet}>
      <TooltipProvider>
        <div className="flex flex-col h-screen">
          <Header 
            onNewRepo={() => handleEditRepository('new')} 
            activeView={activeView} 
            onSetView={setActiveView}
            onCheckAllForUpdates={handleCheckAllForUpdates}
            isCheckingAll={isCheckingAll}
          />
          <main className={mainContentClass}>
            {(() => {
              switch (activeView) {
                case 'settings':
                  return <SettingsView currentSettings={settings} onSave={handleSaveSettings} setToast={setToast} />;
                case 'info':
                  return <InfoView />;
                case 'edit-repository':
                  // The key ensures the component re-mounts when switching between editing different repos
                  return <RepoEditView 
                    key={repoToEditId} 
                    repository={repositoryToEdit} 
                    onSave={handleSaveRepo} 
                    onCancel={handleCancelEditRepository}
                    onRefreshState={refreshRepoState}
                    setToast={setToast}
                  />;
                case 'dashboard':
                default:
                  return <Dashboard 
                    repositories={repositories} 
                    setRepositories={setRepositories}
                    onOpenTaskSelection={handleOpenTaskSelection} 
                    onRunTask={handleRunTask}
                    onViewLogs={handleViewLogs}
                    onViewHistory={handleViewHistory}
                    onEditRepo={(repoId: string) => handleEditRepository(repoId)}
                    onDeleteRepo={handleDeleteRepo}
                    isProcessing={isProcessing}
                    localPathStates={localPathStates}
                    detectedExecutables={detectedExecutables}
                    detailedStatuses={detailedStatuses}
                    branchLists={branchLists}
                    onSwitchBranch={handleSwitchBranch}
                    onCloneRepo={(repoId) => {
                      const repo = repositories.find(r => r.id === repoId);
                      if (repo) handleCloneRepo(repo);
                    }}
                    onChooseLocationAndClone={handleChooseLocationAndClone}
                    onRunLaunchConfig={handleRunLaunchConfig}
                    onOpenLaunchSelection={handleOpenLaunchSelection}
                    onOpenLocalPath={handleOpenLocalPath}
                    onOpenTerminal={handleOpenTerminal}
                    setToast={setToast}
                    onOpenContextMenu={handleOpenContextMenu}
                    onRefreshRepoState={refreshRepoState}
                  />;
              }
            })()}
          </main>
          
          {taskLogState.isOpen && (
            <TaskLogPanel
              onClosePanel={handleCloseLogPanel}
              onCloseTab={handleCloseLogTab}
              onSelectTab={handleSelectLogTab}
              logs={logs}
              allRepositories={repositories}
              activeRepoIds={taskLogState.activeIds}
              selectedRepoId={taskLogState.selectedId}
              height={taskLogState.height}
              setHeight={(h) => setTaskLogState(p => ({ ...p, height: h }))}
              isProcessing={isProcessing}
            />
          )}

          <StatusBar 
            repoCount={repositories.length} 
            processingCount={isProcessing.size} 
            isSimulationMode={settings.simulationMode}
            latestLog={latestLog}
            appVersion={appVersion}
            onToggleDebugPanel={() => setIsDebugPanelOpen(p => !p)}
          />

          <DebugPanel 
            isOpen={isDebugPanelOpen}
            onClose={() => setIsDebugPanelOpen(false)}
          />
          
          {toast && settings.notifications && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}

          <ContextMenu
            context={contextMenu}
            onClose={handleCloseContextMenu}
            onRunTask={handleRunTaskAndClose}
            onRunLaunchable={handleRunLaunchableAndClose}
            onRefreshRepoState={refreshRepoState}
            onOpenLocalPath={handleOpenLocalPath}
            onOpenTerminal={handleOpenTerminal}
            onViewLogs={handleViewLogs}
            onViewHistory={handleViewHistory}
            onEditRepo={handleEditRepository}
            onDeleteRepo={handleDeleteRepo}
            detectedExecutables={detectedExecutables}
          />

          <DirtyRepoModal
            isOpen={dirtyRepoModal.isOpen}
            status={dirtyRepoModal.status}
            onChoose={handleDirtyRepoChoice}
            isIgnoring={dirtyRepoModal.isIgnoring}
          />

          <TaskSelectionModal
            isOpen={taskSelectionModal.isOpen}
            repository={taskSelectionModal.repo}
            onClose={() => setTaskSelectionModal({ isOpen: false, repo: null })}
            onSelect={(taskId) => {
              if (taskSelectionModal.repo) {
                handleRunTask(taskSelectionModal.repo.id, taskId);
              }
              setTaskSelectionModal({ isOpen: false, repo: null });
            }}
          />

          <LaunchSelectionModal
            isOpen={launchSelectionModal.isOpen}
            repository={launchSelectionModal.repo}
            launchables={launchSelectionModal.launchables}
            onClose={() => setLaunchSelectionModal({ isOpen: false, repo: null, launchables: [] })}
            onSelect={(launchable) => {
              if (launchSelectionModal.repo) {
                handleRunLaunchable(launchSelectionModal.repo, launchable);
              }
              setLaunchSelectionModal({ isOpen: false, repo: null, launchables: [] });
            }}
          />

          <ExecutableSelectionModal
            isOpen={executableSelectionModal.isOpen}
            repository={executableSelectionModal.repo}
            launchConfig={executableSelectionModal.launchConfig}
            executables={executableSelectionModal.executables}
            onClose={() => setExecutableSelectionModal({ isOpen: false, repo: null, launchConfig: null, executables: [] })}
            onSelect={(executablePath) => {
              const { repo } = executableSelectionModal;
              if (repo) {
                  openLogPanelForRepo(repo.id, true);
                  launchExecutable(repo, executablePath);
              }
              // FIX: Called state variable instead of setter.
              setExecutableSelectionModal({ isOpen: false, repo: null, launchConfig: null, executables: [] });
            }}
          />

          <CommitHistoryModal
              isOpen={historyModal.isOpen}
              repository={historyModal.repo}
              onClose={() => setHistoryModal({ isOpen: false, repo: null })}
          />

          <CommandPalette 
              isOpen={isCommandPaletteOpen}
              onClose={() => setCommandPaletteOpen(false)}
              repositories={repositories}
              onSetView={setActiveView}
              onNewRepo={() => handleEditRepository('new')}
              onRunTask={(repoId, taskId) => {
                  handleRunTask(repoId, taskId);
                  setCommandPaletteOpen(false);
              }}
          />
        </div>
        <Tooltip />
      </TooltipProvider>
    </IconContext.Provider>
  );
};

export default App;
