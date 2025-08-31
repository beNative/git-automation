import { useState, useEffect, useCallback } from 'react';
import type { Repository, LogEntry, Task, GlobalSettings, TaskStep } from '../types';
import { RepoStatus, BuildHealth, LogLevel, TaskStepType } from '../types';

// --- Simulation logic moved from the now-obsolete automationService ---
const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));
const randomFail = (chance: number, message: string) => {
  if (Math.random() < chance) {
    throw new Error(message);
  }
};
// ---

export const useRepositoryManager = () => {
  const [repositories, setRepositories] = useState<Repository[]>(() => {
    try {
      const savedRepos = localStorage.getItem('repositories');
      if (savedRepos) {
        const parsedRepos: Repository[] = JSON.parse(savedRepos);
        // Data migration: ensure every repo has a `tasks` array.
        return parsedRepos.map(repo => ({
          ...repo,
          tasks: repo.tasks || [],
        }));
      }
      return [];
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
      timestamp: new Date().toISOString(),
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

  const runTask = useCallback(async (repo: Repository, task: Task, settings: GlobalSettings) => {
    const { id: repoId } = repo;
    setIsProcessing(prev => new Set(prev).add(repoId));
    
    try {
      updateRepoStatus(repoId, RepoStatus.Syncing);
      addLogEntry(repoId, `Starting task: '${task.name}'...`, LogLevel.Info);
      if(settings.simulationMode) {
        addLogEntry(repoId, `RUNNING IN SIMULATION MODE`, LogLevel.Warn);
      }

      for (const step of task.steps) {
        addLogEntry(repoId, `Executing step: ${step.type}`, LogLevel.Info);
        if (settings.simulationMode) {
          await runSimulationStep(repoId, step, settings, addLogEntry);
        } else {
          await runRealStep(repo, step, settings, addLogEntry);
        }
      }

      addLogEntry(repoId, `Task '${task.name}' completed successfully.`, LogLevel.Success);
      updateRepoStatus(repoId, RepoStatus.Success, BuildHealth.Healthy);
    } catch (error: any) {
      const errorMessage = error.message || 'An unknown error occurred.';
      addLogEntry(repoId, `Error during task '${task.name}': ${errorMessage}`, LogLevel.Error);
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
  
  const addRepository = (repoData: Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>) => {
    const newRepo: Repository = {
      id: `repo_${Date.now()}`,
      status: RepoStatus.Idle,
      lastUpdated: null,
      buildHealth: BuildHealth.Unknown,
      ...repoData
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


// --- Helper function for running a single step in simulation mode ---
const runSimulationStep = async (
  repoId: string, 
  step: TaskStep, 
  settings: GlobalSettings, 
  addLogEntry: (repoId: string, message: string, level: LogLevel) => void
) => {
    switch (step.type) {
        case TaskStepType.GitPull:
            addLogEntry(repoId, `git pull`, LogLevel.Command);
            await simulateDelay(1500);
            randomFail(0.1, 'Simulated merge conflict.');
            addLogEntry(repoId, 'Successfully pulled latest changes.', LogLevel.Success);
            break;
        case TaskStepType.InstallDeps:
            const command = settings.defaultPackageManager === 'npm' ? 'npm install' : 'yarn install';
            addLogEntry(repoId, command, LogLevel.Command);
            await simulateDelay(3000);
            randomFail(0.1, 'Simulated dependency installation failed.');
            addLogEntry(repoId, 'Dependencies installed successfully.', LogLevel.Success);
            break;
        case TaskStepType.RunCommand:
            if (step.command) {
                addLogEntry(repoId, step.command, LogLevel.Command);
                await simulateDelay(4000);
                randomFail(0.15, `Simulated command '${step.command}' failed.`);
                addLogEntry(repoId, `Command '${step.command}' completed successfully.`, LogLevel.Success);
            } else {
                addLogEntry(repoId, 'Skipping empty command.', LogLevel.Warn);
            }
            break;
    }
};


// --- Helper function for running a single step via IPC ---
const runRealStep = (
    repo: Repository,
    step: TaskStep,
    settings: GlobalSettings,
    addLogEntry: (repoId: string, message: string, level: LogLevel) => void
) => {
  return new Promise<void>((resolve, reject) => {
    const { id: repoId, localPath } = repo;

    const cleanupListeners = () => {
      window.electronAPI.removeTaskListeners();
    };
    
    window.electronAPI.onTaskLog((_event, logData) => {
        const { message, level } = logData;
        addLogEntry(repoId, message, level);
    });
    
    window.electronAPI.onTaskStepEnd((_event, exitCode) => {
        cleanupListeners();
        if (exitCode === 0) {
            resolve();
        } else {
            reject(new Error(`Step failed with exit code ${exitCode}. See logs for details.`));
        }
    });

    window.electronAPI.runTaskStep({ repo, step, settings });
  });
};
