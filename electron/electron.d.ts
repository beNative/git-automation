import type { IpcRendererEvent } from 'electron';
import type { Repository, TaskStep, GlobalSettings, LogLevel } from '../types';

export interface ProjectSuggestion {
  label: string;
  value: string;
  group: string;
}

export interface IElectronAPI {
  getDoc: (docName: string) => Promise<string>;
  getProjectSuggestions: (args: { repoPath: string, repoName: string }) => Promise<ProjectSuggestion[]>;
  getProjectStepSuggestions: (args: { repoPath: string, repoName: string }) => Promise<Omit<TaskStep, 'id'>[]>;
  checkGitStatus: (repoPath: string) => Promise<{ isDirty: boolean; output: string }>;
  
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