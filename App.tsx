import React, { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Correct type import for LaunchConfig
import type { AppView, Repository, GlobalSettings, LogEntry, Launchable, ToastMessage, Category, LocalPathState, DetailedStatus, BranchInfo, LaunchConfig, AllData } from './types';
import { useSettings } from './contexts/SettingsContext';
import { useRepositoryManager } from './hooks/useRepositoryManager';
import { useLogger } from './hooks/useLogger';
import { IconContext } from './contexts/IconContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SettingsView from './components/SettingsView';
import InfoView from './components/InfoView';
import RepoFormModal from './components/modals/RepoFormModal';
import TaskSelectionModal from './components/modals/TaskSelectionModal';
import LaunchSelectionModal from './components/modals/LaunchSelectionModal';
import TaskLogPanel from './components/TaskLogPanel';
import Toast from './components/Toast';
import ConfirmationModal from './components/modals/ConfirmationModal';
import DirtyRepoModal from './components/modals/DirtyRepoModal';
import CommitHistoryModal from './components/modals/CommitHistoryModal';
import ExecutableSelectionModal from './components/modals/ExecutableSelectionModal';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette';
import UpdateBanner from './components/UpdateBanner';
import DebugPanel from './components/DebugPanel';
import { TooltipProvider } from './contexts/TooltipContext';
import Tooltip from './components/Tooltip';

const App: React.FC = () => {
  const { settings, setSettings, isLoaded } = useSettings();
  const logger = useLogger();

  // App State
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [editingRepoId, setEditingRepoId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  // Modals and Panels State
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
  const [activeLogRepoIds, setActiveLogRepoIds] = useState<string[]>([]);
  const [selectedLogRepoId, setSelectedLogRepoId] = useState<string | null>(null);
  const [logPanelHeight, setLogPanelHeight] = useState(300);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);

  // Task/Launch Modals
  const [taskSelectionRepo, setTaskSelectionRepo] = useState<Repository | null>(null);
  const [launchSelection, setLaunchSelection] = useState<{ repo: Repository, launchables: Launchable[] } | null>(null);
  const [commitHistoryRepo, setCommitHistoryRepo] = useState<Repository | null>(null);
  // FIX: Correctly type the config property with LaunchConfig instead of trying to access it from a union type.
  const [execSelection, setExecSelection] = useState<{ repo: Repository, config: LaunchConfig } | null>(null);

  // Confirmation/Dialogs
  const [confirmation, setConfirmation] = useState<any>(null);
  const [dirtyRepo, setDirtyRepo] = useState<{ repo: Repository, task: any, status: any, resolve: (choice: any) => void } | null>(null);

  // Repo-specific states
  const [localPathStates, setLocalPathStates] = useState<Record<string, LocalPathState>>({});
  const [detailedStatuses, setDetailedStatuses] = useState<Record<string, DetailedStatus | null>>({});
  const [branchInfos, setBranchInfos] = useState<Record<string, BranchInfo | null>>({});
  const [detectedExecutables, setDetectedExecutables] = useState<Record<string, string[]>>({});

  // Core Logic
  const { runTask, cloneRepository, launchApplication, launchExecutable, logs, isProcessing } = useRepositoryManager({
    repositories,
    updateRepository: (updatedRepo) => {
      setRepositories(prev => prev.map(r => r.id === updatedRepo.id ? updatedRepo : r));
    }
  });

  const onDirtyPrompt = useCallback((statusResult: any) => {
    return new Promise<'stash' | 'force' | 'cancel' | 'ignored_and_continue'>((resolve) => {
      // This is a simplified version. In a real app, you'd pass the repo and task info.
      setDirtyRepo({ repo: {} as Repository, task: {}, status: statusResult, resolve });
    });
  }, []);

  const handleRunTask = useCallback(async (repoId: string, taskId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    const task = repo?.tasks.find(t => t.id === taskId);
    if (repo && task) {
      if (!activeLogRepoIds.includes(repoId)) {
        setActiveLogRepoIds(prev => [...prev, repoId]);
      }
      setSelectedLogRepoId(repoId);
      setIsLogPanelOpen(true);
      try {
        await runTask(repo, task, settings, onDirtyPrompt);
        if (settings.notifications) setToast({ message: `Task '${task.name}' completed`, type: 'success' });
      } catch (error: any) {
        if (error.message !== 'cancelled' && settings.notifications) {
          setToast({ message: `Task '${task.name}' failed`, type: 'error' });
        }
      }
    }
  }, [repositories, runTask, settings, onDirtyPrompt, activeLogRepoIds]);

  const handleRunLaunchable = useCallback(async (repo: Repository, launchable: Launchable) => {
    if (launchable.type === 'manual') {
      if (launchable.config.type === 'command' && launchable.config.command) {
        await launchApplication(repo, launchable.config.command);
      } else if (launchable.config.type === 'select-executable') {
        setExecSelection({ repo, config: launchable.config });
      }
    } else { // detected
      await launchExecutable(repo, launchable.path);
    }
  }, [launchApplication, launchExecutable]);

  const confirmAction = useCallback((options: any) => {
    setConfirmation({ ...options, isOpen: true });
  }, []);

  // Effect to load initial data
  useEffect(() => {
    if (window.electronAPI) {
        // Electron Environment: Load data from files
        window.electronAPI.getInitialData().then((data: AllData) => {
            setRepositories(data.repositories || []);
            setCategories(data.categories || []);
            logger.info("App: Initial repo and category data loaded from main process.");
        });

        window.electronAPI.getAppVersion().then(setAppVersion);
        window.electronAPI.onUpdateAvailable(() => setIsUpdateAvailable(true));
        
        return () => {
            window.electronAPI?.removeUpdateAvailableListener();
        }
    } else {
        // Web Environment: Initialize with defaults
        setRepositories([]);
        setCategories([]);
        setAppVersion('web');
        logger.info("App: Running in web mode. Initialized with empty data.");
    }
  }, [logger]);
  
  // Effect for Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(p => !p);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setIsDebugPanelOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const latestLog = useMemo(() => {
    const allLogs = Object.values(logs).flat();
    return allLogs.length > 0 ? allLogs[allLogs.length - 1] : null;
  }, [logs]);

  const handleSaveSettings = (newSettings: GlobalSettings) => {
    setSettings(newSettings);
    setToast({ message: "Settings saved!", type: 'success' });
  };
  
  const handleSaveRepo = (repo: Repository) => {
    const exists = repositories.some(r => r.id === repo.id);
    const newRepos = exists
      ? repositories.map(r => r.id === repo.id ? repo : r)
      : [...repositories, repo];
    setRepositories(newRepos);
    window.electronAPI?.saveRepositories(newRepos);
    setEditingRepoId(null);
    setActiveView('dashboard');
    setToast({ message: `Repository '${repo.name}' saved.`, type: 'success' });
  };
  
  const handleSetView = (view: AppView) => {
    setEditingRepoId(null);
    setActiveView(view);
  };
  
  const handleEditRepo = (repoId: string) => {
    setEditingRepoId(repoId);
    setActiveView('edit-repository');
  };
  
  const handleDeleteRepo = (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) return;
    confirmAction({
      title: "Delete Repository",
      message: `Are you sure you want to delete "${repo.name}"? This cannot be undone.`,
      onConfirm: () => {
        const newRepos = repositories.filter(r => r.id !== repoId);
        setRepositories(newRepos);
        window.electronAPI?.saveRepositories(newRepos);
        setToast({ message: `Repository '${repo.name}' deleted.`, type: 'success' });
      },
    });
  };

  const editingRepo = repositories.find(r => r.id === editingRepoId);
  const currentView = editingRepoId ? 'edit-repository' : activeView;

  if (!isLoaded) {
    return <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 h-screen flex items-center justify-center">Loading settings...</div>;
  }

  return (
    <TooltipProvider>
      <IconContext.Provider value={settings.iconSet || 'heroicons'}>
        <div className={`${settings.theme} font-sans`}>
          <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 h-screen flex flex-col">
            {isUpdateAvailable && <UpdateBanner onInstall={() => window.electronAPI.installUpdate()} />}
            <Header
              activeView={currentView}
              onSetView={handleSetView}
              onNewRepo={() => {
                setEditingRepoId(null);
                setActiveView('edit-repository');
              }}
              onCheckAllForUpdates={() => { /* Placeholder */ }}
              isCheckingAll={false}
              onToggleAllCategories={() => { /* Placeholder */ }}
              canCollapseAll={true}
            />
            <main className="flex-1 overflow-y-auto" style={{
              height: isLogPanelOpen ? `calc(100vh - var(--header-height) - var(--status-bar-height) - ${logPanelHeight}px)` : 'auto'
            }}>
              {currentView === 'dashboard' && (
                <Dashboard
                  repositories={repositories}
                  categories={categories}
                  onRunTask={(repoId, taskId) => handleRunTask(repoId, taskId)}
                  onEditRepo={handleEditRepo}
                  onDeleteRepo={handleDeleteRepo}
                  onOpenTaskSelection={(repoId) => setTaskSelectionRepo(repositories.find(r => r.id === repoId) || null)}
                  onOpenLaunchSelection={(repoId) => {
                    const repo = repositories.find(r => r.id === repoId);
                    if (repo) {
                        const launchables: Launchable[] = [
                            ...(repo.launchConfigs || []).map(config => ({ type: 'manual' as const, config })),
                            ...(detectedExecutables[repo.id] || []).map(path => ({ type: 'detected' as const, path }))
                        ];
                        setLaunchSelection({ repo, launchables });
                    }
                  }}
                  onViewLogs={(repoId) => {
                    if (!activeLogRepoIds.includes(repoId)) setActiveLogRepoIds(prev => [...prev, repoId]);
                    setSelectedLogRepoId(repoId);
                    setIsLogPanelOpen(true);
                  }}
                  onViewHistory={(repoId) => setCommitHistoryRepo(repositories.find(r => r.id === repoId) || null)}
                  onRefreshRepoState={(repoId) => { /* Placeholder */ }}
                  localPathStates={localPathStates}
                  detailedStatuses={detailedStatuses}
                  branchInfos={branchInfos}
                  detectedExecutables={detectedExecutables}
                  setToast={setToast}
                  confirmAction={confirmAction}
                  onRunLaunchable={handleRunLaunchable}
                  isProcessing={isProcessing}
                  onCloneRepo={(repoId) => {
                      const repo = repositories.find(r => r.id === repoId);
                      if(repo) cloneRepository(repo);
                  }}
                  onChooseLocationAndClone={(repoId) => { /* Placeholder */ }}
                  onOpenLocalPath={(path) => window.electronAPI?.openLocalPath(path)}
                  onOpenTerminal={(path) => window.electronAPI?.openTerminal(path)}
                  onOpenWeblink={(url) => window.electronAPI?.openWeblink(url, settings.openLinksIn)}
                />
              )}
              {currentView === 'settings' && <SettingsView currentSettings={settings} onSave={handleSaveSettings} setToast={setToast} confirmAction={confirmAction} />}
              {currentView === 'info' && <InfoView />}
              {currentView === 'edit-repository' && (
                <RepoFormModal
                  repository={editingRepo || null}
                  onSave={handleSaveRepo}
                  onCancel={() => {
                    setEditingRepoId(null);
                    setActiveView('dashboard');
                  }}
                  setToast={setToast}
                  confirmAction={confirmAction}
                  onRefreshState={async (repoId) => {/* Placeholder */}}
                />
              )}
            </main>
            {isLogPanelOpen && (
              <TaskLogPanel
                onClosePanel={() => setIsLogPanelOpen(false)}
                onCloseTab={(repoId) => {
                  setActiveLogRepoIds(prev => prev.filter(id => id !== repoId));
                  if (selectedLogRepoId === repoId) {
                    setSelectedLogRepoId(activeLogRepoIds.filter(id => id !== repoId)[0] || null);
                  }
                  if (activeLogRepoIds.length <= 1) setIsLogPanelOpen(false);
                }}
                onSelectTab={setSelectedLogRepoId}
                logs={logs}
                allRepositories={repositories}
                activeRepoIds={activeLogRepoIds}
                selectedRepoId={selectedLogRepoId}
                height={logPanelHeight}
                setHeight={setLogPanelHeight}
                isProcessing={isProcessing}
              />
            )}
            <StatusBar
                repoCount={repositories.length}
                processingCount={isProcessing.size}
                isSimulationMode={settings.simulationMode}
                latestLog={latestLog}
                appVersion={appVersion}
                onToggleDebugPanel={() => setIsDebugPanelOpen(prev => !prev)}
            />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {confirmation?.isOpen && <ConfirmationModal {...confirmation} onConfirm={() => { confirmation.onConfirm(); setConfirmation(null); }} onCancel={() => { confirmation.onCancel?.(); setConfirmation(null); }} />}
            {dirtyRepo && <DirtyRepoModal isOpen={!!dirtyRepo} status={dirtyRepo.status} onChoose={(choice) => { dirtyRepo.resolve(choice); setDirtyRepo(null); }} isIgnoring={false} />}
            <TaskSelectionModal isOpen={!!taskSelectionRepo} repository={taskSelectionRepo} onClose={() => setTaskSelectionRepo(null)} onSelect={(taskId) => { if (taskSelectionRepo) { handleRunTask(taskSelectionRepo.id, taskId); } setTaskSelectionRepo(null); }} />
            <LaunchSelectionModal isOpen={!!launchSelection} repository={launchSelection?.repo || null} launchables={launchSelection?.launchables || []} onClose={() => setLaunchSelection(null)} onSelect={(launchable) => { if(launchSelection) { handleRunLaunchable(launchSelection.repo, launchable) } setLaunchSelection(null); } } />
            <CommitHistoryModal isOpen={!!commitHistoryRepo} repository={commitHistoryRepo} onClose={() => setCommitHistoryRepo(null)} />
            <ExecutableSelectionModal isOpen={!!execSelection} repository={execSelection?.repo || null} launchConfig={execSelection?.config || null} executables={detectedExecutables[execSelection?.repo.id || ''] || []} onClose={() => setExecSelection(null)} onSelect={(path) => { if (execSelection) { launchExecutable(execSelection.repo, path); } setExecSelection(null); }} />
            <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} repositories={repositories} onSetView={handleSetView} onNewRepo={() => { setEditingRepoId(null); setActiveView('edit-repository'); }} onRunTask={handleRunTask} />
            <DebugPanel isOpen={isDebugPanelOpen} onClose={() => setIsDebugPanelOpen(false)} />
            <Tooltip />
          </div>
        </div>
      </IconContext.Provider>
    </TooltipProvider>
  );
};

export default App;