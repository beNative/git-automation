import React, { useState, useCallback } from 'react';
import { useRepositoryManager } from './hooks/useRepositoryManager';
import type { Repository, GlobalSettings, LogEntry, ActiveModal } from './types';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import LogModal from './components/modals/LogModal';
import RepoFormModal from './components/modals/RepoFormModal';
import SettingsModal from './components/modals/SettingsModal';
import Toast from './components/Toast';
import InfoView from './components/InfoView';

const App: React.FC = () => {
  const {
    repositories,
    addRepository,
    updateRepository,
    deleteRepository,
    runAutomation,
    logs,
    clearLogs,
    isProcessing,
  } = useRepositoryManager();
  
  const [activeModal, setActiveModal] = useState<ActiveModal>({ type: null, repoId: null });
  const [repoToEdit, setRepoToEdit] = useState<Repository | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showInfoView, setShowInfoView] = useState(false);

  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const savedSettings = localStorage.getItem('globalSettings');
    return savedSettings ? JSON.parse(savedSettings) : {
      defaultPackageManager: 'npm',
      defaultBuildCommand: 'npm run build',
      notifications: true,
    };
  });

  const handleSaveSettings = (newSettings: GlobalSettings) => {
    setSettings(newSettings);
    localStorage.setItem('globalSettings', JSON.stringify(newSettings));
    showToast('Settings saved successfully', 'success');
    setActiveModal({ type: null });
  };
  
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const handleRunAutomation = useCallback(async (repoId: string) => {
    clearLogs(repoId);
    setActiveModal({ type: 'logs', repoId });
    try {
      await runAutomation(repoId, settings.defaultPackageManager, settings.defaultBuildCommand);
      if (settings.notifications) {
        showToast(`Automation for repo ${repoId.substring(0, 8)} completed successfully.`, 'success');
      }
    } catch (error) {
      if (settings.notifications) {
        const repo = repositories.find(r => r.id === repoId);
        showToast(`Automation for ${repo?.name || 'repository'} failed.`, 'error');
      }
    }
  }, [clearLogs, runAutomation, settings.notifications, settings.defaultPackageManager, settings.defaultBuildCommand, repositories]);

  const handleOpenEditModal = (repo: Repository) => {
    setRepoToEdit(repo);
    setActiveModal({ type: 'repo-form' });
  };
  
  const handleOpenNewModal = () => {
    setRepoToEdit(null);
    setActiveModal({ type: 'repo-form' });
  };

  const handleSaveRepo = (repo: Repository) => {
    if (repo.id) {
      updateRepository(repo);
      showToast('Repository updated successfully!', 'success');
    } else {
      const { id, status, lastUpdated, buildHealth, ...repoData } = repo;
      addRepository(repoData);
      showToast('Repository added successfully!', 'success');
    }
    setActiveModal({ type: null });
  };
  
  const handleDeleteRepo = (repoId: string) => {
    if (window.confirm('Are you sure you want to delete this repository?')) {
      deleteRepository(repoId);
      showToast('Repository deleted.', 'success');
    }
  };
  
  const closeModal = () => setActiveModal({ type: null });

  const handleToggleInfoView = () => {
    setShowInfoView(prev => !prev);
  }

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      <Header 
        onNewRepo={handleOpenNewModal} 
        onOpenSettings={() => setActiveModal({ type: 'settings' })}
        onToggleInfo={handleToggleInfoView}
        isInfoViewVisible={showInfoView}
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {showInfoView ? (
          <InfoView />
        ) : (
          <Dashboard
            repositories={repositories}
            onRunAutomation={handleRunAutomation}
            onViewLogs={(repoId) => setActiveModal({ type: 'logs', repoId })}
            onEditRepo={handleOpenEditModal}
            onDeleteRepo={handleDeleteRepo}
            isProcessing={isProcessing}
          />
        )}
      </main>
      
      {activeModal.type === 'logs' && activeModal.repoId && (
        <LogModal
          isOpen={true}
          onClose={closeModal}
          logs={logs[activeModal.repoId] || []}
          repository={repositories.find(r => r.id === activeModal.repoId)}
        />
      )}
      
      {activeModal.type === 'repo-form' && (
        <RepoFormModal
          isOpen={true}
          onClose={closeModal}
          onSave={handleSaveRepo}
          repository={repoToEdit}
        />
      )}

      {activeModal.type === 'settings' && (
        <SettingsModal
          isOpen={true}
          onClose={closeModal}
          onSave={handleSaveSettings}
          currentSettings={settings}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;