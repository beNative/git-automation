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

export enum VcsType {
  Git = 'git',
  Svn = 'svn',
}

export interface LaunchConfig {
  id: string;
  name: string;
  type: 'command' | 'select-executable';
  command?: string; // Only for 'command' type
  showOnDashboard?: boolean;
}

export interface BaseRepository {
  id:string;
  name: string;
  localPath: string;
  vcs: VcsType;
  status: RepoStatus;
  lastUpdated: string | null;
  buildHealth: BuildHealth;
  tasks: Task[];
  launchConfigs?: LaunchConfig[];
}

export interface GitRepository extends BaseRepository {
  vcs: VcsType.Git;
  remoteUrl: string;
  branch: string;
}

export interface SvnRepository extends BaseRepository {
  vcs: VcsType.Svn;
  remoteUrl: string;
}

export type Repository = GitRepository | SvnRepository;

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
  defaultBuildCommand: string;
  notifications: boolean;
  simulationMode: boolean;
  theme: 'light' | 'dark';
  iconSet: 'heroicons' | 'lucide' | 'tabler';
  debugMode?: boolean;
}

export enum TaskStepType {
  // Git
  GitPull = 'GIT_PULL',
  GitFetch = 'GIT_FETCH',
  GitCheckout = 'GIT_CHECKOUT',
  GitStash = 'GIT_STASH',
  // SVN
  SvnUpdate = 'SVN_UPDATE',
  // Common
  RunCommand = 'RUN_COMMAND',
}

export interface TaskStep {
  id: string;
  type: TaskStepType;
  command?: string; // Only for RunCommand
  branch?: string; // Only for GitCheckout
  enabled?: boolean;
}

export interface Task {
  id: string;
  name: string;
  steps: TaskStep[];
  variables?: { id: string; key: string; value: string }[];
  showOnDashboard?: boolean;
}


export interface ActiveModal {
  type: 'repo-form' | null;
}

export type AppView = 'dashboard' | 'settings' | 'info' | 'edit-repository';

export interface ProjectSuggestion {
  label: string;
  value: string;
  group: string;
}

export type LocalPathState = 'checking' | 'valid' | 'missing' | 'not_a_repo';

export type Launchable =
  | { type: 'manual'; config: LaunchConfig }
  | { type: 'detected'; path: string };
  
export type UpdateStatus = 'checking' | 'up-to-date' | 'available' | 'error';

// --- New VCS Integration Types ---

export interface VcsFileStatus {
  added: number;
  modified: number;
  deleted: number;
  conflicted: number;
  untracked: number;
  renamed: number;
}

export interface GitBranchInfo {
  ahead: number;
  behind: number;
  tracking: string;
}

export interface DetailedStatus {
  files: VcsFileStatus;
  branchInfo?: GitBranchInfo;
  isDirty: boolean;
}

export interface Commit {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface BranchInfo {
    local: string[];
    remote: string[];
    current: string | null;
}