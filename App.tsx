import React, { useState, useCallback, useEffect } from 'react';
import { useRepositoryManager } from './hooks/useRepositoryManager';
import type { Repository, GlobalSettings, LogEntry, ActiveModal, Task } from './types';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import LogModal from './components/modals/LogModal';
import RepoFormModal from './components/modals/RepoFormModal';
import SettingsModal from './components/modals/SettingsModal';
import TaskFormModal from './components/modals/TaskFormModal';
import Toast from './components/Toast';
import InfoView from './components/InfoView';

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
  
  const [activeModal, setActiveModal] = useState<ActiveModal>({ type: null });
  const [repoToEdit, setRepoToEdit] = useState<Repository | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
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
  
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem('tasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleSaveSettings = (newSettings: GlobalSettings) => {
    setSettings(newSettings);
    localStorage.setItem('globalSettings', JSON.stringify(newSettings));
    showToast('Settings saved successfully', 'success');
    closeModal();
  };
  
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const handleRunTask = useCallback(async (repoId: string, taskId: string) => {
    const taskToRun = tasks.find(t => t.id === taskId);
    if (!taskToRun) {
      showToast('Task not found.', 'error');
      return;
    }
    clearLogs(repoId);
    setActiveModal({ type: 'logs', repoId });
    try {
      await runTask(repoId, taskToRun, settings);
      if (settings.notifications) {
        showToast(`Task '${taskToRun.name}' completed successfully.`, 'success');
      }
    } catch (error) {
      if (settings.notifications) {
        const repo = repositories.find(r => r.id === repoId);
        showToast(`Task '${taskToRun.name}' failed for ${repo?.name}.`, 'error');
      }
    }
  }, [clearLogs, runTask, settings, tasks, repositories]);

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
    closeModal();
  };
  
  const handleDeleteRepo = (repoId: string) => {
    if (window.confirm('Are you sure you want to delete this repository?')) {
      deleteRepository(repoId);
      showToast('Repository deleted.', 'success');
    }
  };

  const handleSaveTask = (task: Task) => {
    setTasks(prev => {
      const existing = prev.find(t => t.id === task.id);
      if (existing) {
        return prev.map(t => t.id === task.id ? task : t);
      }
      return [...prev, task];
    });
    showToast(`Task '${task.name}' saved.`, 'success');
    closeModal();
  };

  const handleDeleteTask = (taskId: string) => {
     if (window.confirm('Are you sure you want to delete this task?')) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      showToast('Task deleted.', 'success');
    }
  };

  const handleOpenTaskForm = (taskId?: string) => {
    const task = tasks.find(t => t.id === taskId) || null;
    setTaskToEdit(task);
    setActiveModal({ type: 'task-form' });
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
            tasks={tasks}
            onRunTask={handleRunTask}
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
          tasks={tasks}
          onEditTask={handleOpenTaskForm}
          onDeleteTask={handleDeleteTask}
          onAddNewTask={() => handleOpenTaskForm()}
        />
      )}

      {activeModal.type === 'task-form' && (
        <TaskFormModal
            isOpen={true}
            onClose={closeModal}
            onSave={handleSaveTask}
            task={taskToEdit}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;
