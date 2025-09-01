import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { Repository, TaskStep, GlobalSettings, LogLevel, ProjectSuggestion, LocalPathState } from '../types';

const taskLogChannel = 'task-log';
const taskStepEndChannel = 'task-step-end';

contextBridge.exposeInMainWorld('electronAPI', {
  // Documentation
  getDoc: (docName: string): Promise<string> => ipcRenderer.invoke('get-doc', docName),
  
  // Smart Scripts
  getProjectSuggestions: (args: { repoPath: string, repoName: string }): Promise<ProjectSuggestion[]> => ipcRenderer.invoke('get-project-suggestions', args),
  getProjectStepSuggestions: (args: { repoPath: string, repoName: string }): Promise<Omit<TaskStep, 'id'>[]> => ipcRenderer.invoke('get-project-step-suggestions', args),

  // Version Control
  checkVcsStatus: (repo: Repository): Promise<{ isDirty: boolean; output: string }> => ipcRenderer.invoke('check-vcs-status', repo),

  // Local Path and Actions
  checkLocalPath: (path: string): Promise<LocalPathState> => ipcRenderer.invoke('check-local-path', path),
  cloneRepository: (repo: Repository) => ipcRenderer.send('clone-repository', repo),
  launchApplication: (args: { repo: Repository, command: string }) => ipcRenderer.invoke('launch-application', args),
  showDirectoryPicker: (): Promise<{ canceled: boolean, filePaths: string[] }> => ipcRenderer.invoke('show-directory-picker'),
  pathJoin: (...args: string[]): Promise<string> => ipcRenderer.invoke('path-join', ...args),
  detectExecutables: (repoPath: string): Promise<string[]> => ipcRenderer.invoke('detect-executables', repoPath),
  launchExecutable: (args: { repoPath: string, executablePath: string }): Promise<{ success: boolean, output: string }> => ipcRenderer.invoke('launch-executable', args),
  openLocalPath: (path: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('open-local-path', path),


  // Real Task Execution
  runTaskStep: (args: { repo: Repository; step: TaskStep; settings: GlobalSettings; }) => {
    ipcRenderer.send('run-task-step', args);
  },

  onTaskLog: (callback: (event: IpcRendererEvent, data: {message: string, level: LogLevel}) => void) => {
    ipcRenderer.on(taskLogChannel, callback);
  },

  onTaskStepEnd: (callback: (event: IpcRendererEvent, exitCode: number) => void) => {
    ipcRenderer.on(taskStepEndChannel, callback);
  },

  removeTaskListeners: () => {
    ipcRenderer.removeAllListeners(taskLogChannel);
    ipcRenderer.removeAllListeners(taskStepEndChannel);
  }
});