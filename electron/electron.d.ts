import type { IpcRendererEvent } from 'electron';
import type { Repository, TaskStep, GlobalSettings, LogLevel, LocalPathState as AppLocalPathState } from '../types';

export type LocalPathState = AppLocalPathState;


export interface ProjectSuggestion {
  label: string;
  value: string;
  group: string;
}

export interface IElectronAPI {
  getDoc: (docName: string) => Promise<string>;
  getProjectSuggestions: (args: { repoPath: string, repoName: string }) => Promise<ProjectSuggestion[]>;
  getProjectStepSuggestions: (args: { repoPath: string, repoName: string }) => Promise<Omit<TaskStep, 'id'>[]>;
  checkVcsStatus: (repo: Repository) => Promise<{ isDirty: boolean; output: string }>;

  checkLocalPath: (path: string) => Promise<LocalPathState>;
  cloneRepository: (repo: Repository) => void;
  launchApplication: (repo: Repository) => Promise<{ success: boolean; output: string }>;
  showDirectoryPicker: () => Promise<{ canceled: boolean, filePaths: string[] }>;
  pathJoin: (...args: string[]) => Promise<string>;
  detectExecutables: (repoPath: string) => Promise<string[]>;
  launchExecutable: (args: { repoPath: string, executablePath: string }) => Promise<{ success: boolean; output: string }>;
  
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