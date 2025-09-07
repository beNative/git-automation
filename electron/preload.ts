import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { Repository, Task, TaskStep, GlobalSettings, LogLevel, ProjectSuggestion, LocalPathState, DetailedStatus, Commit, BranchInfo, DebugLogEntry, VcsType, ProjectInfo, Category, AppDataContextState, ReleaseInfo } from '../types';

const taskLogChannel = 'task-log';
const taskStepEndChannel = 'task-step-end';


contextBridge.exposeInMainWorld('electronAPI', {
  // App Info
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  
  // App Data
  getAllData: (): Promise<AppDataContextState> => ipcRenderer.invoke('get-all-data'),
  saveAllData: (data: AppDataContextState) => ipcRenderer.send('save-all-data', data),

  // Documentation
  getDoc: (docName: string): Promise<string> => ipcRenderer.invoke('get-doc', docName),
  
  // Smart Scripts
  getProjectInfo: (repoPath: string): Promise<ProjectInfo> => ipcRenderer.invoke('get-project-info', repoPath),
  getProjectSuggestions: (args: { repoPath: string, repoName: string }): Promise<ProjectSuggestion[]> => ipcRenderer.invoke('get-project-suggestions', args),

  // Version Control
  checkVcsStatus: (repo: Repository): Promise<{ isDirty: boolean; output: string; untrackedFiles: string[]; changedFiles: string[] }> => ipcRenderer.invoke('check-vcs-status', repo),
  getDetailedVcsStatus: (repo: Repository): Promise<DetailedStatus | null> => ipcRenderer.invoke('get-detailed-vcs-status', repo),
  getCommitHistory: (repoPath: string, skipCount?: number, searchQuery?: string): Promise<Commit[]> => ipcRenderer.invoke('get-commit-history', repoPath, skipCount, searchQuery),
  listBranches: (repoPath: string): Promise<BranchInfo> => ipcRenderer.invoke('list-branches', repoPath),
  checkoutBranch: (repoPath: string, branch: string): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('checkout-branch', repoPath, branch),
  createBranch: (repoPath: string, branch: string): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('create-branch', repoPath, branch),
  deleteBranch: (repoPath: string, branch: string, isRemote: boolean): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('delete-branch', repoPath, branch, isRemote),
  mergeBranch: (repoPath: string, branch: string): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('merge-branch', repoPath, branch),
  ignoreFilesAndPush: (args: { repo: Repository, filesToIgnore: string[] }): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('ignore-files-and-push', args),
  getLatestRelease: (repo: Repository): Promise<ReleaseInfo | null> => ipcRenderer.invoke('get-latest-release', repo),


  // Local Path and Actions
  checkLocalPath: (path: string): Promise<LocalPathState> => ipcRenderer.invoke('check-local-path', path),
  discoverRemoteUrl: (args: { localPath: string, vcs: VcsType }): Promise<{ url: string | null; error?: string }> => ipcRenderer.invoke('discover-remote-url', args),
  cloneRepository: (args: { repo: Repository, executionId: string }) => ipcRenderer.send('clone-repository', args),
  launchApplication: (args: { repo: Repository, command: string }) => ipcRenderer.invoke('launch-application', args),
  showDirectoryPicker: (): Promise<{ canceled: boolean, filePaths: string[] }> => ipcRenderer.invoke('show-directory-picker'),
  pathJoin: (...args: string[]): Promise<string> => ipcRenderer.invoke('path-join', ...args),
  detectExecutables: (repoPath: string): Promise<string[]> => ipcRenderer.invoke('detect-executables', repoPath),
  launchExecutable: (args: { repoPath: string, executablePath: string }): Promise<{ success: boolean; output: string }> => ipcRenderer.invoke('launch-executable', args),
  openLocalPath: (path: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('open-local-path', path),
  openWeblink: (url: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('open-weblink', url),
  openTerminal: (path: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('open-terminal', path),

  // JSON Config
  getRawSettingsJson: (): Promise<string> => ipcRenderer.invoke('get-raw-settings-json'),
  showSettingsFile: () => ipcRenderer.invoke('show-settings-file'),
  exportSettings: () => ipcRenderer.invoke('export-settings'),
  importSettings: () => ipcRenderer.invoke('import-settings'),

  // Real Task Execution
  runTaskStep: (args: { repo: Repository; step: TaskStep; settings: GlobalSettings; executionId: string; task: Task; }) => {
    ipcRenderer.send('run-task-step', args);
  },

  onTaskLog: (callback: (event: IpcRendererEvent, data: { executionId: string, message: string, level: LogLevel}) => void) => {
    ipcRenderer.on(taskLogChannel, callback);
  },
  removeTaskLogListener: (callback: (event: IpcRendererEvent, data: { executionId: string, message: string, level: LogLevel}) => void) => {
    ipcRenderer.removeListener(taskLogChannel, callback);
  },

  onTaskStepEnd: (callback: (event: IpcRendererEvent, data: { executionId: string, exitCode: number }) => void) => {
    ipcRenderer.on(taskStepEndChannel, callback);
  },
  removeTaskStepEndListener: (callback: (event: IpcRendererEvent, data: { executionId: string, exitCode: number }) => void) => {
    ipcRenderer.removeListener(taskStepEndChannel, callback);
  },

  // --- Debug Logging to File ---
  logToFileInit: () => ipcRenderer.send('log-to-file-init'),
  logToFileClose: () => ipcRenderer.send('log-to-file-close'),
  logToFileWrite: (log: DebugLogEntry) => ipcRenderer.send('log-to-file-write', log),

  // Auto Update
  restartAndInstallUpdate: () => ipcRenderer.send('restart-and-install-update'),
  onUpdateStatusChange: (callback: (event: IpcRendererEvent, data: any) => void) => {
    ipcRenderer.on('update-status-change', callback);
  },
  removeUpdateStatusChangeListener: (callback: (event: IpcRendererEvent, data: any) => void) => {
    ipcRenderer.removeListener('update-status-change', callback);
  },
});