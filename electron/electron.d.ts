import type { IpcRendererEvent } from 'electron';
import type { Repository, TaskStep, GlobalSettings, LogLevel, LocalPathState as AppLocalPathState, UpdateStatus as AppUpdateStatus } from '../types';

export type LocalPathState = AppLocalPathState;
export type UpdateStatus = AppUpdateStatus;


export interface ProjectSuggestion {
  label: string;
  value: string;
  group: string;
}

export interface IElectronAPI {
  getAppVersion: () => Promise<string>;
  onUpdateStatusChanged: (callback: (event: IpcRendererEvent, data: { status: UpdateStatus, message?: string }) => void) => void;
  getDoc: (docName: string) => Promise<string>;
  getProjectSuggestions: (args: { repoPath: string, repoName: string }) => Promise<ProjectSuggestion[]>;
  getProjectStepSuggestions: (args: { repoPath: string, repoName: string }) => Promise<Omit<TaskStep, 'id'>[]>;
  checkVcsStatus: (repo: Repository) => Promise<{ isDirty: boolean; output: string }>;

  checkLocalPath: (path: string) => Promise<LocalPathState>;
  cloneRepository: (repo: Repository) => void;
  launchApplication: (args: { repo: Repository, command: string }) => Promise<{ success: boolean; output: string }>;
  showDirectoryPicker: () => Promise<{ canceled: boolean, filePaths: string[] }>;
  pathJoin: (...args: string[]) => Promise<string>;
  detectExecutables: (repoPath: string) => Promise<string[]>;
  launchExecutable: (args: { repoPath: string, executablePath: string }) => Promise<{ success: boolean; output: string }>;
  openLocalPath: (path: string) => Promise<{ success: boolean; error?: string }>;
  
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