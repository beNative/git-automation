import React, { useState, useCallback, useEffect } from 'react';
import { useRepositoryManager } from './hooks/useRepositoryManager';
import type { Repository, GlobalSettings, AppView, Task } from './types';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import RepoFormModal from './components/modals/RepoFormModal';
import Toast from './components/Toast';
import InfoView from './components/InfoView';
import SettingsView from './components/SettingsView';
import LogPanel from './components/LogPanel';
import { IconContext } from './contexts/IconContext';

const App: React.FC = () => {
  const {
    repositories,
    addRepository,
    updateRepository,
    deleteRepository,
    runTask,
    logs,
    clearLogs,
    isProcessing,
  } = useRepositoryManager();
  
  const [activeModal, setActiveModal] = useState<{ type: 'repo-form' | null }>({ type: null });
  const [repoToEdit, setRepoToEdit] = useState<Repository | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  
  const [logPanel, setLogPanel] = useState({
    isOpen: false,
    repoId: null as string | null,
    height: 300,
  });

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
    } catch (error) {
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

  useEffect(() => {
    // Apply theme class to the root element
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleSaveSettings = (newSettings: GlobalSettings) => {
    setSettings(newSettings);
    localStorage.setItem('globalSettings', JSON.stringify(newSettings));
    showToast('Settings saved successfully', 'success');
  };
  
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const handleRunTask = useCallback(async (repoId: string, taskId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    const taskToRun = repo?.tasks.find(t => t.id === taskId);
    
    if (!repo || !taskToRun) {
      showToast('Repository or Task not found.', 'error');
      return;
    }

    clearLogs(repoId);
    setLogPanel(prev => ({ ...prev, isOpen: true, repoId }));

    try {
      await runTask(repo, taskToRun, settings); // Pass the whole repo object
      if (settings.notifications) {
        showToast(`Task '${taskToRun.name}' completed successfully.`, 'success');
      }
    } catch (error) {
      if (settings.notifications) {
        showToast(`Task '${taskToRun.name}' failed for ${repo.name}.`, 'error');
      }
    }
  }, [clearLogs, runTask, settings, repositories]);

  const handleOpenEditModal = (repo: Repository) => {
    setRepoToEdit(repo);
    setActiveModal({ type: 'repo-form' });
  };
  
  const handleOpenNewModal = () => {
    setRepoToEdit(null);
    setActiveModal({ type: 'repo-form' });
  };

  const handleSaveRepo = (repo: Repository) => {
    if (repositories.some(r => r.id === repo.id)) {
      updateRepository(repo);
      showToast('Repository updated successfully!', 'success');
    } else {
      addRepository(repo);
      showToast('Repository added successfully!', 'success');
    }
    closeModal();
  };
  
  const handleDeleteRepo = (repoId: string) => {
    if (window.confirm('Are you sure you want to delete this repository?')) {
      deleteRepository(repoId);
      showToast('Repository deleted.', 'success');
    }
  };
  
  const closeModal = () => setActiveModal({ type: null });

  const renderView = () => {
    switch (activeView) {
      case 'info':
        return <InfoView />;
      case 'settings':
        return <SettingsView currentSettings={settings} onSave={handleSaveSettings} />;
      case 'dashboard':
      default:
        return (
          <Dashboard
            repositories={repositories}
            onRunTask={handleRunTask}
            onViewLogs={(repoId) => setLogPanel({ isOpen: true, repoId, height: logPanel.height })}
            onEditRepo={handleOpenEditModal}
            onDeleteRepo={handleDeleteRepo}
            isProcessing={isProcessing}
          />
        );
    }
  };

  return (
    <IconContext.Provider value={settings.iconSet || 'heroicons'}>
      <div className="min-h-screen font-sans flex flex-col bg-gray-100 dark:bg-gray-900">
        <Header 
          onNewRepo={handleOpenNewModal} 
          activeView={activeView}
          onSetView={setActiveView}
        />
        <main className="p-4 sm:p-6 lg:p-8 flex-grow">
          {renderView()}
        </main>
        
        {activeModal.type === 'repo-form' && (
          <RepoFormModal
            isOpen={true}
            onClose={closeModal}
            onSave={handleSaveRepo}
            repository={repoToEdit}
          />
        )}
        
        <LogPanel
          isOpen={logPanel.isOpen}
          onClose={() => setLogPanel(prev => ({...prev, isOpen: false}))}
          logs={logPanel.repoId ? logs[logPanel.repoId] || [] : []}
          repository={repositories.find(r => r.id === logPanel.repoId)}
          height={logPanel.height}
          setHeight={(height) => setLogPanel(prev => ({...prev, height}))}
        />

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </IconContext.Provider>
  );
};

export default App;