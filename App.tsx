import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRepositoryManager } from './hooks/useRepositoryManager';
// FIX: Add missing ReleaseInfo type to the import.
import type { Repository, GlobalSettings, AppView, Task, LogEntry, LocalPathState, Launchable, LaunchConfig, DetailedStatus, BranchInfo, UpdateStatusMessage, ToastMessage, Category, ReleaseInfo, ShortcutPlatform, Commit } from './types';
import Dashboard from './components/Dashboard';
import TitleBar from './components/Header';
// FIX: RepoEditView is a default export, so it should be imported without curly braces.
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
import { useInstrumentation } from './hooks/useInstrumentation';
import { useSettings } from './contexts/SettingsContext';
import ContextMenu from './components/ContextMenu';
import UpdateBanner from './components/UpdateBanner';
import ConfirmationModal from './components/modals/ConfirmationModal';
import { ExclamationTriangleIcon } from './components/icons/ExclamationTriangleIcon';
import AboutModal from './components/modals/AboutModal';
import { detectShortcutPlatform, formatShortcutForDisplay } from './keyboardShortcuts';

type ShortcutMatcher = {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
};

const normalizeEventKey = (key: string): string => {
  if (key === ' ') {
    return 'space';
  }
  if (key === 'Spacebar') {
    return 'space';
  }
  return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
};

const parseShortcutString = (
  shortcut: string,
  platform: ShortcutPlatform,
): ShortcutMatcher | null => {
  if (!shortcut) {
    return null;
  }

  const parts = shortcut.split('+');
  let key: string | null = null;
  let ctrl = false;
  let meta = false;
  let alt = false;
  let shift = false;

  parts.forEach(part => {
    const normalized = part.trim();
    switch (normalized) {
      case 'Mod':
        if (platform === 'mac') {
          meta = true;
        } else {
          ctrl = true;
        }
        break;
      case 'Cmd':
        meta = true;
        break;
      case 'Ctrl':
        ctrl = true;
        break;
      case 'Win':
        meta = true;
        break;
      case 'Option':
        alt = true;
        break;
      case 'Alt':
        alt = true;
        break;
      case 'Shift':
        shift = true;
        break;
      default:
        if (!key) {
          key = normalized.toLowerCase();
        }
        break;
    }
  });

  if (!key) {
    return null;
  }

  return { key, ctrl, meta, alt, shift };
};

const eventMatchesShortcut = (event: KeyboardEvent, shortcut: ShortcutMatcher): boolean => {
  if (event.ctrlKey !== shortcut.ctrl) {
    return false;
  }
  if (event.metaKey !== shortcut.meta) {
    return false;
  }
  if (event.altKey !== shortcut.alt) {
    return false;
  }
  if (event.shiftKey !== shortcut.shift) {
    return false;
  }

  const eventKey = normalizeEventKey(event.key);
  return eventKey === shortcut.key;
};

