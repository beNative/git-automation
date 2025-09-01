import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { Repository, TaskStep, GlobalSettings, LogLevel, ProjectSuggestion, LocalPathState, UpdateStatus, DetailedStatus, Commit, BranchInfo } from '../types';

const taskLogChannel = 'task-log';
const taskStepEndChannel = 'task-step-end';
const updateStatusChannel = 'update-status-changed';


contextBridge.exposeInMainWorld('electronAPI', {
  // App Info
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  onUpdateStatusChanged: (callback: (event: IpcRendererEvent, data: { status: UpdateStatus, message?: string }) => void) => {
    ipcRenderer.on(updateStatusChannel, callback);
  },

  // Documentation
  getDoc: (docName: string): Promise<string> => ipcRenderer.invoke('get-doc', docName),
  
  // Smart Scripts
  getProjectSuggestions: (args: { repoPath: string, repoName: string }): Promise<ProjectSuggestion[]> => ipcRenderer.invoke('get-project-suggestions', args),
  getProjectStepSuggestions: (args: { repoPath: string, repoName: string }): Promise<Omit<TaskStep, 'id'>[]> => ipcRenderer.invoke('get-project-step-suggestions', args),

  // Version Control
  checkVcsStatus: (repo: Repository): Promise<{ isDirty: boolean; output: string }> => ipcRenderer.invoke('check-vcs-status', repo),
  getDetailedVcsStatus: (repo: Repository): Promise<DetailedStatus | null> => ipcRenderer.invoke('get-detailed-vcs-status', repo),
  getCommitHistory: (repoPath: string): Promise<Commit[]> => ipcRenderer.invoke('get-commit-history', repoPath),
  listBranches: (repoPath: string): Promise<BranchInfo> => ipcRenderer.invoke('list-branches', repoPath),
  checkoutBranch: (repoPath: string, branch: string): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('checkout-branch', repoPath, branch),
  createBranch: (repoPath: string, branch: string): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('create-branch', repoPath, branch),
  deleteBranch: (repoPath: string, branch: string, isRemote: boolean): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('delete-branch', repoPath, branch, isRemote),
  mergeBranch: (repoPath: string, branch: string): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('merge-branch', repoPath, branch),

  // Local Path and Actions
  checkLocalPath: (path: string): Promise<LocalPathState> => ipcRenderer.invoke('check-local-path', path),
  cloneRepository: (args: { repo: Repository, executionId: string }) => ipcRenderer.send('clone-repository', args),
  launchApplication: (args: { repo: Repository, command: string }) => ipcRenderer.invoke('launch-application', args),
  showDirectoryPicker: (): Promise<{ canceled: boolean, filePaths: string[] }> => ipcRenderer.invoke('show-directory-picker'),
  pathJoin: (...args: string[]): Promise<string> => ipcRenderer.invoke('path-join', ...args),
  detectExecutables: (repoPath: string): Promise<string[]> => ipcRenderer.invoke('detect-executables', repoPath),
  launchExecutable: (args: { repoPath: string, executablePath: string }): Promise<{ success: boolean, output: string }> => ipcRenderer.invoke('launch-executable', args),
  openLocalPath: (path: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('open-local-path', path),
  openTerminal: (path: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('open-terminal', path),


  // Real Task Execution
  runTaskStep: (args: { repo: Repository; step: TaskStep; settings: GlobalSettings; executionId: string; }) => {
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
  }
});