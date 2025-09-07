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

export enum TaskStepType {
  GitPull = 'GIT_PULL',
  GitFetch = 'GIT_FETCH',
  GitCheckout = 'GIT_CHECKOUT',
  GitStash = 'GIT_STASH',
  SvnUpdate = 'SVN_UPDATE',
  RunCommand = 'RUN_COMMAND',
  DelphiBuild = 'DELPHI_BUILD',
  DELPHI_PACKAGE_INNO = 'DELPHI_PACKAGE_INNO',
  DELPHI_PACKAGE_NSIS = 'DELPHI_PACKAGE_NSIS',
  DELPHI_TEST_DUNITX = 'DELPHI_TEST_DUNITX',
  PYTHON_CREATE_VENV = 'PYTHON_CREATE_VENV',
  PYTHON_INSTALL_DEPS = 'PYTHON_INSTALL_DEPS',
  PYTHON_RUN_LINT = 'PYTHON_RUN_LINT',
  PYTHON_RUN_FORMAT = 'PYTHON_RUN_FORMAT',
  PYTHON_RUN_TYPECHECK = 'PYTHON_RUN_TYPECHECK',
  PYTHON_RUN_TESTS = 'PYTHON_RUN_TESTS',
  PYTHON_RUN_BUILD = 'PYTHON_RUN_BUILD',
  NODE_INSTALL_DEPS = 'NODE_INSTALL_DEPS',
  NODE_RUN_LINT = 'NODE_RUN_LINT',
  NODE_RUN_FORMAT = 'NODE_RUN_FORMAT',
  NODE_RUN_TYPECHECK = 'NODE_RUN_TYPECHECK',
  NODE_RUN_TESTS = 'NODE_RUN_TESTS',
  NODE_RUN_BUILD = 'NODE_RUN_BUILD',
  LAZARUS_BUILD = 'LAZARUS_BUILD',
  LAZARUS_BUILD_PACKAGE = 'LAZARUS_BUILD_PACKAGE',
  FPC_TEST_FPCUNIT = 'FPC_TEST_FPCUNIT',
}

export interface TaskStep {
  id: string;
  type: TaskStepType;
  enabled?: boolean;
  command?: string;
  branch?: string;
  delphiProjectFile?: string;
  delphiBuildMode?: 'Build' | 'Rebuild' | 'Clean';
  delphiConfiguration?: string;
  delphiPlatform?: string;
  delphiInstallerScript?: string;
  delphiInstallerDefines?: string;
  delphiTestExecutable?: string;
  delphiTestOutputFile?: string;
  lazarusProjectFile?: string;
  lazarusPackageFile?: string;
  lazarusBuildMode?: string;
  lazarusCpu?: string;
  lazarusOs?: string;
  lazarusWidgetset?: string;
  fpcTestOutputFile?: string;
}

export interface Task {
  id: string;
  name: string;
  steps: TaskStep[];
  showOnDashboard: boolean;
  variables?: { id: string, key: string, value: string }[];
  environmentVariables?: { id: string, key: string, value: string }[];
}

export interface WebLinkConfig {
  id: string;
  name: string;
  url: string;
}

export interface LaunchConfig {
  id: string;
  name: string;
  type: 'command' | 'select-executable';
  command?: string;
  showOnDashboard: boolean;
}

interface BaseRepository {
  id: string;
  name: string;
  remoteUrl: string;
  localPath: string;
  category?: string;
  status: RepoStatus;
  lastUpdated: string | null;
  buildHealth: BuildHealth;
  tasks: Task[];
  webLinks: WebLinkConfig[];
  launchConfigs: LaunchConfig[];
}

export interface GitRepository extends BaseRepository {
  vcs: VcsType.Git;
  branch: string;
  ignoreDirty?: boolean;
}

export interface SvnRepository extends BaseRepository {
  vcs: VcsType.Svn;
}

export type Repository = GitRepository | SvnRepository;

export type AppView = 'dashboard' | 'settings' | 'info' | 'edit-repository';

export type IconSet = 'heroicons' | 'lucide' | 'tabler' | 'feather' | 'remix' | 'phosphor';

export interface GlobalSettings {
  theme: 'light' | 'dark';
  iconSet: IconSet;
  openLinksIn: 'default' | 'chrome' | 'firefox';
  notifications: boolean;
  simulationMode: boolean;
  allowPrerelease: boolean;
  debugLogging: boolean;
}

export interface AllData {
  globalSettings: GlobalSettings;
  repositories: Repository[];
  categories: Category[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
  isCollapsed: boolean;
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

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

export type LocalPathState = 'checking' | 'valid' | 'missing' | 'not_a_repo';

export interface DetailedStatus {
  files: {
    added: number;
    deleted: number;
    modified: number;
    untracked: number;
    conflicted: number;
    renamed: number;
  };
  isDirty: boolean;
  updatesAvailable?: boolean; // For SVN or simple checks
  branchInfo?: {
    ahead: number;
    behind: number;
    tracking: string | null;
  };
}

export interface BranchInfo {
  local: string[];
  remote: string[];
  current: string;
}

export interface Commit {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface ProjectSuggestion {
  label: string;
  value: string;
  group: string;
}

export type Launchable =
  | { type: 'manual'; config: LaunchConfig }
  | { type: 'detected'; path: string };


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

// Project info types
export interface DelphiProject {
    path: string;
    framework: string;
    type: string;
}

export interface DelphiCapabilities {
    projects: DelphiProject[];
    groups: string[];
    packaging: {
        innoSetup: string[];
        nsis: string[];
    };
    testing: {
        dunitx: boolean;
    };
}
export interface PythonCapabilities {
    envManager: 'venv' | 'pipenv' | 'poetry' | 'conda' | 'unknown';
    buildBackend: 'setuptools' | 'flit' | 'poetry-core' | 'pdm-pep517' | 'unknown';
    testFramework: 'pytest' | 'unittest' | 'unknown';
    linters: ('ruff' | 'flake8' | 'pylint')[];
    formatters: ('black' | 'isort' | 'ruff-format')[];
    typeCheckers: ('mypy' | 'pyright')[];
}
export interface NodejsCapabilities {
    packageManagers: {
        npm: boolean;
        yarn: boolean;
        pnpm: boolean;
        bun: boolean;
    };
    declaredManager: string | null;
    typescript: boolean;
    testFrameworks: ('jest' | 'vitest')[];
    linters: ('eslint' | 'prettier')[];
    bundlers: ('webpack' | 'vite' | 'rollup')[];
    monorepo: {
        turbo: boolean;
        nx: boolean;
    };
}
export interface LazarusProject {
    path: string;
    type: 'Project' | 'Test';
}
export interface LazarusCapabilities {
    projects: LazarusProject[];
    packages: string[];
}

export interface ProjectInfo {
    tags: ('delphi' | 'python' | 'nodejs' | 'lazarus')[];
    delphi?: DelphiCapabilities;
    python?: PythonCapabilities;
    nodejs?: NodejsCapabilities;
    lazarus?: LazarusCapabilities;
}
