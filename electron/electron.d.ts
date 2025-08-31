import type { IpcRendererEvent } from 'electron';
import type { Repository, TaskStep, GlobalSettings, LogLevel } from '../types';

export interface IElectronAPI {
  getDoc: (docName: string) => Promise<string>;
  getPackageScripts: (repoPath: string) => Promise<string[]>;
  getAppVersion: () => Promise<string>;
  
  runTaskStep: (args: {
    repo: Repository;
    step: TaskStep;
    settings: GlobalSettings;
  }) => void;

  onTaskLog: (
    callback: (event: IpcRendererEvent, data: { message: string; level: LogLevel }) => void
  ) => void;
  
  onTaskStepEnd: (
    callback: (event: IpcRendererEvent, exitCode: number) => void
  ) => void;

  removeTaskListeners: () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
