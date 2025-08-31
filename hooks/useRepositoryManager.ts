import { useState, useEffect, useCallback } from 'react';
import type { Repository, LogEntry } from '../types';
import { RepoStatus, BuildHealth, LogLevel } from '../types';
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

  const runAutomation = useCallback(async (repoId: string, packageManager: 'npm' | 'yarn', buildCommand: string) => {
    setIsProcessing(prev => new Set(prev).add(repoId));
    
    try {
      updateRepoStatus(repoId, RepoStatus.Syncing);
      addLogEntry(repoId, 'Starting automation process...', LogLevel.Info);
      
      await automationService.simulateClone(repoId, addLogEntry);
      await automationService.simulatePull(repoId, addLogEntry);
      
      const changesDetected = await automationService.simulateInstall(repoId, packageManager, addLogEntry);
      if (changesDetected) {
        updateRepoStatus(repoId, RepoStatus.Building);
        await automationService.simulateBuild(repoId, buildCommand, addLogEntry);
      }
      
      updateRepoStatus(repoId, RepoStatus.Deploying);
      await automationService.simulateDeploy(repoId, addLogEntry);

      addLogEntry(repoId, 'Automation process completed successfully.', LogLevel.Success);
      updateRepoStatus(repoId, RepoStatus.Success, BuildHealth.Healthy);
    } catch (error: any) {
      addLogEntry(repoId, `Error: ${error.message}`, LogLevel.Error);
      addLogEntry(repoId, 'Automation process failed.', LogLevel.Error);
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
    runAutomation, 
    logs,
    clearLogs,
    isProcessing
  };
};
