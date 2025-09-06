// FIX: Defined RepoStatus and BuildHealth enums here to resolve a circular dependency with constants.ts.
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

export interface WebLinkConfig {
  id:string;
  name: string;
  url: string;
}

export interface BaseRepository {
  id:string;
  name: string;
  localPath: string;
  webLinks?: WebLinkConfig[];
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
  ignoreDirty?: boolean;
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

// --- New Debug Logging System Types ---
export enum DebugLogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface DebugLogEntry {
  id: number;
  timestamp: Date;
  level: DebugLogLevel;
  message: string;
  data?: any;
}


export interface GlobalSettings {
  defaultBuildCommand: string;
  notifications: boolean;
  simulationMode: boolean;
  theme: 'light' | 'dark';
  iconSet: 'heroicons' | 'lucide' | 'tabler' | 'feather' | 'remix' | 'phosphor';
  debugLogging: boolean;
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
  // Project-specific
  DelphiBuild = 'DELPHI_BUILD',
  DELPHI_PACKAGE_INNO = 'DELPHI_PACKAGE_INNO',
  DELPHI_PACKAGE_NSIS = 'DELPHI_PACKAGE_NSIS',
  DELPHI_TEST_DUNITX = 'DELPHI_TEST_DUNITX',
  // Python-specific steps
  PYTHON_CREATE_VENV = 'PYTHON_CREATE_VENV',
  PYTHON_INSTALL_DEPS = 'PYTHON_INSTALL_DEPS',
  PYTHON_RUN_LINT = 'PYTHON_RUN_LINT',
  PYTHON_RUN_FORMAT = 'PYTHON_RUN_FORMAT',
  PYTHON_RUN_TYPECHECK = 'PYTHON_RUN_TYPECHECK',
  PYTHON_RUN_TESTS = 'PYTHON_RUN_TESTS',
  PYTHON_RUN_BUILD = 'PYTHON_RUN_BUILD',
  // Node.js-specific steps
  NODE_INSTALL_DEPS = 'NODE_INSTALL_DEPS',
  NODE_RUN_LINT = 'NODE_RUN_LINT',
  NODE_RUN_FORMAT = 'NODE_RUN_FORMAT',
  NODE_RUN_TYPECHECK = 'NODE_RUN_TYPECHECK',
  NODE_RUN_TESTS = 'NODE_RUN_TESTS',
  NODE_RUN_BUILD = 'NODE_RUN_BUILD',
}

export interface TaskStep {
  id: string;
  type: TaskStepType;
  command?: string; // Only for RunCommand
  branch?: string; // Only for GitCheckout
  enabled?: boolean;
  // Delphi Build specific
  delphiConfiguration?: string;
  delphiPlatform?: string;
  delphiProjectFile?: string;
  delphiBuildMode?: 'Build' | 'Rebuild' | 'Clean';
  // Delphi Test specific
  delphiTestExecutable?: string;
  delphiTestOutputFile?: string;
  // Delphi Packaging specific
  delphiInstallerScript?: string;
  delphiInstallerDefines?: string;
}

export interface Task {
  id: string;
  name: string;
  steps: TaskStep[];
  variables?: { id: string; key: string; value: string }[];
  showOnDashboard?: boolean;
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
  updatesAvailable?: boolean;
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

// --- Python Project Types ---
export interface PythonCapabilities {
  requestedPythonVersion: string | null;
  envManager: 'poetry' | 'pdm' | 'pip' | 'conda' | 'pipenv' | 'unknown';
  buildBackend: 'setuptools' | 'hatch' | 'poetry' | 'flit' | 'pdm' | 'mesonpy' | 'unknown';
  testFramework: 'pytest' | 'tox' | 'nox' | 'unittest' | 'unknown';
  linters: string[];
  formatters: string[];
  typeCheckers: string[];
  hasPrecommit: boolean;
}

// --- Delphi Project Types ---
export interface DelphiProject {
    path: string;
    platforms: string[];
    configs: string[];
    hasDeployment: boolean;
    hasVersionInfo: boolean;
}

export interface DelphiCapabilities {
    projects: DelphiProject[];
    groups: string[];
    packaging: {
        innoSetup: string[];
        nsis: string[];
    };
    hasDUnitX: boolean;
    packageManagers: {
        boss: boolean;
    };
}

// --- Node.js Project Types ---
export interface NodejsCapabilities {
  engine: string | null;
  declaredManager: string | null;
  packageManagers: {
    pnpm: boolean;
    yarn: boolean;
    npm: boolean;
    bun: boolean;
  };
  typescript: boolean;
  testFrameworks: ('jest' | 'vitest' | 'mocha' | 'playwright' | 'cypress')[];
  linters: ('eslint' | 'prettier')[];
  bundlers: ('vite' | 'webpack' | 'rollup' | 'tsup' | 'swc')[];
  monorepo: {
    workspaces: boolean;
    turbo: boolean;
    nx: boolean;
    yarnBerryPnp: boolean;
  };
}

export interface ProjectInfo {
    tags: string[];
    files: Record<string, string[]>;
    python?: PythonCapabilities;
    delphi?: DelphiCapabilities;
    nodejs?: NodejsCapabilities;
}