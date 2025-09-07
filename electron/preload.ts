import { contextBridge, ipcRenderer } from 'electron';
import type { GlobalSettings, Repository, AllData, TaskStep, Task, DebugLogEntry, LogLevel } from '../types';

const electronAPI = {
  // Data loading/saving
  getInitialData: (): Promise<AllData> => ipcRenderer.invoke('get-initial-data'),
  saveRepositories: (repositories: Repository[]) => ipcRenderer.invoke('save-repositories', repositories),
  saveSettings: (settings: GlobalSettings) => ipcRenderer.invoke('save-settings', settings),
  saveAllData: (allData: AllData) => ipcRenderer.invoke('save-all-data', allData),
  getRawSettingsJson: (): Promise<string> => ipcRenderer.invoke('get-raw-settings-json'),

  // App Info
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update-available', callback);
    return () => ipcRenderer.removeListener('update-available', callback);
  },
  onDataLoaded: (callback: (data: AllData) => void) => {
    ipcRenderer.once('data-loaded', (event, data) => callback(data));
  },
  removeDataLoadedListener: () => ipcRenderer.removeAllListeners('data-loaded'),
  
  // External interaction
  openLocalPath: (path: string) => ipcRenderer.invoke('open-local-path', path),
  openTerminal: (path: string) => ipcRenderer.invoke('open-terminal', path),
  openWeblink: (url: string, browser?: string) => ipcRenderer.invoke('open-weblink', url, browser),
  showDirectoryPicker: () => ipcRenderer.invoke('show-directory-picker'),
  showSettingsFile: () => ipcRenderer.invoke('show-settings-file'),
  
  // VCS Operations (mocked in main for this example)
  getCommitHistory: (repoPath: string, skip: number, search: string) => ipcRenderer.invoke('get-commit-history', repoPath, skip, search),
  listBranches: (repoPath: string) => ipcRenderer.invoke('list-branches', repoPath),
  checkVcsStatus: (repo: Repository) => ipcRenderer.invoke('check-vcs-status', repo),
  createBranch: (repoPath: string, branchName: string) => ipcRenderer.invoke('create-branch', repoPath, branchName),
  deleteBranch: (repoPath: string, branchName: string, isRemote: boolean) => ipcRenderer.invoke('delete-branch', repoPath, branchName, isRemote),
  mergeBranch: (repoPath: string, branchName: string) => ipcRenderer.invoke('merge-branch', repoPath, branchName),
  discoverRemoteUrl: (args: { localPath: string; vcs: string; }) => ipcRenderer.invoke('discover-remote-url', args),

  // Task Execution
  runTaskStep: (args: { repo: Repository; step: TaskStep; settings: GlobalSettings, executionId: string, task: Task }) => ipcRenderer.send('run-task-step', args),
  cloneRepository: (args: { repo: Repository; executionId: string }) => ipcRenderer.send('clone-repository', args),
  onTaskLog: (callback: (event: any, data: { executionId: string, message: string, level: LogLevel }) => void) => ipcRenderer.on('task-log', callback),
  onTaskStepEnd: (callback: (event: any, data: { executionId: string, exitCode: number }) => void) => ipcRenderer.on('task-step-end', callback),
  removeTaskLogListener: (callback: (...args: any[]) => void) => ipcRenderer.removeListener('task-log', callback),
  removeTaskStepEndListener: (callback: (...args: any[]) => void) => ipcRenderer.removeListener('task-step-end', callback),

  // Launching
  launchApplication: (args: { repo: Repository; command: string }) => ipcRenderer.invoke('launch-application', args),
  launchExecutable: (args: { repoPath: string; executablePath: string; }) => ipcRenderer.invoke('launch-executable', args),
  
  // Project analysis
  getProjectInfo: (repoPath: string) => ipcRenderer.invoke('get-project-info', repoPath),
  getProjectSuggestions: (args: { repoPath: string, repoName: string }) => ipcRenderer.invoke('get-project-suggestions', args),
  checkLocalPath: (path: string) => ipcRenderer.invoke('check-local-path', path),
  
  // Docs
  getDoc: (docName: string): Promise<string> => ipcRenderer.invoke('get-doc', docName),

  // Debug Logging
  logToFileInit: () => ipcRenderer.send('log-to-file-init'),
  logToFileWrite: (log: DebugLogEntry) => ipcRenderer.send('log-to-file-write', log),
  logToFileClose: () => ipcRenderer.send('log-to-file-close'),

  // Import/Export
  exportSettings: () => ipcRenderer.invoke('export-settings'),
  importSettings: () => ipcRenderer.invoke('import-settings'),

  removeUpdateAvailableListener: () => ipcRenderer.removeAllListeners('update-available'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
