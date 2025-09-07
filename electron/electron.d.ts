import type { IpcRendererEvent } from 'electron';
import type { Repository, Task, TaskStep, GlobalSettings, LogLevel, LocalPathState as AppLocalPathState, DetailedStatus, Commit, BranchInfo, DebugLogEntry, VcsType, ProjectInfo, UpdateStatusMessage, Category, AppDataContextState } from '../types';

export type LocalPathState = AppLocalPathState;


export interface ProjectSuggestion {
  label: string;
  value: string;
  group: string;
}

export interface IElectronAPI {
  getAppVersion: () => Promise<string>;
  getAllData: () => Promise<AppDataContextState>;
  saveAllData: (data: AppDataContextState) => void;
  getDoc: (docName: string) => Promise<string>;
  getProjectInfo: (repoPath: string) => Promise<ProjectInfo>;
  getProjectSuggestions: (args: { repoPath: string, repoName: string }) => Promise<ProjectSuggestion[]>;
  checkVcsStatus: (repo: Repository) => Promise<{ isDirty: boolean; output: string; untrackedFiles: string[]; changedFiles: string[] }>;
  getDetailedVcsStatus: (repo: Repository) => Promise<DetailedStatus | null>;
  getCommitHistory: (repoPath: string, skipCount?: number, searchQuery?: string) => Promise<Commit[]>;
  listBranches: (repoPath: string) => Promise<BranchInfo>;
  checkoutBranch: (repoPath: string, branch: string) => Promise<{ success: boolean; error?: string }>;
  createBranch: (repoPath: string, branch: string) => Promise<{ success: boolean; error?: string }>;
  deleteBranch: (repoPath: string, branch: string, isRemote: boolean) => Promise<{ success: boolean; error?: string }>;
  mergeBranch: (repoPath: string, branch: string) => Promise<{ success: boolean; error?: string }>;
  ignoreFilesAndPush: (args: { repo: Repository; filesToIgnore: string[] }) => Promise<{ success: boolean; error?: string }>;


  checkLocalPath: (path: string) => Promise<LocalPathState>;
  discoverRemoteUrl: (args: { localPath: string; vcs: VcsType; }) => Promise<{ url: string | null; error?: string }>;
  cloneRepository: (args: { repo: Repository, executionId: string }) => void;
  launchApplication: (args: { repo: Repository, command: string }) => Promise<{ success: boolean; output: string }>;
  showDirectoryPicker: () => Promise<{ canceled: boolean, filePaths: string[] }>;
  pathJoin: (...args: string[]) => Promise<string>;
  detectExecutables: (repoPath: string) => Promise<string[]>;
  launchExecutable: (args: { repoPath: string, executablePath: string }) => Promise<{ success: boolean; output: string }>;
  openLocalPath: (path: string) => Promise<{ success: boolean; error?: string }>;
  openWeblink: (url: string) => Promise<{ success: boolean; error?: string }>;
  openTerminal: (path: string) => Promise<{ success: boolean; error?: string }>;
  
  // JSON Config
  getRawSettingsJson: () => Promise<string>;
  showSettingsFile: () => void;
  exportSettings: () => Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }>;
  importSettings: () => Promise<{ success: boolean; error?: string; canceled?: boolean }>;
  
  runTaskStep: (args: {
    repo: Repository;
    step: TaskStep;
    settings: GlobalSettings;
    executionId: string;
    task: Task;
  }) => void;

  onTaskLog: (
    callback: (event: IpcRendererEvent, data: { executionId: string; message: string; level: LogLevel }) => void
  ) => void;
  removeTaskLogListener: (
    callback: (event: IpcRendererEvent, data: { executionId: string; message: string; level: LogLevel }) => void
  ) => void;
  
  onTaskStepEnd: (
    callback: (event: IpcRendererEvent, data: { executionId: string; exitCode: number }) => void
  ) => void;
  removeTaskStepEndListener: (
    callback: (event: IpcRendererEvent, data: { executionId: string; exitCode: number }) => void
  ) => void;

  // Debug Logging
  logToFileInit: () => void;
  logToFileClose: () => void;
  logToFileWrite: (log: DebugLogEntry) => void;

  // Auto Update
  restartAndInstallUpdate: () => void;
  onUpdateStatusChange: (
    callback: (event: IpcRendererEvent, data: UpdateStatusMessage) => void
  ) => void;
  removeUpdateStatusChangeListener: (
    callback: (event: IpcRendererEvent, data: UpdateStatusMessage) => void
  ) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}