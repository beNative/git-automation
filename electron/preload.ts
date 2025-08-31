import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { Repository, TaskStep, GlobalSettings, LogLevel } from '../types';

const taskLogChannel = 'task-log';
const taskStepEndChannel = 'task-step-end';

contextBridge.exposeInMainWorld('electronAPI', {
  // Documentation
  getDoc: (docName: string): Promise<string> => ipcRenderer.invoke('get-doc', docName),
  
  // Smart Scripts
  getPackageScripts: (repoPath: string): Promise<string[]> => ipcRenderer.invoke('get-package-scripts', repoPath),

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