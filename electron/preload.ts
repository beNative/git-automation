import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { Repository, Task, TaskStep, GlobalSettings, LogLevel, ProjectSuggestion, LocalPathState, DetailedStatus, Commit, BranchInfo, DebugLogEntry, VcsType, ProjectInfo, Category, AppDataContextState, ReleaseInfo, CommitDiffFile, WorkflowFileSummary, WorkflowTemplateSuggestion } from '../types';

const taskLogChannel = 'task-log';
const taskStepEndChannel = 'task-step-end';
const logToRendererChannel = 'log-to-renderer';


contextBridge.exposeInMainWorld('electronAPI', {
  // App Info
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  
  // Window Controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  onWindowMaximizedStatus: (callback: (event: IpcRendererEvent, status: boolean) => void) => {
    ipcRenderer.on('window-maximized-status', callback);
  },
  removeWindowMaximizedStatusListener: (callback: (event: IpcRendererEvent, status: boolean) => void) => {
    ipcRenderer.removeListener('window-maximized-status', callback);
  },

  // App Data
  getAllData: (): Promise<AppDataContextState> => ipcRenderer.invoke('get-all-data'),
  saveAllData: (data: AppDataContextState) => ipcRenderer.send('save-all-data', data),

  // Documentation
  getDoc: (docName: string): Promise<string> => ipcRenderer.invoke('get-doc', docName),
  
  // Smart Scripts
  getProjectInfo: (repoPath: string): Promise<ProjectInfo> => ipcRenderer.invoke('get-project-info', repoPath),
  getProjectSuggestions: (args: { repoPath: string, repoName: string }): Promise<ProjectSuggestion[]> => ipcRenderer.invoke('get-project-suggestions', args),
  getWorkflowTemplates: (args: { repoPath: string; repoName: string }): Promise<WorkflowTemplateSuggestion[]> => ipcRenderer.invoke('get-workflow-templates', args),
  getDelphiVersions: (): Promise<{ name: string; version: string }[]> => ipcRenderer.invoke('get-delphi-versions'),

  // Version Control
  checkVcsStatus: (repo: Repository): Promise<{ isDirty: boolean; output: string; untrackedFiles: string[]; changedFiles: string[] }> => ipcRenderer.invoke('check-vcs-status', repo),
  getDetailedVcsStatus: (repo: Repository): Promise<DetailedStatus | null> => ipcRenderer.invoke('get-detailed-vcs-status', repo),
  getCommitHistory: (repo: Repository, skipCount?: number, searchQuery?: string): Promise<Commit[]> => ipcRenderer.invoke('get-commit-history', repo, skipCount, searchQuery),
  getCommitDiff: (repo: Repository, commitHash: string): Promise<CommitDiffFile[]> => ipcRenderer.invoke('get-commit-diff', repo, commitHash),
  listBranches: (args: { repoPath: string; vcs?: 'git' | 'svn' }): Promise<BranchInfo> => ipcRenderer.invoke('list-branches', args),
  checkoutBranch: (args: { repoPath: string; branch: string; vcs?: 'git' | 'svn' }): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('checkout-branch', args),
  createBranch: (repoPath: string, branch: string): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('create-branch', repoPath, branch),
  pruneRemoteBranches: (repoPath: string): Promise<{ success: boolean; error?: string; message?: string }> => ipcRenderer.invoke('prune-stale-remote-branches', repoPath),
  cleanupLocalBranches: (repoPath: string): Promise<{ success: boolean; error?: string; message?: string }> => ipcRenderer.invoke('cleanup-merged-local-branches', repoPath),
  deleteBranch: (repoPath: string, branch: string, isRemote: boolean, remoteName?: string): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('delete-branch', repoPath, branch, isRemote, remoteName),
  mergeBranch: (repoPath: string, branch: string): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('merge-branch', repoPath, branch),
  ignoreFilesAndPush: (args: { repo: Repository, filesToIgnore: string[] }): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('ignore-files-and-push', args),
  
  // Release Management
  getLatestRelease: (repo: Repository): Promise<ReleaseInfo | null> => ipcRenderer.invoke('get-latest-release', repo),
  getAllReleases: (repo: Repository): Promise<ReleaseInfo[] | null> => ipcRenderer.invoke('get-all-releases', repo),
  updateRelease: (args: { repo: Repository, releaseId: number, options: Partial<ReleaseInfo> }): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('update-release', args),
  createRelease: (args: { repo: Repository, options: { tag_name: string, name: string, body: string, draft: boolean, prerelease: boolean } }): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('create-release', args),
  deleteRelease: (args: { repo: Repository, releaseId: number }): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('delete-release', args),

  // GitHub PAT
  getGithubPat: (): Promise<string> => ipcRenderer.invoke('get-github-pat'),

  // Local Path and Actions
  checkLocalPath: (path: string): Promise<LocalPathState> => ipcRenderer.invoke('check-local-path', path),
  discoverRemoteUrl: (args: { localPath: string, vcs: VcsType }): Promise<{ url: string | null; error?: string }> => ipcRenderer.invoke('discover-remote-url', args),
  cloneRepository: (args: { repo: Repository, executionId: string }) => ipcRenderer.send('clone-repository', args),
  launchApplication: (args: { repo: Repository, command: string }) => ipcRenderer.invoke('launch-application', args),
  showDirectoryPicker: (): Promise<{ canceled: boolean, filePaths: string[] }> => ipcRenderer.invoke('show-directory-picker'),
  showFilePicker: (): Promise<{ canceled: boolean; filePaths: string[] }> => ipcRenderer.invoke('show-file-picker'),
  testExecutablePath: (args: { path: string; vcsType: 'git' | 'svn' }): Promise<{ success: boolean; version?: string; error?: string }> => ipcRenderer.invoke('test-executable-path', args),
  autodetectExecutablePath: (vcsType: 'git' | 'svn'): Promise<string | null> => ipcRenderer.invoke('autodetect-executable-path', vcsType),
  pathJoin: (...args: string[]): Promise<string> => ipcRenderer.invoke('path-join', ...args),
  detectExecutables: (repoPath: string): Promise<string[]> => ipcRenderer.invoke('detect-executables', repoPath),
  launchExecutable: (args: { repoPath: string, executablePath: string }): Promise<{ success: boolean; output: string }> => ipcRenderer.invoke('launch-executable', args),
  listWorkflowFiles: (repoPath: string): Promise<WorkflowFileSummary[]> => ipcRenderer.invoke('list-workflow-files', repoPath),
  readWorkflowFile: (args: { repoPath: string; relativePath: string }): Promise<{ success: boolean; content?: string; error?: string }> => ipcRenderer.invoke('read-workflow-file', args),
  writeWorkflowFile: (args: { repoPath: string; relativePath: string; content: string }): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('write-workflow-file', args),
  createWorkflowFromTemplate: (args: { repoPath: string; relativePath: string; content: string; overwrite?: boolean }): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('create-workflow-from-template', args),
  commitWorkflowFiles: (args: { repo: Repository; filePaths: string[]; message: string }): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('commit-workflow-files', args),
  validateWorkflow: (args: { repo: Repository; relativePath: string; executionId: string }) => {
    ipcRenderer.send('validate-workflow', args);
  },
  openLocalPath: (path: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('open-local-path', path),
  openInstallationFolder: (): Promise<{ success: boolean; error?: string; path?: string }> => ipcRenderer.invoke('open-installation-folder'),
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
  cancelTaskExecution: (args: { executionId: string }) => {
    ipcRenderer.send('cancel-task-execution', args);
  },

  onTaskLog: (callback: (event: IpcRendererEvent, data: { executionId: string, message: string, level: LogLevel}) => void) => {
    ipcRenderer.on(taskLogChannel, callback);
  },
  removeTaskLogListener: (callback: (event: IpcRendererEvent, data: { executionId: string, message: string, level: LogLevel}) => void) => {
    ipcRenderer.removeListener(taskLogChannel, callback);
  },

  onTaskStepEnd: (callback: (event: IpcRendererEvent, data: { executionId: string, exitCode: number, cancelled?: boolean }) => void) => {
    ipcRenderer.on(taskStepEndChannel, callback);
  },
  removeTaskStepEndListener: (callback: (event: IpcRendererEvent, data: { executionId: string, exitCode: number, cancelled?: boolean }) => void) => {
    ipcRenderer.removeListener(taskStepEndChannel, callback);
  },

  // --- Debug Logging to Renderer ---
  onLogFromMain: (callback: (event: IpcRendererEvent, data: { level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any }) => void) => {
    ipcRenderer.on(logToRendererChannel, callback);
  },
  removeLogFromMainListener: (callback: (event: IpcRendererEvent, data: any) => void) => {
    ipcRenderer.removeListener(logToRendererChannel, callback);
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

  // Task Log Settings
  getTaskLogPath: (): Promise<string> => ipcRenderer.invoke('get-task-log-path'),
  openTaskLogPath: () => ipcRenderer.invoke('open-task-log-path'),
  selectTaskLogPath: (): Promise<{ canceled: boolean, path: string | null }> => ipcRenderer.invoke('select-task-log-path'),
});