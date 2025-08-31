import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { Repository, TaskStep, GlobalSettings, LogLevel, ProjectSuggestion } from '../types';

const taskLogChannel = 'task-log';
const taskStepEndChannel = 'task-step-end';

contextBridge.exposeInMainWorld('electronAPI', {
  // Documentation
  getDoc: (docName: string): Promise<string> => ipcRenderer.invoke('get-doc', docName),
  
  // Smart Scripts
  getProjectSuggestions: (args: { repoPath: string, repoName: string }): Promise<ProjectSuggestion[]> => ipcRenderer.invoke('get-project-suggestions', args),
  
  // Fix: Expose checkGitStatus to the renderer process.
  checkGitStatus: (repoPath: string): Promise<{ isDirty: boolean; output: string }> => ipcRenderer.invoke('check-git-status', repoPath),

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