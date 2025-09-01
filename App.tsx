import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRepositoryManager } from './hooks/useRepositoryManager';
import type { Repository, GlobalSettings, AppView, Task, LogEntry, LocalPathState } from './types';
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

const App: React.FC = () => {
  const {
    repositories,
    addRepository,
    updateRepository,
    deleteRepository,
    runTask,
    cloneRepository,
    launchApplication,
    logs,
    clearLogs,
    isProcessing,
  } = useRepositoryManager();
  
  const [repoToEditId, setRepoToEditId] = useState<string | 'new' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [localPathStates, setLocalPathStates] = useState<Record<string, LocalPathState>>({});
  
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

  const [settings, setSettings] = useState<GlobalSettings>(() => {
    try {
      const savedSettings = localStorage.getItem('globalSettings');
      const defaults = {
        defaultPackageManager: 'npm' as 'npm' | 'yarn',
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
        defaultPackageManager: 'npm',
        defaultBuildCommand: 'npm run build',
        notifications: true,
        simulationMode: true,
        theme: 'dark',
        iconSet: 'heroicons',
      };
    }
  });
  
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
    }
  }, [repositories, settings, runTask, clearLogs, logPanel.height]);

  const handleDirtyRepoChoice = (choice: 'stash' | 'force' | 'cancel') => {
    if (dirtyRepoModal.resolve) {
      dirtyRepoModal.resolve(choice);
    }
    setDirtyRepoModal({ isOpen: false, repo: null, task: null, statusOutput: '', resolve: null });
  };

  const handleInitiateRunTask = (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo || repo.tasks.length === 0) return;

    if (repo.tasks.length === 1) {
      // If there's only one task, run it directly
      handleRunTask(repo.id, repo.tasks[0].id);
    } else {
      // If there are multiple tasks, open the selection modal
      setTaskSelectionModal({ isOpen: true, repo });
    }
  };

  const handleViewLogs = (repoId: string) => {
    setLogPanel({ isOpen: true, repoId, height: logPanel.height });
  };
  
  const handleLaunchApp = useCallback(async (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) return;
    setLogPanel({ isOpen: true, repoId, height: logPanel.height });
    await launchApplication(repo);
  }, [repositories, launchApplication, logPanel.height]);

  const handleCloneRepo = useCallback(async (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) return;
    clearLogs(repoId);
    setLogPanel({ isOpen: true, repoId, height: logPanel.height });
    
    try {
        await cloneRepository(repo);
        // After cloning, re-check the path status
        const newState = await window.electronAPI.checkLocalPath(repo.localPath);
        setLocalPathStates(prev => ({...prev, [repoId]: newState}));
    } catch (e: any) {
        setToast({ message: e.message || 'Clone failed!', type: 'error' });
    }
  }, [repositories, cloneRepository, clearLogs, logPanel.height]);

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
        return <RepoEditView key={repoToEditId} repository={repo} onSave={handleSaveRepo} onCancel={handleCancelEditRepository} />;
      case 'dashboard':
      default:
        return <Dashboard 
          repositories={repositories} 
          onInitiateRunTask={handleInitiateRunTask} 
          onViewLogs={handleViewLogs}
          onEditRepo={(repoId: string) => handleEditRepository(repoId)}
          onDeleteRepo={handleDeleteRepo}
          isProcessing={isProcessing}
          localPathStates={localPathStates}
          onCloneRepo={handleCloneRepo}
          onLaunchApp={handleLaunchApp}
        />;
    }
  };

  return (
    <IconContext.Provider value={settings.iconSet}>
      <div className="flex flex-col h-screen">
        <Header onNewRepo={() => handleEditRepository('new')} activeView={activeView} onSetView={setActiveView} />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto">
          <CurrentView />
        </main>
        
        <StatusBar 
          repoCount={repositories.length} 
          processingCount={isProcessing.size} 
          isSimulationMode={settings.simulationMode}
          latestLog={latestLog}
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