const App: React.FC = () => {
  const logger = useLogger();
  const instrumentation = useInstrumentation();
  const [shortcutPlatform] = useState<ShortcutPlatform>(() => detectShortcutPlatform());
  const {
    settings,
    saveSettings,
    repositories,
    // FIX: Remove unused and unsafe setters that bypass the context's logic.
    addRepository,
    updateRepository,
    deleteRepository,
    isLoading: isDataLoading,
    categories,
    // FIX: Remove unused and unsafe setters.
    uncategorizedOrder,
    // FIX: Remove unused and unsafe setters.
    addCategory,
    updateCategory,
    deleteCategory,
    moveRepositoryToCategory,
    moveRepository,
    toggleCategoryCollapse,
    toggleAllCategoriesCollapse,
    moveCategory,
    reorderCategories,
  } = useSettings();

  const {
    runTask,
    cloneRepository,
    launchApplication,
    launchExecutable,
    logs,
    clearLogs,
    isProcessing,
    cancelTask,
  } = useRepositoryManager({ repositories, updateRepository });
  
  const [repoFormState, setRepoFormState] = useState<{
    repoId: string | 'new' | null;
    defaultCategoryId?: string;
  }>({ repoId: null });
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [localPathStates, setLocalPathStates] = useState<Record<string, LocalPathState>>({});
  const [detectedExecutables, setDetectedExecutables] = useState<Record<string, string[]>>({});
  const [appVersion, setAppVersion] = useState<string>('');
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const autoCheckIntervalRef = useRef<number | null>(null);
  const isAutoCheckingRef = useRef(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusMessage | null>(null);
  const [isUpdateBannerVisible, setIsUpdateBannerVisible] = useState(false);
  const [autoInstallScheduled, setAutoInstallScheduled] = useState(false);
  const autoInstallTimeoutRef = useRef<number | null>(null);

  // New states for deeper VCS integration
  const [detailedStatuses, setDetailedStatuses] = useState<Record<string, DetailedStatus | null>>({});
  const [branchLists, setBranchLists] = useState<Record<string, BranchInfo | null>>({});
  // FIX: Add state for latestReleases to satisfy DashboardProps.
  const [latestReleases, setLatestReleases] = useState<Record<string, ReleaseInfo | null>>({});
  
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
    initialCommits: Commit[] | null;
  }>({ isOpen: false, repo: null, initialCommits: null });

  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    confirmButtonClass?: string;
    icon?: React.ReactNode;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const cancelAutoInstall = useCallback(() => {
    if (autoInstallTimeoutRef.current) {
      window.clearTimeout(autoInstallTimeoutRef.current);
      autoInstallTimeoutRef.current = null;
    }
    setAutoInstallScheduled(false);
  }, []);

  const handleRestartAndUpdate = useCallback(() => {
    cancelAutoInstall();
    if (window.electronAPI?.restartAndInstallUpdate) {
      setToast({ message: 'Restarting to install the latest update…', type: 'info' });
      window.electronAPI.restartAndInstallUpdate();
    } else {
      setToast({ message: 'Could not restart. Please restart the app manually.', type: 'error' });
    }
  }, [cancelAutoInstall, setToast]);

  const scheduleAutoInstall = useCallback(() => {
    cancelAutoInstall();
    autoInstallTimeoutRef.current = window.setTimeout(() => {
      setAutoInstallScheduled(false);
      handleRestartAndUpdate();
    }, 8000);
    setAutoInstallScheduled(true);
  }, [cancelAutoInstall, handleRestartAndUpdate]);

  const handleAutoInstallPreferenceChange = useCallback((mode: GlobalSettings['autoInstallUpdates']) => {
    if (mode === settings.autoInstallUpdates) {
      return;
    }
    saveSettings({ ...settings, autoInstallUpdates: mode });
    if (mode === 'manual') {
      cancelAutoInstall();
      setToast({
        message: 'Automatic installation disabled. Use the Update Ready controls when you want to apply the update.',
        type: 'info',
      });
    } else {
      setToast({
        message: 'Updates will now install automatically as soon as they finish downloading.',
        type: 'success',
      });
    }
  }, [cancelAutoInstall, saveSettings, settings, setToast]);

  const handleDeferUpdate = useCallback(() => {
    if (settings.autoInstallUpdates === 'auto') {
      handleAutoInstallPreferenceChange('manual');
    }
    cancelAutoInstall();
    setIsUpdateBannerVisible(false);
    setToast({
      message: 'Update postponed. Use the “Update Ready” control in the title bar to install whenever you are ready.',
      type: 'info',
    });
  }, [cancelAutoInstall, handleAutoInstallPreferenceChange, settings.autoInstallUpdates, setToast]);

  const handleShowUpdateDetails = useCallback(() => {
    if (updateReady) {
      setIsUpdateBannerVisible(true);
    }
  }, [updateReady]);

  useEffect(() => {
    if (!instrumentation) {
      return;
    }

    const unregisterViewHook = instrumentation.registerTestHook<AppView>('app:setView', async (view?: AppView) => {
      setActiveView(view ?? 'dashboard');
    });

    const unregisterSnapshotHook = instrumentation.registerTestHook('app:getState', async () => ({
      activeView,
      repositoryCount: repositories.length,
      processingCount: isProcessing.size,
      openModals: {
        commandPalette: isCommandPaletteOpen,
        debugPanel: isDebugPanelOpen,
        dirtyRepo: dirtyRepoModal.isOpen,
        repoForm: repoFormState.repoId,
        taskSelection: taskSelectionModal.isOpen,
        launchSelection: launchSelectionModal.isOpen,
        executableSelection: executableSelectionModal.isOpen,
        history: historyModal.isOpen,
      },
    }));

    const unregisterTogglePalette = instrumentation.registerTestHook('app:toggleCommandPalette', async () => {
      setCommandPaletteOpen(prev => !prev);
    });

    const unregisterOpenRepoForm = instrumentation.registerTestHook(
      'app:openRepoForm',
      async (options?: { repoId?: string; categoryId?: string }) => {
        const repoId = (options?.repoId as string | undefined) ?? 'new';
        logger.info('Automation opening repository form.', { repoId, categoryId: options?.categoryId });
        setRepoFormState({ repoId, defaultCategoryId: options?.categoryId });
        setActiveView('edit-repository');
        instrumentation.trace('repo:form-opened', { repoId });
      },
    );

    const unregisterCloseRepoForm = instrumentation.registerTestHook('app:closeRepoForm', async () => {
      logger.info('Automation closing repository form.');
      setRepoFormState({ repoId: null });
      setActiveView('dashboard');
      instrumentation.trace('repo:form-closed', { source: 'automation' });
    });

    const categoryMap = new Map<string, string>();
    categories.forEach(category => {
      category.repositoryIds.forEach(repoId => {
        categoryMap.set(repoId, category.id);
      });
    });

    const unregisterRepoList = instrumentation.registerTestHook('repositories:list', async () =>
      repositories.map(repo => ({
        id: repo.id,
        name: repo.name,
        status: repo.status,
        categoryId: categoryMap.get(repo.id) ?? 'uncategorized',
      })),
    );

    return () => {
      unregisterViewHook();
      unregisterSnapshotHook();
      unregisterTogglePalette();
      unregisterOpenRepoForm();
      unregisterCloseRepoForm();
      unregisterRepoList();
    };
  }, [
    instrumentation,
    activeView,
    repositories,
    repositories.length,
    categories,
    isProcessing.size,
    isCommandPaletteOpen,
    isDebugPanelOpen,
    dirtyRepoModal.isOpen,
    repoFormState,
    taskSelectionModal.isOpen,
    launchSelectionModal.isOpen,
    executableSelectionModal.isOpen,
    historyModal.isOpen,
    logger,
  ]);

  useEffect(() => {
    if (!instrumentation) {
      return;
    }

    return instrumentation.registerUiSurface({
      getActiveView: () => activeView,
      setActiveView: (view: AppView) => {
        setActiveView(view);
      },
      getStateSnapshot: () => ({
        activeView,
        repositoryCount: repositories.length,
        processingCount: isProcessing.size,
        openModals: {
          commandPalette: isCommandPaletteOpen,
          debugPanel: isDebugPanelOpen,
          dirtyRepo: dirtyRepoModal.isOpen,
          repoForm: repoFormState.repoId,
          taskSelection: taskSelectionModal.isOpen,
          launchSelection: launchSelectionModal.isOpen,
          executableSelection: executableSelectionModal.isOpen,
          history: historyModal.isOpen,
        },
      }),
    });
  }, [
    instrumentation,
    activeView,
    repositories.length,
    isProcessing.size,
    isCommandPaletteOpen,
    isDebugPanelOpen,
    dirtyRepoModal.isOpen,
    repoFormState,
    taskSelectionModal.isOpen,
    launchSelectionModal.isOpen,
    executableSelectionModal.isOpen,
    historyModal.isOpen,
  ]);

  useEffect(() => {
    if (!instrumentation) {
      return;
    }
    instrumentation.trace('view:changed', {
      view: activeView,
      repoFormState,
    });
  }, [instrumentation, activeView, repoFormState]);

  const commandPaletteShortcutLabel = useMemo(() => {
    const bindings = settings.keyboardShortcuts?.bindings?.['app.navigation.commandPalette'];
    const activeBinding = bindings?.find(
      binding =>
        binding.scope === 'app' &&
        binding.shortcut &&
        (binding.platform === 'all' || binding.platform === shortcutPlatform),
    );

    if (activeBinding?.shortcut) {
      return formatShortcutForDisplay(activeBinding.shortcut, shortcutPlatform);
    }

    return formatShortcutForDisplay('Mod+K', shortcutPlatform);
  }, [settings.keyboardShortcuts, shortcutPlatform]);

  const handleCloseConfirmationModal = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  };

  const confirmAction = useCallback((options: {
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    confirmButtonClass?: string;
    icon?: React.ReactNode;
  }) => {
    setConfirmationModal({
      isOpen: true,
      ...options,
      onConfirm: () => {
        options.onConfirm();
        handleCloseConfirmationModal();
      },
      onCancel: () => {
        if (options.onCancel) {
          options.onCancel();
        }
        handleCloseConfirmationModal();
      },
    });
  }, []);

  // Effect for app version
  useEffect(() => {
    logger.debug('App component mounted. Initializing API listeners.');
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(setAppVersion);
    }
  }, [logger]);

  // Effect to listen for logs from the main process
  useEffect(() => {
      const handleLogFromMain = (
          _event: any, 
          log: { level: 'debug' | 'info' | 'warn' | 'error'; message: string; data?: any }
      ) => {
          logger[log.level](log.message, log.data);
      };
      
      window.electronAPI?.onLogFromMain(handleLogFromMain);
      
      return () => {
          window.electronAPI?.removeLogFromMainListener(handleLogFromMain);
      };
  }, [logger]);


  // Effect for auto-updater
  useEffect(() => {
    const handleUpdateStatus = (_event: any, data: UpdateStatusMessage) => {
      logger.info(`Update status change received: ${data.status}`, data);
      setUpdateStatus(data);

      switch (data.status) {
        case 'checking':
          cancelAutoInstall();
          setUpdateReady(false);
          setIsUpdateBannerVisible(false);
          break;
        case 'available':
          setToast({ message: data.message, type: 'info' });
          break;
        case 'downloaded':
          setUpdateReady(true);
          setIsUpdateBannerVisible(true);
          if (settings.autoInstallUpdates === 'auto') {
            setToast({ message: 'Update downloaded. Restarting automatically in a few seconds…', type: 'info' });
            scheduleAutoInstall();
          } else {
            cancelAutoInstall();
            setToast({ message: data.message, type: 'success' });
          }
          break;
        case 'error':
          cancelAutoInstall();
          setUpdateReady(false);
          setIsUpdateBannerVisible(false);
          setToast({ message: data.message, type: 'error' });
          break;
        default:
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
  }, [logger, cancelAutoInstall, scheduleAutoInstall, settings.autoInstallUpdates, setToast]);

  useEffect(() => {
    if (!updateReady) {
      return;
    }

    if (settings.autoInstallUpdates === 'auto') {
      if (!autoInstallScheduled) {
        scheduleAutoInstall();
      }
    } else if (autoInstallScheduled) {
      cancelAutoInstall();
    }
  }, [
    updateReady,
    settings.autoInstallUpdates,
    autoInstallScheduled,
    scheduleAutoInstall,
    cancelAutoInstall,
  ]);

  useEffect(() => () => {
    cancelAutoInstall();
  }, [cancelAutoInstall]);
  
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

    let isCancelled = false;

    const fetchStatuses = async () => {
      logger.debug('Fetching detailed VCS statuses and branch lists.');

      const statusPromises = repositories.map(async (repo) => {
        const pathState = localPathStates[repo.id];

        if (pathState === 'valid') {
          try {
            const status = await window.electronAPI?.getDetailedVcsStatus(repo);
            return { repoId: repo.id, status: status ?? null };
          } catch (error: any) {
            logger.error(`Failed to fetch detailed status for ${repo.name}:`, { error: error.message });
            return { repoId: repo.id, status: null };
          }
        }

        if (pathState === 'missing' || pathState === 'not_a_repo') {
          return { repoId: repo.id, status: null };
        }

        // When the path is still being validated ("checking" or undefined), retain the prior status.
        return { repoId: repo.id, status: undefined };
      });

      const statuses = await Promise.all(statusPromises);

      if (!isCancelled) {
        setDetailedStatuses(prev => {
          const next = { ...prev } as Record<string, DetailedStatus | null>;
          const seen = new Set<string>();

          statuses.forEach(({ repoId, status }) => {
            seen.add(repoId);
            if (status !== undefined) {
              next[repoId] = status;
            }
          });

          Object.keys(next).forEach(repoId => {
            if (!seen.has(repoId)) {
              delete next[repoId];
            }
          });

          return next;
        });
      }

      const branchPromises = repositories.map(async (repo) => {
        const pathState = localPathStates[repo.id];

        if (pathState === 'valid') {
          try {
            const branches = await window.electronAPI?.listBranches({ repoPath: repo.localPath, vcs: repo.vcs });
            return { repoId: repo.id, branches: branches ?? null };
          } catch (error: any) {
            logger.error(`Failed to fetch branches for ${repo.name}:`, { error: error.message });
            return { repoId: repo.id, branches: null };
          }
        }

        if (pathState === 'missing' || pathState === 'not_a_repo') {
          return { repoId: repo.id, branches: null };
        }

        return { repoId: repo.id, branches: undefined };
      });

      const branches = await Promise.all(branchPromises);

      if (!isCancelled) {
        setBranchLists(prev => {
          const next = { ...prev } as Record<string, BranchInfo | null>;
          const seen = new Set<string>();

          branches.forEach(({ repoId, branches: branchInfo }) => {
            seen.add(repoId);
            if (branchInfo !== undefined) {
              next[repoId] = branchInfo;
            }
          });

          Object.keys(next).forEach(repoId => {
            if (!seen.has(repoId)) {
              delete next[repoId];
            }
          });

          return next;
        });
      }

      logger.info('VCS status and branch fetch complete.');
    };

    fetchStatuses();

    return () => {
      isCancelled = true;
    };
  }, [repositories, localPathStates, isDataLoading, logger]);

  // FIX: Add effect to fetch latest releases for repositories.
  useEffect(() => {
    if (isDataLoading || !settings.githubPat) {
      if (!settings.githubPat) {
        logger.warn('GitHub PAT not set. Skipping release fetch.');
      }
      setLatestReleases({}); // Clear if no PAT or still loading
      return;
    }

    const fetchReleases = async () => {
      logger.debug('Fetching latest GitHub releases for valid Git repositories.');
      const releasePromises = repositories
        .filter(repo => repo.vcs === VcsType.Git && localPathStates[repo.id] === 'valid')
        .map(async (repo) => {
          try {
            const releaseInfo = await window.electronAPI?.getLatestRelease(repo);
            return { repoId: repo.id, releaseInfo };
          } catch (error: any) {
            logger.error(`Failed to fetch release for ${repo.name}:`, { error: error.message });
            return { repoId: repo.id, releaseInfo: null }; // Ensure we return a value even on error
          }
        });

      const releases = await Promise.all(releasePromises);
      setLatestReleases(releases.reduce((acc, r) => ({ ...acc, [r.repoId]: r.releaseInfo }), {}));
      logger.info('GitHub release fetch complete.');
    };

    fetchReleases();
  }, [repositories, localPathStates, isDataLoading, logger, settings.githubPat]);


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

  // Effect to apply GUI zoom factor
  useEffect(() => {
    const zoom = settings?.zoomFactor ?? 1;
    logger.debug('Applying GUI scale factor', { zoom });
    document.documentElement.style.fontSize = `${zoom * 100}%`;
  }, [settings?.zoomFactor, logger]);
  
  useEffect(() => {
    const bindings = settings.keyboardShortcuts?.bindings;
    if (!bindings) {
      return;
    }

    const entries: Array<{ matcher: ShortcutMatcher; handler: () => void }> = [];

    const isContextActive = (contextId?: string) => {
      if (!contextId || contextId === 'global') {
        return true;
      }
      if (contextId === 'dashboard' || contextId === 'repositories') {
        return activeView === 'dashboard';
      }
      if (contextId === 'settings') {
        return activeView === 'settings';
      }
      if (contextId === 'tasks') {
        return taskLogState.isOpen;
      }
      return true;
    };

    const register = (actionId: string, handler: () => void) => {
      const actionBindings = bindings[actionId];
      if (!actionBindings) {
        return;
      }

      actionBindings.forEach(binding => {
        if (binding.scope !== 'app') {
          return;
        }
        if (binding.platform !== 'all' && binding.platform !== shortcutPlatform) {
          return;
        }
        if (!binding.shortcut) {
          return;
        }
        if (!isContextActive(binding.context)) {
          return;
        }

        const matcher = parseShortcutString(binding.shortcut, shortcutPlatform);
        if (!matcher) {
          return;
        }

        entries.push({ matcher, handler });
      });
    };

    register('app.navigation.commandPalette', () => setCommandPaletteOpen(prev => !prev));
    register('app.navigation.switchDashboard', () => setActiveView('dashboard'));
    register('app.navigation.openSettings', () => setActiveView('settings'));
    register('app.view.toggleTaskLog', () =>
      setTaskLogState(prev => {
        if (prev.isOpen) {
          return { ...prev, isOpen: false };
        }

        const selectedId = prev.selectedId ?? prev.activeIds[0] ?? null;
        return { ...prev, isOpen: true, selectedId };
      }),
    );

    if (entries.length === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      for (const entry of entries) {
        if (eventMatchesShortcut(event, entry.matcher)) {
          event.preventDefault();
          entry.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    settings.keyboardShortcuts,
    shortcutPlatform,
    activeView,
    taskLogState.isOpen,
    setActiveView,
    setCommandPaletteOpen,
    setTaskLogState,
  ]);

  // Keep default debug panel toggle for now.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setIsDebugPanelOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const refreshRepoState = useCallback(async (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo || localPathStates[repo.id] !== 'valid') return;
    logger.info('Refreshing repository state', { repoId, name: repo.name });

    const status = await window.electronAPI?.getDetailedVcsStatus(repo);
    setDetailedStatuses(prev => ({ ...prev, [repoId]: status }));

    const branches = await window.electronAPI?.listBranches({ repoPath: repo.localPath, vcs: repo.vcs });
    setBranchLists(prev => ({ ...prev, [repoId]: branches }));

    if (repo.vcs === VcsType.Git) {
        // If the current branch in the state is different from the one on disk, update it
        if (branches?.current && repo.branch !== branches.current) {
            logger.info('Branch changed on disk, updating repository state.', { repoId, old: repo.branch, new: branches.current });
            updateRepository({ ...repo, branch: branches.current });
        }
        // Also refresh release info
        if (settings.githubPat) {
            const releaseInfo = await window.electronAPI?.getLatestRelease(repo);
            setLatestReleases(prev => ({ ...prev, [repoId]: releaseInfo }));
        }
    }
  }, [repositories, localPathStates, updateRepository, logger, settings.githubPat]);

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

  const performUpdateCheck = useCallback(async (options: { silent?: boolean; manageCheckingState?: boolean } = {}) => {
    const { silent = false, manageCheckingState = true } = options;
    const validRepos = repositories.filter(r => localPathStates[r.id] === 'valid');
    if (validRepos.length === 0) {
      if (!silent) {
        setToast({ message: 'No repositories with valid local paths to check.', type: 'info' });
      }
      return false;
    }

    if (manageCheckingState) {
      setIsCheckingAll(true);
    }
    if (!silent) {
      setToast({ message: `Checking ${validRepos.length} repositories for updates...`, type: 'info' });
    }

    const updatePromises = validRepos.map(repo => refreshRepoState(repo.id));

    try {
        await Promise.all(updatePromises);
        if (!silent) {
          setToast({ message: 'Update check complete.', type: 'success' });
        }
        return true;
    } catch (e: any) {
        logger.error('An error occurred during the update check for all repos.', { error: e.message });
        if (!silent) {
          setToast({ message: 'An error occurred during update check.', type: 'error' });
        }
        return false;
    } finally {
        if (manageCheckingState) {
          setIsCheckingAll(false);
        }
    }
  }, [repositories, localPathStates, refreshRepoState, logger, setToast]);

  const handleCheckAllForUpdates = useCallback(async () => {
    await performUpdateCheck();
  }, [performUpdateCheck]);

  useEffect(() => {
    if (autoCheckIntervalRef.current) {
      window.clearInterval(autoCheckIntervalRef.current);
      autoCheckIntervalRef.current = null;
    }

    if (!settings.autoCheckForUpdates) {
      return;
    }

    const intervalSeconds = Math.max(30, settings.autoCheckIntervalSeconds || 0);
    if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
      logger.warn('Skipping automatic update checks due to invalid interval.', { interval: settings.autoCheckIntervalSeconds });
      return;
    }

    const runAutoCheck = async () => {
      if (isCheckingAll || isAutoCheckingRef.current) {
        return;
      }
      isAutoCheckingRef.current = true;
      try {
        await performUpdateCheck({ silent: true, manageCheckingState: false });
      } catch (error: any) {
        logger.error('Automatic update check failed.', { error: error?.message || error });
      } finally {
        isAutoCheckingRef.current = false;
      }
    };

    runAutoCheck();

    autoCheckIntervalRef.current = window.setInterval(runAutoCheck, intervalSeconds * 1000);

    return () => {
      if (autoCheckIntervalRef.current) {
        window.clearInterval(autoCheckIntervalRef.current);
        autoCheckIntervalRef.current = null;
      }
    };
  }, [settings.autoCheckForUpdates, settings.autoCheckIntervalSeconds, isCheckingAll, performUpdateCheck, logger]);

  const handleSwitchBranch = useCallback(async (repoId: string, branch: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) return;
    logger.info('Attempting to switch branch', { repoId, branch, vcs: repo.vcs });

    try {
        const result = await window.electronAPI?.checkoutBranch({ repoPath: repo.localPath, branch, vcs: repo.vcs });
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

  const handleOpenRepoForm = (repoId: string | 'new', defaultCategoryId?: string) => {
    logger.info('Changing view to edit-repository', { repoId, defaultCategoryId });
    instrumentation?.trace('repo:form-opened', { repoId, defaultCategoryId, source: 'ui' });
    setRepoFormState({ repoId, defaultCategoryId });
    setActiveView('edit-repository');
  };

  const handleCloseRepoForm = useCallback(() => {
    logger.info('Changing view to dashboard');
    instrumentation?.trace('repo:form-closed', { source: 'ui' });
    setRepoFormState({ repoId: null });
    setActiveView('dashboard');
  }, [logger, instrumentation]);
  
  const handleSaveRepo = (repo: Repository, categoryId?: string) => {
    if (repositories.some(r => r.id === repo.id)) {
      logger.info('Updating repository', { repoId: repo.id, name: repo.name });
      instrumentation?.trace('repo:updated', { repoId: repo.id, name: repo.name, categoryId });
      updateRepository(repo);
      setToast({ message: 'Repository updated!', type: 'success' });
    } else {
      logger.info('Adding new repository', { name: repo.name, categoryId });
      instrumentation?.trace('repo:created', { name: repo.name, categoryId });
      // The repo object from the form doesn't have an ID yet.
      // addRepository creates it. We pass the raw data without the temporary ID.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, status, lastUpdated, buildHealth, ...repoData } = repo;
      addRepository(repoData, categoryId);
      setToast({ message: 'Repository added!', type: 'success' });
    }
    handleCloseRepoForm();
  };

  const handleDeleteRepo = (repoId: string) => {
    confirmAction({
      title: 'Delete Repository',
      message: 'Are you sure you want to delete this repository? This action cannot be undone.',
      confirmText: 'Delete',
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />,
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      onConfirm: () => {
        logger.warn('Deleting repository', { repoId });
        instrumentation?.trace('repo:deleted', { repoId });
        deleteRepository(repoId);
        setToast({ message: 'Repository deleted.', type: 'error' });
      }
    });
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

  const handleCancelTask = useCallback((repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) {
      setToast({ message: 'Repository not found.', type: 'error' });
      return;
    }

    const cancelResult = cancelTask(repoId);
    if (cancelResult === 'requested') {
      logger.warn('Cancellation requested for running task', { repoId, name: repo.name });
      instrumentation?.trace('task:run-cancel-requested', { repoId, repoName: repo.name });
      setToast({ message: 'Cancellation requested. Attempting to stop task...', type: 'info' });
    } else if (cancelResult === 'no-step') {
      setToast({ message: 'No running task to cancel.', type: 'info' });
    } else {
      setToast({ message: 'Task cancellation is not supported in this environment.', type: 'error' });
    }
  }, [repositories, cancelTask, logger, instrumentation]);

  const handleRunTask = useCallback(async (repoId: string, taskId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    const task = repo?.tasks.find(t => t.id === taskId);
    if (!repo || !task) {
      logger.error('Could not run task: repository or task not found', { repoId, taskId });
      setToast({ message: 'Repository or task not found.', type: 'error' });
      return;
    }

    logger.info(`Running task '${task.name}' on '${repo.name}'`, { repoId, taskId });
    instrumentation?.trace('task:run-start', { repoId, taskId, taskName: task.name });
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
        instrumentation?.trace('task:run-error', { repoId, taskId, error: e?.message ?? e });
        setToast({ message: e.message || 'Task failed!', type: 'error' });
      } else {
        logger.warn(`Task '${task.name}' was cancelled by user.`, { repoId, taskId });
        instrumentation?.trace('task:run-cancelled', { repoId, taskId });
        setToast({ message: 'Task was cancelled.', type: 'info' });
      }
    } finally {
      refreshRepoState(repoId); // Refresh status after task run
      instrumentation?.trace('task:run-finish', { repoId, taskId });
    }
  }, [repositories, settings, runTask, openLogPanelForRepo, refreshRepoState, logger, instrumentation]);

  const handleDirtyRepoChoice = async (choice: 'stash' | 'force' | 'cancel' | 'ignore', filesToIgnore?: string[]) => {
    const { resolve, repo } = dirtyRepoModal;

    if (!repo) {
      if (choice === 'cancel' && resolve) {
        resolve('cancel');
      }
      setDirtyRepoModal({ isOpen: false, repo: null, task: null, status: null, resolve: null, isIgnoring: false });
      return;
    }

    const isGitRepo = repo.vcs === VcsType.Git;

    if (choice === 'ignore') {
      if (!isGitRepo) {
        return;
      }
      if (!filesToIgnore || filesToIgnore.length === 0) {
        setToast({ message: 'No files selected to ignore.', type: 'info' });
        return;
      }
      setDirtyRepoModal(prev => ({ ...prev, isIgnoring: true }));
      try {
        const result = await window.electronAPI?.ignoreFilesAndPush({ repo, filesToIgnore });
        if (result?.success) {
          setToast({ message: '.gitignore updated and pushed successfully.', type: 'success' });
          if (resolve) resolve('ignored_and_continue');
          setDirtyRepoModal({ isOpen: false, repo: null, task: null, status: null, resolve: null, isIgnoring: false });
        } else {
          throw new Error(result?.error || 'Failed to update .gitignore');
        }
      } catch (e: any) {
        setToast({ message: `Failed to update .gitignore: ${e.message}`, type: 'error' });
        setDirtyRepoModal(prev => ({ ...prev, isIgnoring: false }));
      }
      return;
    }

    if (choice === 'stash') {
      if (!isGitRepo) {
        return;
      }
      if (resolve) {
        resolve('stash');
      }
      setDirtyRepoModal({ isOpen: false, repo: null, task: null, status: null, resolve: null, isIgnoring: false });
      return;
    }

    if (choice === 'force' || choice === 'cancel') {
      if (resolve) {
        resolve(choice);
      }
      setDirtyRepoModal({ isOpen: false, repo: null, task: null, status: null, resolve: null, isIgnoring: false });
    }
  };

  const handleOpenTaskSelection = (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (repo && repo.tasks.length > 0) {
      instrumentation?.trace('task:selection-opened', { repoId, taskCount: repo.tasks.length });
      setTaskSelectionModal({ isOpen: true, repo });
    }
  };

  const handleViewLogs = (repoId: string) => {
    openLogPanelForRepo(repoId, false);
  };
  
  const handleViewHistory = useCallback(async (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) {
      logger.warn('Attempted to open history for unknown repository.', { repoId });
      return;
    }

    let initialCommits: Commit[] | null = null;

    if (localPathStates[repo.id] === 'valid') {
      try {
        await refreshRepoState(repoId);
      } catch (error: any) {
        logger.warn('Failed to refresh repository state before opening history modal.', {
          repoId,
          error: error?.message || error,
        });
      }

      if (window.electronAPI?.getCommitHistory) {
        try {
          initialCommits = await window.electronAPI.getCommitHistory(repo, 0);
        } catch (error: any) {
          logger.error('Failed to prefetch commit history.', {
            repoId,
            error: error?.message || error,
          });
          setToast({ message: 'Failed to fetch commit history. Data may be outdated.', type: 'error' });
        }
      } else {
        logger.warn('Commit history API is not available in the current environment.');
      }
    } else {
      logger.warn('Cannot open history modal because repository path is not valid.', { repoId });
      setToast({ message: 'Repository path is unavailable. Cannot load commit history.', type: 'error' });
    }

    setHistoryModal({ isOpen: true, repo, initialCommits });
  }, [repositories, logger, localPathStates, refreshRepoState, setToast]);

  const handleRunLaunchable = useCallback(async (repo: Repository, launchable: Launchable) => {
    logger.info('Running launchable', { repoId: repo.id, launchable });
    instrumentation?.trace('launch:run', {
      repoId: repo.id,
      type: launchable.type,
      identifier: launchable.type === 'manual' ? launchable.config.id : launchable.path,
    });
    openLogPanelForRepo(repo.id, true);
    if (launchable.type === 'manual') {
      if (launchable.config.type === 'command' && launchable.config.command) {
        await launchApplication(repo, launchable.config.command);
      } else if (launchable.config.type === 'select-executable') {
        handleOpenExecutableSelection(repo.id, launchable.config.id);
      }
    } else {
      await launchExecutable(repo, launchable.path);
    }
  }, [launchApplication, launchExecutable, openLogPanelForRepo, logger, instrumentation]);

  const handleRunLaunchConfig = useCallback(async (repoId: string, configId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    const config = repo?.launchConfigs?.find(lc => lc.id === configId);
    if (!repo || !config) {
        logger.error('Could not run launch config: not found', { repoId, configId });
        setToast({ message: 'Repository or launch config not found.', type: 'error' });
        return;
    }

    instrumentation?.trace('launch:config-trigger', { repoId, configId, configType: config.type });
    if (config.type === 'command' && config.command) {
        logger.info('Running launch config (command)', { repoId, config });
        openLogPanelForRepo(repoId, true);
        await launchApplication(repo, config.command);
    } else if (config.type === 'select-executable') {
        logger.info('Opening executable selection for launch config', { repoId, config });
        handleOpenExecutableSelection(repoId, configId);
    }
  }, [repositories, launchApplication, openLogPanelForRepo, logger, instrumentation]);

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
        instrumentation?.trace('launch:selection-opened', { repoId, launchableCount: launchables.length });
        setLaunchSelectionModal({ isOpen: true, repo, launchables });
    } else {
        instrumentation?.trace('launch:selection-empty', { repoId });
        setToast({ message: 'No other launch options found.', type: 'info' });
    }
  }, [repositories, detectedExecutables, instrumentation]);

  const handleOpenExecutableSelection = (repoId: string, configId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    const config = repo?.launchConfigs?.find(lc => lc.id === configId);
    const executables = detectedExecutables[repoId] || [];

    if (repo && config && executables.length > 0) {
      instrumentation?.trace('launch:executable-selection-opened', { repoId, configId, candidates: executables.length });
      setExecutableSelectionModal({
        isOpen: true,
        repo,
        launchConfig: config,
        executables
      });
    } else {
      instrumentation?.trace('launch:executable-selection-unavailable', { repoId, configId, candidates: executables.length });
      setToast({ message: 'No executables detected in release/dist/build folders.', type: 'info' });
    }
  };


  const handleCloneRepo = useCallback(async (repo: Repository) => {
    logger.info('Cloning repository', { repoId: repo.id, url: repo.remoteUrl });
    instrumentation?.trace('repo:clone-start', { repoId: repo.id });
    openLogPanelForRepo(repo.id, true);

    try {
      await cloneRepository(repo);
      // After cloning, re-check the path status
      const newState = await window.electronAPI?.checkLocalPath(repo.localPath) ?? 'missing';
      setLocalPathStates(prev => ({...prev, [repo.id]: newState}));
      instrumentation?.trace('repo:clone-success', { repoId: repo.id, newState });
    } catch (e: any) {
      logger.error('Clone failed', { repoId: repo.id, error: e.message });
      instrumentation?.trace('repo:clone-error', { repoId: repo.id, error: e?.message ?? e });
      setToast({ message: e.message || 'Clone failed!', type: 'error' });
    }
  }, [cloneRepository, openLogPanelForRepo, logger, instrumentation]);

  const handleChooseLocationAndClone = useCallback(async (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) {
      setToast({ message: 'Repository not found.', type: 'error' });
      return;
    }

    try {
      const result = await window.electronAPI?.showDirectoryPicker();
      if (!result || result.canceled || result.filePaths.length === 0) {
        instrumentation?.trace('repo:clone-location-cancelled', { repoId });
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

      instrumentation?.trace('repo:clone-location-selected', { repoId, newLocalPath });

      // Immediately trigger the clone with the updated repo object
      await handleCloneRepo(updatedRepo);

    } catch (e: any) {
      logger.error('Failed to set up path for cloning', { repoId, error: e.message });
      instrumentation?.trace('repo:clone-location-error', { repoId, error: e?.message ?? e });
      setToast({ message: e.message || 'Failed to set up repository path.', type: 'error' });
    }
  }, [repositories, updateRepository, handleCloneRepo, logger, instrumentation]);

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

  const handleOpenWeblink = useCallback(async (url: string) => {
    if (!url) {
      setToast({ message: 'URL is not configured.', type: 'info' });
      return;
    }
    try {
      const result = await window.electronAPI?.openWeblink(url);
      if (!result?.success) {
        setToast({ message: result?.error || 'Failed to open the link.', type: 'error' });
      }
    } catch (e: any) {
      setToast({ message: e.message || 'An error occurred while trying to open the link.', type: 'error' });
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
    // FIX: Explicitly type accumulator and current value in reduce to fix type inference issue.
    return allLogs.reduce((latest: LogEntry, current: LogEntry) => new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest);
  }, [logs]);

  const repositoryToEdit = useMemo(() => {
    if (repoFormState.repoId === 'new' || !repoFormState.repoId) {
        return null;
    }
    return repositories.find(r => r.id === repoFormState.repoId) || null;
  }, [repoFormState.repoId, repositories]);

  const canCollapseAll = useMemo(() => 
    categories.length > 0 && categories.some(c => !(c.collapsed ?? false)),
    [categories]
  );

  useEffect(() => {
    logger.debug(`App view changed to: ${activeView}`, { view: activeView, repoFormState });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, repoFormState.repoId]);

  const mainContentClass = useMemo(() => {
    switch (activeView) {
      case 'dashboard':
        return `flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6`;
      case 'info':
        return `flex-1 overflow-y-auto`;
      case 'settings':
      case 'edit-repository':
        return `flex-1 flex flex-col min-h-0`;
      default:
        return "flex-1";
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
        <div
          className="flex flex-col h-screen"
          data-automation-id="app-shell"
          data-active-view={activeView}
        >
          <TitleBar
            activeView={activeView}
            onSetView={setActiveView}
            onNewRepo={() => handleOpenRepoForm('new')}
            onCheckAllForUpdates={handleCheckAllForUpdates}
            isCheckingAll={isCheckingAll}
            onToggleAllCategories={toggleAllCategoriesCollapse}
            canCollapseAll={canCollapseAll}
            updateReady={updateReady}
            onInstallUpdate={handleRestartAndUpdate}
            onShowUpdateDetails={handleShowUpdateDetails}
          />
          <div className="flex-1 flex flex-col min-h-0">
            {updateReady && isUpdateBannerVisible && updateStatus?.status === 'downloaded' && (
              <UpdateBanner
                version={updateStatus.version}
                message={updateStatus.message}
                autoInstallMode={settings.autoInstallUpdates}
                autoInstallScheduled={autoInstallScheduled}
                onChangeMode={handleAutoInstallPreferenceChange}
                onInstallNow={handleRestartAndUpdate}
                onInstallLater={handleDeferUpdate}
              />
            )}
            <main
              className={mainContentClass}
              data-automation-id="main-content"
              data-active-view={activeView}
            >
              {(() => {
                switch (activeView) {
                  case 'settings':
                    return <SettingsView currentSettings={settings} onSave={handleSaveSettings} setToast={setToast} confirmAction={confirmAction} />;
                  case 'info':
                    return <InfoView />;
                  case 'edit-repository':
                    // The key ensures the component re-mounts when switching between editing different repos
                    return <RepoEditView
                      key={repoFormState.repoId}
                      repository={repositoryToEdit}
                      onSave={handleSaveRepo}
                      onCancel={handleCloseRepoForm}
                      onRefreshState={refreshRepoState}
                      setToast={setToast}
                      confirmAction={confirmAction}
                      defaultCategoryId={repoFormState.defaultCategoryId}
                      onOpenWeblink={handleOpenWeblink}
                      detectedExecutables={detectedExecutables}
                    />;
                  case 'dashboard':
                  default:
                    return <Dashboard 
                      repositories={repositories} 
                      categories={categories}
                      uncategorizedOrder={uncategorizedOrder}
                      onAddCategory={addCategory}
                      onUpdateCategory={updateCategory}
                      onDeleteCategory={(catId) => {
                        confirmAction({
                          title: 'Delete Category',
                          message: 'Are you sure you want to delete this category? Repositories within it will become uncategorized.',
                          confirmText: 'Delete',
                          icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />,
                          confirmButtonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                          onConfirm: () => {
                            deleteCategory(catId);
                            setToast({ message: 'Category deleted.', type: 'info' });
                          }
                        });
                      }}
                      onMoveRepositoryToCategory={moveRepositoryToCategory}
                      onMoveRepository={moveRepository}
                      onToggleCategoryCollapse={toggleCategoryCollapse}
                      onMoveCategory={moveCategory}
                      onReorderCategories={reorderCategories}
                      onOpenTaskSelection={handleOpenTaskSelection}
                      onRunTask={handleRunTask}
                      onCancelTask={handleCancelTask}
                      onViewLogs={handleViewLogs}
                      onViewHistory={handleViewHistory}
                      onOpenRepoForm={handleOpenRepoForm}
                      onDeleteRepo={handleDeleteRepo}
                      isProcessing={isProcessing}
                      localPathStates={localPathStates}
                      detectedExecutables={detectedExecutables}
                      detailedStatuses={detailedStatuses}
                      branchLists={branchLists}
                      // FIX: Pass latestReleases prop to Dashboard.
                      latestReleases={latestReleases}
                      onSwitchBranch={handleSwitchBranch}
                      onCloneRepo={(repoId) => {
                        const repo = repositories.find(r => r.id === repoId);
                        if (repo) handleCloneRepo(repo);
                      }}
                      onChooseLocationAndClone={handleChooseLocationAndClone}
                      onRunLaunchConfig={handleRunLaunchConfig}
                      onOpenLaunchSelection={handleOpenLaunchSelection}
                      onOpenLocalPath={handleOpenLocalPath}
                      onOpenWeblink={handleOpenWeblink}
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
                onCancelTask={handleCancelTask}
              />
            )}
          </div>
          
          <StatusBar
            repoCount={repositories.length}
            processingCount={isProcessing.size}
            isSimulationMode={settings.simulationMode}
            latestLog={latestLog}
            appVersion={appVersion}
            onToggleDebugPanel={() => setIsDebugPanelOpen(p => !p)}
            onOpenAboutModal={() => setIsAboutModalOpen(true)}
            commandPaletteShortcut={commandPaletteShortcutLabel}
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
            onEditRepo={handleOpenRepoForm}
            onDeleteRepo={handleDeleteRepo}
            detectedExecutables={detectedExecutables}
          />

          <DirtyRepoModal
            isOpen={dirtyRepoModal.isOpen}
            status={dirtyRepoModal.status}
            onChoose={handleDirtyRepoChoice}
            isIgnoring={dirtyRepoModal.isIgnoring}
            vcsType={dirtyRepoModal.repo?.vcs ?? null}
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
              setExecutableSelectionModal({ isOpen: false, repo: null, launchConfig: null, executables: [] });
            }}
          />

          <CommitHistoryModal
              isOpen={historyModal.isOpen}
              repository={historyModal.repo}
              initialCommits={historyModal.initialCommits}
              onClose={() => setHistoryModal({ isOpen: false, repo: null, initialCommits: null })}
          />
          
          <ConfirmationModal
            isOpen={confirmationModal.isOpen}
            title={confirmationModal.title}
            message={confirmationModal.message}
            onConfirm={confirmationModal.onConfirm}
            onCancel={confirmationModal.onCancel}
            confirmText={confirmationModal.confirmText}
            confirmButtonClass={confirmationModal.confirmButtonClass}
            icon={confirmationModal.icon}
          />
          
          <AboutModal 
            isOpen={isAboutModalOpen}
            onClose={() => setIsAboutModalOpen(false)}
            appVersion={appVersion}
          />

          <CommandPalette 
              isOpen={isCommandPaletteOpen}
              onClose={() => setCommandPaletteOpen(false)}
              repositories={repositories}
              onSetView={setActiveView}
              onNewRepo={() => handleOpenRepoForm('new')}
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