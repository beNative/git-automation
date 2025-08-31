export enum RepoStatus {
  Idle = 'Idle',
  Syncing = 'Syncing',
  Building = 'Building',
  Deploying = 'Deploying',
  Success = 'Success',
  Failed = 'Failed',
}

export enum BuildHealth {
  Healthy = 'Healthy',
  Failing = 'Failing',
  Unknown = 'Unknown',
}

export interface Repository {
  id: string;
  name: string;
  remoteUrl: string;
  localPath: string;
  branch: string;
  authType: 'none' | 'ssh' | 'token';
  authToken?: string; // For HTTPS token
  sshKeyPath?: string; // Path to SSH key
  status: RepoStatus;
  lastUpdated: string | null;
  buildHealth: BuildHealth;
}

export enum LogLevel {
  Info = 'info',
  Command = 'command',
  Success = 'success',
  Error = 'error',
  Warn = 'warn',
}

export interface LogEntry {
  timestamp: string;
  message: string;
  level: LogLevel;
}

export interface GlobalSettings {
  defaultPackageManager: 'npm' | 'yarn';
  defaultBuildCommand: string;
  notifications: boolean;
}

export enum TaskStepType {
  GitPull = 'GIT_PULL',
  InstallDeps = 'INSTALL_DEPS',
  RunCommand = 'RUN_COMMAND',
}

export interface TaskStep {
  id: string;
  type: TaskStepType;
  command?: string; // Only for RunCommand
}

export interface Task {
  id: string;
  name: string;
  steps: TaskStep[];
}


export interface ActiveModal {
  type: 'logs' | 'repo-form' | 'settings' | 'task-form' | null;
  repoId?: string | null;
  taskId?: string | null; // For editing tasks
}
