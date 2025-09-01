import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRepositoryManager } from './hooks/useRepositoryManager';
import type { Repository, GlobalSettings, AppView, Task, LogEntry, LocalPathState, Launchable, LaunchConfig, UpdateStatus, DetailedStatus, BranchInfo } from './types';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import RepoEditView from './components/modals/RepoFormModal'; // Repurposed for the new view
import Toast from './components/Toast';
import InfoView from './components/InfoView';
import SettingsView from './components/SettingsView';
import LogPanel from './components/LogPanel';
import { IconContext } from './contexts/IconContext';
import CommandPalette from './components/CommandPalette';
import StatusBar from './components/StatusBar';
import DirtyRepoModal from './components/modals/DirtyRepoModal';
import TaskSelectionModal from './components/modals/TaskSelectionModal';
import LaunchSelectionModal from './components/modals/LaunchSelectionModal';
import CommitHistoryModal from './components/modals/CommitHistoryModal';
import ExecutableSelectionModal from './components/modals/ExecutableSelectionModal';
import { VcsType } from './types';

const App: React.FC = () => {
  const {
    repositories,
    addRepository,
    updateRepository,
    deleteRepository,
    runTask,
    cloneRepository,
    launchApplication,
    launchExecutable,
    logs,
    clearLogs,
    isProcessing,
  } = useRepositoryManager();
  
  const [repoToEditId, setRepoToEditId] = useState<string | 'new' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [localPathStates, setLocalPathStates] = useState<Record<string, LocalPathState>>({});
  const [detectedExecutables, setDetectedExecutables] = useState<Record<string, string[]>>({});
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('checking');

  // New states for deeper VCS integration
  const [detailedStatuses, setDetailedStatuses] = useState<Record<string, DetailedStatus | null>>({});
  const [branchLists, setBranchLists] = useState<Record<string, BranchInfo | null>>({});
  
  const [logPanel, setLogPanel] = useState({
    isOpen: false,
    repoId: null as string | null,
    height: 300,
  });

  const [dirtyRepoModal, setDirtyRepoModal] = useState<{
    isOpen: boolean;
    repo: Repository | null;
    task: Task | null;
    statusOutput: string;
    resolve: ((choice: 'stash' | 'force' | 'cancel') => void) | null;
  }>({ isOpen: false, repo: null, task: null, statusOutput: '', resolve: null });

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


  const [settings, setSettings] = useState<GlobalSettings>(() => {
    try {
      const savedSettings = localStorage.getItem('globalSettings');
      const defaults = {
        defaultBuildCommand: 'npm run build',
        notifications: true,
        simulationMode: true,
        theme: 'dark' as 'light' | 'dark',
        iconSet: 'heroicons' as 'heroicons' | 'lucide',
      };
      return savedSettings ? { ...defaults, ...JSON.parse(savedSettings) } : defaults;
    } catch {
      // Fallback to defaults if settings are corrupt
      return {
        defaultBuildCommand: 'npm run build',
        notifications: true,
        simulationMode: true,
        theme: 'dark',
        iconSet: 'heroicons',
      };
    }
  });

  // Effect for app version and update status
  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(setAppVersion);
      window.electronAPI.onUpdateStatusChanged((_event, { status }) => {
        setUpdateStatus(status);
      });
    }
  }, []);
  
  // Effect to check local paths
  useEffect(() => {
    const checkPaths = async () => {
        if (repositories.length === 0) {
            setLocalPathStates({});
            return;
        }
        
        const checkingStates: Record<string, LocalPathState> = {};
        for (const repo of repositories) {
            checkingStates[repo.id] = 'checking';
        }
        setLocalPathStates(checkingStates);

        const finalStates: Record<string, LocalPathState> = {};
        for (const repo of repositories) {
            finalStates[repo.id] = await window.electronAPI.checkLocalPath(repo.localPath);
        }
        setLocalPathStates(finalStates);
    };
    checkPaths();
  }, [repositories]);
  
  // New effect to fetch detailed VCS statuses and branch lists
  useEffect(() => {
    const fetchStatuses = async () => {
      const statusPromises = repositories.map(async (repo) => {
        if (localPathStates[repo.id] === 'valid') {
          const status = await window.electronAPI.getDetailedVcsStatus(repo);
          return { repoId: repo.id, status };
        }
        return { repoId: repo.id, status: null };
      });
      const statuses = await Promise.all(statusPromises);
      setDetailedStatuses(statuses.reduce((acc, s) => ({ ...acc, [s.repoId]: s.status }), {}));
      
      const branchPromises = repositories.map(async (repo) => {
        if (localPathStates[repo.id] === 'valid' && repo.vcs === VcsType.Git) {
          const branches = await window.electronAPI.listBranches(repo.localPath);
          return { repoId: repo.id, branches };
        }
        return { repoId: repo.id, branches: null };
      });
      const branches = await Promise.all(branchPromises);
      setBranchLists(branches.reduce((acc, b) => ({ ...acc, [b.repoId]: b.branches }), {}));
    };

    fetchStatuses();
  }, [repositories, localPathStates]);


  // Effect to detect executables when paths are validated
  useEffect(() => {
    const detectAll = async () => {
      const executablesByRepo: Record<string, string[]> = {};
      for (const repo of repositories) {
        if (localPathStates[repo.id] === 'valid' && repo.localPath) {
          try {
            executablesByRepo[repo.id] = await window.electronAPI.detectExecutables(repo.localPath);
          } catch (error) {
            console.error(`Failed to detect executables for ${repo.name}:`, error);
            executablesByRepo[repo.id] = [];
          }
        }
      }
      setDetectedExecutables(executablesByRepo);
    };
    detectAll();
  }, [repositories, localPathStates]);

  // Effect to apply theme
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);
  
  // Effect for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setCommandPaletteOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const refreshRepoState = useCallback(async (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo || localPathStates[repo.id] !== 'valid') return;

    const status = await window.electronAPI.getDetailedVcsStatus(repo);
    setDetailedStatuses(prev => ({ ...prev, [repoId]: status }));

    if (repo.vcs === VcsType.Git) {
        const branches = await window.electronAPI.listBranches(repo.localPath);
        setBranchLists(prev => ({ ...prev, [repoId]: branches }));
        // If the current branch in the state is different from the one on disk, update it
        if (branches.current && repo.branch !== branches.current) {
            updateRepository({ ...repo, branch: branches.current });
        }
    }
  }, [repositories, localPathStates, updateRepository]);

  const handleSwitchBranch = useCallback(async (repoId: string, branch: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo || repo.vcs !== VcsType.Git) return;

    try {
        const result = await window.electronAPI.checkoutBranch(repo.localPath, branch);
        if (result.success) {
            setToast({ message: `Switched to branch '${branch}'`, type: 'success' });
            await refreshRepoState(repoId);
        } else {
            setToast({ message: `Failed to switch branch: ${result.error}`, type: 'error' });
        }
    } catch (e: any) {
        setToast({ message: e.message || 'An error occurred.', type: 'error' });
    }
  }, [repositories, refreshRepoState]);

  const handleSaveSettings = (newSettings: GlobalSettings) => {
    setSettings(newSettings);
    localStorage.setItem('globalSettings', JSON.stringify(newSettings));
    setToast({ message: 'Settings saved successfully!', type: 'success' });
  };

  const handleEditRepository = (repoId: string | 'new') => {
    setRepoToEditId(repoId);
    setActiveView('edit-repository');
  };

  const handleCancelEditRepository = () => {
    setRepoToEditId(null);
    setActiveView('dashboard');
  };
  
  const handleSaveRepo = (repo: Repository) => {
    if (repositories.some(r => r.id === repo.id)) {
      updateRepository(repo);
      setToast({ message: 'Repository updated!', type: 'success' });
    } else {
      addRepository(repo);
      setToast({ message: 'Repository added!', type: 'success' });
    }
    handleCancelEditRepository();
  };

  const handleDeleteRepo = (repoId: string) => {
    if (window.confirm('Are you sure you want to delete this repository?')) {
      deleteRepository(repoId);
      setToast({ message: 'Repository deleted.', type: 'error' });
    }
  };

  const handleRunTask = useCallback(async (repoId: string, taskId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    const task = repo?.tasks.find(t => t.id === taskId);
    if (!repo || !task) {
      setToast({ message: 'Repository or task not found.', type: 'error' });
      return;
    }

    clearLogs(repoId);
    setLogPanel({ isOpen: true, repoId, height: logPanel.height });
    
    const onDirty = (statusOutput: string) => {
      return new Promise<'stash' | 'force' | 'cancel'>((resolve) => {
        setDirtyRepoModal({ isOpen: true, repo, task, statusOutput, resolve });
      });
    };

    try {
      await runTask(repo, task, settings, onDirty);
    } catch (e: any) {
      if (e.message !== 'cancelled') { // Don't show toast for user cancellation
        setToast({ message: e.message || 'Task failed!', type: 'error' });
      } else {
        setToast({ message: 'Task was cancelled.', type: 'info' });
      }
    } finally {
        refreshRepoState(repoId); // Refresh status after task run
    }
  }, [repositories, settings, runTask, clearLogs, logPanel.height, refreshRepoState]);

  const handleDirtyRepoChoice = (choice: 'stash' | 'force' | 'cancel') => {
    if (dirtyRepoModal.resolve) {
      dirtyRepoModal.resolve(choice);
    }
    setDirtyRepoModal({ isOpen: false, repo: null, task: null, statusOutput: '', resolve: null });
  };

  const handleOpenTaskSelection = (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (repo && repo.tasks.length > 0) {
      setTaskSelectionModal({ isOpen: true, repo });
    }
  };

  const handleViewLogs = (repoId: string) => {
    setLogPanel({ isOpen: true, repoId, height: logPanel.height });
  };
  
  const handleViewHistory = useCallback((repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (repo) {
        setHistoryModal({ isOpen: true, repo });
    }
  }, [repositories]);

  const handleRunLaunchable = useCallback(async (repo: Repository, launchable: Launchable) => {
      clearLogs(repo.id);
      setLogPanel({ isOpen: true, repoId: repo.id, height: logPanel.height });
      if (launchable.type === 'manual') {
        if(launchable.config.type === 'command' && launchable.config.command) {
            await launchApplication(repo, launchable.config.command);
        } else if (launchable.config.type === 'select-executable') {
            handleOpenExecutableSelection(repo.id, launchable.config.id);
        }
      } else {
        await launchExecutable(repo, launchable.path);
      }
    }, [launchApplication, launchExecutable, clearLogs, logPanel.height, repositories, detectedExecutables]);

  const handleRunLaunchConfig = useCallback(async (repoId: string, configId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    const config = repo?.launchConfigs?.find(lc => lc.id === configId);
    if (!repo || !config) {
        setToast({ message: 'Repository or launch config not found.', type: 'error' });
        return;
    }

    if (config.type === 'command' && config.command) {
        clearLogs(repoId);
        setLogPanel({ isOpen: true, repoId, height: logPanel.height });
        await launchApplication(repo, config.command);
    } else if (config.type === 'select-executable') {
        handleOpenExecutableSelection(repoId, configId);
    }
  }, [repositories, launchApplication, clearLogs, logPanel.height, detectedExecutables]);

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
    clearLogs(repo.id);
    setLogPanel({ isOpen: true, repoId: repo.id, height: logPanel.height });
    
    try {
        await cloneRepository(repo);
        // After cloning, re-check the path status
        const newState = await window.electronAPI.checkLocalPath(repo.localPath);
        setLocalPathStates(prev => ({...prev, [repo.id]: newState}));
    } catch (e: any) {
        setToast({ message: e.message || 'Clone failed!', type: 'error' });
    }
  }, [cloneRepository, clearLogs, logPanel.height]);

  const handleChooseLocationAndClone = useCallback(async (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) {
      setToast({ message: 'Repository not found.', type: 'error' });
      return;
    }

    try {
      const result = await window.electronAPI.showDirectoryPicker();
      if (result.canceled || result.filePaths.length === 0) {
        setToast({ message: 'Location selection was cancelled.', type: 'info' });
        return;
      }

      const parentDir = result.filePaths[0];
      // Sanitize repo name to be used as a directory name
      const repoDirName = repo.name.replace(/[^a-zA-Z0-9_.-]/g, '-').toLowerCase();
      const newLocalPath = await window.electronAPI.pathJoin(parentDir, repoDirName);

      const updatedRepo = { ...repo, localPath: newLocalPath };
      updateRepository(updatedRepo);
      
      // Immediately trigger the clone with the updated repo object
      await handleCloneRepo(updatedRepo);

    } catch (e: any) {
      setToast({ message: e.message || 'Failed to set up repository path.', type: 'error' });
    }
  }, [repositories, updateRepository, handleCloneRepo]);

  const handleOpenLocalPath = useCallback(async (path: string) => {
    if (!path) {
      setToast({ message: 'Local path is not configured.', type: 'info' });
      return;
    }
    try {
      const result = await window.electronAPI.openLocalPath(path);
      if (!result.success) {
        setToast({ message: result.error || 'Failed to open the local folder.', type: 'error' });
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
      const result = await window.electronAPI.openTerminal(path);
      if (result.success) {
        setToast({ message: 'Terminal opened successfully.', type: 'success' });
      } else {
        setToast({ message: result.error || 'Failed to open terminal.', type: 'error' });
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

  const CurrentView = () => {
    switch (activeView) {
      case 'settings':
        return <SettingsView currentSettings={settings} onSave={handleSaveSettings} />;
      case 'info':
        return <InfoView />;
      case 'edit-repository':
        const repo = repoToEditId === 'new' ? null : repositories.find(r => r.id === repoToEditId) || null;
        // The key ensures the component re-mounts when switching between editing different repos
        return <RepoEditView 
          key={repoToEditId} 
          repository={repo} 
          onSave={handleSaveRepo} 
          onCancel={handleCancelEditRepository}
          onRefreshState={refreshRepoState}
          setToast={setToast}
        />;
      case 'dashboard':
      default:
        return <Dashboard 
          repositories={repositories} 
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
        />;
    }
  };

  return (
    <IconContext.Provider value={settings.iconSet}>
      <div className="flex flex-col h-screen">
        <Header onNewRepo={() => handleEditRepository('new')} activeView={activeView} onSetView={setActiveView} />
        <main className={`flex-1 overflow-y-auto ${activeView === 'dashboard' ? 'p-3 sm:p-4 lg:p-6' : ''}`}>
          <CurrentView />
        </main>
        
        <StatusBar 
          repoCount={repositories.length} 
          processingCount={isProcessing.size} 
          isSimulationMode={settings.simulationMode}
          latestLog={latestLog}
          appVersion={appVersion}
          updateStatus={updateStatus}
        />
        
        {logPanel.isOpen && (
          <LogPanel 
            isOpen={logPanel.isOpen} 
            onClose={() => setLogPanel(prev => ({ ...prev, isOpen: false }))}
            logs={logs[logPanel.repoId || ''] || []}
            repository={repositories.find(r => r.id === logPanel.repoId)}
            height={logPanel.height}
            setHeight={(h) => setLogPanel(p => ({...p, height: h}))}
          />
        )}
        
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <DirtyRepoModal
          isOpen={dirtyRepoModal.isOpen}
          statusOutput={dirtyRepoModal.statusOutput}
          onChoose={handleDirtyRepoChoice}
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
                clearLogs(repo.id);
                setLogPanel({ isOpen: true, repoId: repo.id, height: logPanel.height });
                launchExecutable(repo, executablePath);
            }
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
    </IconContext.Provider>
  );
};

export default App;
