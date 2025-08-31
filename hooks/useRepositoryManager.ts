import { useState, useEffect, useCallback } from 'react';
import type { Repository, LogEntry, Task, GlobalSettings } from '../types';
import { RepoStatus, BuildHealth, LogLevel, TaskStepType } from '../types';
import { automationService } from '../services/automationService';

export const useRepositoryManager = () => {
  const [repositories, setRepositories] = useState<Repository[]>(() => {
    try {
      const savedRepos = localStorage.getItem('repositories');
      return savedRepos ? JSON.parse(savedRepos) : [];
    } catch (error) {
      console.error("Failed to parse repositories from localStorage", error);
      return [];
    }
  });
  
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});
  const [isProcessing, setIsProcessing] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('repositories', JSON.stringify(repositories));
  }, [repositories]);
  
  const addLogEntry = useCallback((repoId: string, message: string, level: LogLevel) => {
    const newEntry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      level,
    };
    setLogs(prevLogs => ({
      ...prevLogs,
      [repoId]: [...(prevLogs[repoId] || []), newEntry],
    }));
  }, []);

  const updateRepoStatus = useCallback((repoId: string, status: RepoStatus, buildHealth?: BuildHealth) => {
    setRepositories(prev =>
      prev.map(repo =>
        repo.id === repoId
          ? {
              ...repo,
              status,
              lastUpdated: new Date().toISOString(),
              ...(buildHealth && { buildHealth }),
            }
          : repo
      )
    );
  }, []);

  const runTask = useCallback(async (repoId: string, task: Task, settings: GlobalSettings) => {
    setIsProcessing(prev => new Set(prev).add(repoId));
    
    try {
      updateRepoStatus(repoId, RepoStatus.Syncing);
      addLogEntry(repoId, `Starting task: '${task.name}'...`, LogLevel.Info);
      
      await automationService.simulateClone(repoId, addLogEntry);

      for (const step of task.steps) {
        addLogEntry(repoId, `Executing step: ${step.type}`, LogLevel.Info);
        switch (step.type) {
          case TaskStepType.GitPull:
            await automationService.simulatePull(repoId, addLogEntry);
            break;
          case TaskStepType.InstallDeps:
            await automationService.simulateInstall(repoId, settings.defaultPackageManager, addLogEntry);
            break;
          case TaskStepType.RunCommand:
            if (step.command) {
              await automationService.simulateRunCommand(repoId, step.command, addLogEntry);
            } else {
              addLogEntry(repoId, 'Skipping empty command.', LogLevel.Warn);
            }
            break;
        }
      }

      addLogEntry(repoId, `Task '${task.name}' completed successfully.`, LogLevel.Success);
      updateRepoStatus(repoId, RepoStatus.Success, BuildHealth.Healthy);
    } catch (error: any) {
      addLogEntry(repoId, `Error during task '${task.name}': ${error.message}`, LogLevel.Error);
      addLogEntry(repoId, 'Task failed.', LogLevel.Error);
      updateRepoStatus(repoId, RepoStatus.Failed, BuildHealth.Failing);
      throw error;
    } finally {
      setIsProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(repoId);
        return newSet;
      });
    }
  }, [addLogEntry, updateRepoStatus]);
  
  const addRepository = (repo: Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>) => {
    const newRepo: Repository = {
      ...repo,
      id: `repo_${Date.now()}`,
      status: RepoStatus.Idle,
      lastUpdated: null,
      buildHealth: BuildHealth.Unknown,
    };
    setRepositories(prev => [...prev, newRepo]);
  };
  
  const updateRepository = (updatedRepo: Repository) => {
    setRepositories(prev => prev.map(repo => (repo.id === updatedRepo.id ? updatedRepo : repo)));
  };
  
  const deleteRepository = (repoId: string) => {
    setRepositories(prev => prev.filter(repo => repo.id !== repoId));
    setLogs(prev => {
        const newLogs = {...prev};
        delete newLogs[repoId];
        return newLogs;
    });
  };
  
  const clearLogs = (repoId: string) => {
      setLogs(prev => ({...prev, [repoId]: []}));
  };

  return { 
    repositories, 
    addRepository, 
    updateRepository, 
    deleteRepository, 
    runTask, 
    logs,
    clearLogs,
    isProcessing
  };
};
