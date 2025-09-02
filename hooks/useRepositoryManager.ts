import { useState, useEffect, useCallback } from 'react';
import type { Repository, LogEntry, Task, GlobalSettings, TaskStep } from '../types';
import { RepoStatus, BuildHealth, LogLevel, TaskStepType, VcsType } from '../types';

// --- Simulation logic moved from the now-obsolete automationService ---
const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));
const randomFail = (chance: number, message: string) => {
  if (Math.random() < chance) {
    throw new Error(message);
  }
};
// ---

// --- Helper function for substituting variables ---
const substituteVariables = (command: string, variables: Task['variables'] = []): string => {
  if (!command || !variables || variables.length === 0) {
    return command;
  }
  let result = command;
  for (const variable of variables) {
    // Basic substitution: ${KEY}
    // Also handle case where key is empty to avoid replacing ${}
    if (variable.key) {
      // Create a regex to replace all occurrences of ${KEY}
      const regex = new RegExp(`\\$\\{${variable.key.trim()}\\}`, 'g');
      result = result.replace(regex, variable.value);
    }
  }
  // Remove any unsubstituted variables to prevent errors
  result = result.replace(/\${(.*?)}/g, ''); 
  return result;
};


export const useRepositoryManager = () => {
  const [repositories, setRepositories] = useState<Repository[]>(() => {
    try {
      const savedRepos = localStorage.getItem('repositories');
      const savedSettings = localStorage.getItem('globalSettings');
      const oldSettings = savedSettings ? JSON.parse(savedSettings) : {};
      const pkgManager = oldSettings.defaultPackageManager || 'npm';

      if (savedRepos) {
        const parsedRepos: Repository[] = JSON.parse(savedRepos);
        
        return parsedRepos.map(repo => {
          const migratedRepo: any = {
            ...repo,
            vcs: repo.vcs || VcsType.Git, // Default to Git for old data
            tasks: (repo.tasks || []).map(task => ({
              ...task,
              variables: task.variables || [],
              showOnDashboard: task.showOnDashboard ?? false,
              steps: (task.steps || []).map(step => {
                // One-time migration for old step types
                if ((step.type as any) === 'INSTALL_DEPS') {
                  return { ...step, type: TaskStepType.RunCommand, command: `${pkgManager} install` };
                }
                if ((step.type as any) === 'RUN_TESTS') {
                    return { ...step, type: TaskStepType.RunCommand, command: `${pkgManager} test` };
                }
                return { ...step, enabled: step.enabled ?? true };
              })
            }))
          };

          // Migration for launchCommand -> launchConfigs
          if (migratedRepo.launchCommand && !migratedRepo.launchConfigs) {
            migratedRepo.launchConfigs = [{
              id: `lc_${Date.now()}`,
              name: 'Default Launch',
              type: 'command',
              command: migratedRepo.launchCommand,
              showOnDashboard: true,
            }];
          }
          delete migratedRepo.launchCommand;
          // Ensure launch configs exist and have the new 'type' field
          migratedRepo.launchConfigs = (migratedRepo.launchConfigs || []).map((lc: any) => ({
            type: 'command', // Default old configs to 'command'
            ...lc,
          }));

          return migratedRepo as Repository;
        });
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

  const runTask = useCallback(async (
    repo: Repository,
    task: Task,
    settings: GlobalSettings,
    onDirty: (statusOutput: string) => Promise<'stash' | 'force' | 'cancel'>
  ) => {
    const taskExecutionId = `exec_${repo.id}_${task.id}_${Date.now()}`;
    const { id: repoId } = repo;
    setIsProcessing(prev => new Set(prev).add(repoId));
    
    try {
      updateRepoStatus(repoId, RepoStatus.Syncing);
      addLogEntry(repoId, `Starting task: '${task.name}'...`, LogLevel.Info);
      if(settings.simulationMode) {
        addLogEntry(repoId, `RUNNING IN SIMULATION MODE`, LogLevel.Warn);
      }

      for (const [index, step] of task.steps.entries()) {
        if (step.enabled === false) {
          addLogEntry(repoId, `Skipping disabled step: ${step.type}`, LogLevel.Info);
          continue;
        }

        addLogEntry(repoId, `Executing step: ${step.type}`, LogLevel.Info);
        if (settings.simulationMode) {
          await runSimulationStep(repoId, step, settings, addLogEntry, task.variables);
        } else {
          // Real mode
          let stepToRun = step;
          // Substitute variables for command steps
          if (step.type === TaskStepType.RunCommand && step.command) {
            stepToRun = {
              ...step,
              command: substituteVariables(step.command, task.variables),
            };
          }

          // Generate a unique ID for each step to prevent listener leaks from causing log duplication.
          const stepExecutionId = `${taskExecutionId}_step_${index}`;

          // Check for dirty repo before git pull (Git only)
          if (step.type === TaskStepType.GitPull && repo.vcs === VcsType.Git) {
            const statusResult = await window.electronAPI.checkVcsStatus(repo);
            if (statusResult.isDirty) {
              addLogEntry(repoId, 'Uncommitted changes detected.', LogLevel.Warn);
              const choice = await onDirty(statusResult.output);

              if (choice === 'cancel') {
                 addLogEntry(repoId, 'Task cancelled by user.', LogLevel.Info);
                 updateRepoStatus(repoId, RepoStatus.Idle);
                 throw new Error('cancelled'); // Special error to suppress toast
              } else if (choice === 'stash') {
                addLogEntry(repoId, 'Stashing changes...', LogLevel.Info);
                const stashExecutionId = `${stepExecutionId}_stash`;
                await runRealStep(repo, {id: 'stash_step', type: TaskStepType.GitStash}, settings, addLogEntry, stashExecutionId);
              }
              // if 'force', proceed as normal
            }
          }
          await runRealStep(repo, stepToRun, settings, addLogEntry, stepExecutionId);
        }
      }

      addLogEntry(repoId, `Task '${task.name}' completed successfully.`, LogLevel.Success);
      updateRepoStatus(repoId, RepoStatus.Success, BuildHealth.Healthy);
    } catch (error: any) {
      if (error.message === 'cancelled') throw error;
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

  const cloneRepository = useCallback(async (repo: Repository) => {
    const executionId = `clone_${repo.id}_${Date.now()}`;
    const { id: repoId } = repo;
    setIsProcessing(prev => new Set(prev).add(repoId));
    
    try {
      updateRepoStatus(repoId, RepoStatus.Syncing);
      addLogEntry(repoId, `Cloning repository from '${repo.remoteUrl}'...`, LogLevel.Info);
      
      await runClone(repo, addLogEntry, executionId);

      addLogEntry(repoId, `Repository cloned successfully.`, LogLevel.Success);
      updateRepoStatus(repoId, RepoStatus.Success, BuildHealth.Healthy);
    } catch (error: any) {
      const errorMessage = error.message || 'An unknown error occurred.';
      addLogEntry(repoId, `Error during clone: ${errorMessage}`, LogLevel.Error);
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

  const launchApplication = useCallback(async (repo: Repository, command: string) => {
      const { id: repoId } = repo;
      if (!command) return;
      
      addLogEntry(repoId, `Executing launch command: '${command}'...`, LogLevel.Command);
      try {
        const result = await window.electronAPI.launchApplication({ repo, command });
        if (result.success) {
            addLogEntry(repoId, `Launch command executed.`, LogLevel.Success);
            if (result.output) addLogEntry(repoId, result.output, LogLevel.Info);
        } else {
            addLogEntry(repoId, `Launch command failed:`, LogLevel.Error);
            if (result.output) addLogEntry(repoId, result.output, LogLevel.Error);
        }
      } catch (e: any) {
        addLogEntry(repoId, `Failed to invoke launch command: ${e.message}`, LogLevel.Error);
      }
  }, [addLogEntry]);

  const launchExecutable = useCallback(async (repo: Repository, executablePath: string) => {
      const { id: repoId } = repo;
      addLogEntry(repoId, `Executing detected executable: '${executablePath}'...`, LogLevel.Command);
      try {
        const result = await window.electronAPI.launchExecutable({ repoPath: repo.localPath, executablePath });
        if (result.success) {
            addLogEntry(repoId, `Executable ran successfully.`, LogLevel.Success);
            if (result.output) addLogEntry(repoId, result.output, LogLevel.Info);
        } else {
            addLogEntry(repoId, `Executable failed:`, LogLevel.Error);
            if (result.output) addLogEntry(repoId, result.output, LogLevel.Error);
        }
      } catch (e: any) {
        addLogEntry(repoId, `Failed to launch executable: ${e.message}`, LogLevel.Error);
      }
  }, [addLogEntry]);
  
  const addRepository = (repoData: Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>) => {
    const newRepo: Repository = {
      id: `repo_${Date.now()}`,
      status: RepoStatus.Idle,
      lastUpdated: null,
      buildHealth: BuildHealth.Unknown,
      ...repoData
    } as Repository;
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
    cloneRepository,
    launchApplication,
    launchExecutable,
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
  addLogEntry: (repoId: string, message: string, level: LogLevel) => void,
  variables: Task['variables']
) => {
    switch (step.type) {
        case TaskStepType.GitPull:
            addLogEntry(repoId, `git pull`, LogLevel.Command);
            await simulateDelay(1500);
            randomFail(0.1, 'Simulated merge conflict.');
            addLogEntry(repoId, 'Successfully pulled latest changes.', LogLevel.Success);
            break;
        case TaskStepType.SvnUpdate:
            addLogEntry(repoId, `svn update`, LogLevel.Command);
            await simulateDelay(1500);
            randomFail(0.1, 'Simulated SVN conflict.');
            addLogEntry(repoId, 'Successfully updated working copy.', LogLevel.Success);
            break;
        case TaskStepType.GitFetch:
            addLogEntry(repoId, `git fetch`, LogLevel.Command);
            await simulateDelay(1000);
            addLogEntry(repoId, 'Successfully fetched from remote.', LogLevel.Success);
            break;
        case TaskStepType.GitCheckout:
            const branch = step.branch || 'main';
            addLogEntry(repoId, `git checkout ${branch}`, LogLevel.Command);
            await simulateDelay(500);
            addLogEntry(repoId, `Switched to branch '${branch}'.`, LogLevel.Success);
            break;
        case TaskStepType.GitStash:
            addLogEntry(repoId, `git stash`, LogLevel.Command);
            await simulateDelay(500);
            addLogEntry(repoId, 'Successfully stashed changes.', LogLevel.Success);
            break;
        case TaskStepType.RunCommand:
            if (step.command) {
                const finalCommand = substituteVariables(step.command, variables);
                addLogEntry(repoId, finalCommand, LogLevel.Command);
                await simulateDelay(4000);
                randomFail(0.15, `Simulated command '${finalCommand}' failed.`);
                addLogEntry(repoId, `Command '${finalCommand}' completed successfully.`, LogLevel.Success);
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
    addLogEntry: (repoId: string, message: string, level: LogLevel) => void,
    executionId: string
) => {
  return new Promise<void>((resolve, reject) => {
    const { id: repoId } = repo;

    const handleLog = (_event: any, logData: { executionId: string, message: string, level: LogLevel }) => {
        if (logData.executionId === executionId) {
            addLogEntry(repoId, logData.message, logData.level);
        }
    };
    
    const handleEnd = (_event: any, endData: { executionId: string, exitCode: number }) => {
        if (endData.executionId === executionId) {
            window.electronAPI.removeTaskLogListener(handleLog);
            window.electronAPI.removeTaskStepEndListener(handleEnd);

            if (endData.exitCode === 0) {
                resolve();
            } else {
                reject(new Error(`Step failed with exit code ${endData.exitCode}. See logs for details.`));
            }
        }
    };
    
    window.electronAPI.onTaskLog(handleLog);
    window.electronAPI.onTaskStepEnd(handleEnd);

    window.electronAPI.runTaskStep({ repo, step, settings, executionId });
  });
};

// --- Helper function for running clone via IPC ---
const runClone = (
    repo: Repository,
    addLogEntry: (repoId: string, message: string, level: LogLevel) => void,
    executionId: string
) => {
  return new Promise<void>((resolve, reject) => {
    const { id: repoId } = repo;

    const handleLog = (_event: any, logData: { executionId: string, message: string, level: LogLevel }) => {
        if (logData.executionId === executionId) {
            addLogEntry(repoId, logData.message, logData.level);
        }
    };
    
    const handleEnd = (_event: any, endData: { executionId: string, exitCode: number }) => {
        if (endData.executionId === executionId) {
            window.electronAPI.removeTaskLogListener(handleLog);
            window.electronAPI.removeTaskStepEndListener(handleEnd);
            if (endData.exitCode === 0) {
                resolve();
            } else {
                reject(new Error(`Clone failed with exit code ${endData.exitCode}. See logs for details.`));
            }
        }
    };

    window.electronAPI.onTaskLog(handleLog);
    window.electronAPI.onTaskStepEnd(handleEnd);

    window.electronAPI.cloneRepository({ repo, executionId });
  });
};