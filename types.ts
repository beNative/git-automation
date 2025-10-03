// FIX: Remove self-import causing declaration conflicts.

// Moved from contexts/IconContext.tsx
// FIX: Add 'heroicons' and 'phosphor' to the IconSet type to support more icon libraries.
export type IconSet = 'lucide' | 'tabler' | 'feather' | 'remix' | 'heroicons' | 'phosphor';

export type ShortcutScope = 'app' | 'global';
export type ShortcutPlatform = 'all' | 'mac' | 'windows' | 'linux';

export interface ShortcutContextOption {
  id: string;
  label: string;
  description?: string;
}

export interface ShortcutBinding {
  id: string;
  scope: ShortcutScope;
  shortcut: string;
  context: string;
  platform: ShortcutPlatform;
  isDefault?: boolean;
}

export interface KeyboardShortcutSettings {
  version: number;
  lastUpdated: string | null;
  bindings: Record<string, ShortcutBinding[]>;
}

export interface ShortcutCategoryDefinition {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface ShortcutDefinition {
  id: string;
  label: string;
  description: string;
  categoryId: string;
  keywords: string[];
  allowApp: boolean;
  allowGlobal: boolean;
  contexts?: Partial<Record<ShortcutScope, ShortcutContextOption[]>>;
  defaultBindings: Array<Omit<ShortcutBinding, 'id' | 'isDefault'>>;
  relatedActions?: string[];
}

export interface ShortcutConflict {
  actionId: string;
  binding: ShortcutBinding;
  conflictsWith: Array<{ actionId: string; binding: ShortcutBinding }>;
}

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
  // Delphi
  DelphiBuild = 'DELPHI_BUILD',
  DELPHI_BOSS_INSTALL = 'DELPHI_BOSS_INSTALL',
  DELPHI_PACKAGE_INNO = 'DELPHI_PACKAGE_INNO',
  DELPHI_PACKAGE_NSIS = 'DELPHI_PACKAGE_NSIS',
  DELPHI_TEST_DUNITX = 'DELPHI_TEST_DUNITX',
  // Python
  PYTHON_CREATE_VENV = 'PYTHON_CREATE_VENV',
  PYTHON_INSTALL_DEPS = 'PYTHON_INSTALL_DEPS',
  PYTHON_RUN_LINT = 'PYTHON_RUN_LINT',
  PYTHON_RUN_FORMAT = 'PYTHON_RUN_FORMAT',
  PYTHON_RUN_TYPECHECK = 'PYTHON_RUN_TYPECHECK',
  PYTHON_RUN_TESTS = 'PYTHON_RUN_TESTS',
  PYTHON_RUN_BUILD = 'PYTHON_RUN_BUILD',
  // Node.js
  NODE_INSTALL_DEPS = 'NODE_INSTALL_DEPS',
  NODE_RUN_LINT = 'NODE_RUN_LINT',
  NODE_RUN_FORMAT = 'NODE_RUN_FORMAT',
  NODE_RUN_TYPECHECK = 'NODE_RUN_TYPECHECK',
  NODE_RUN_TESTS = 'NODE_RUN_TESTS',
  NODE_RUN_BUILD = 'NODE_RUN_BUILD',
  // Lazarus/FPC
  LAZARUS_BUILD = 'LAZARUS_BUILD',
  LAZARUS_BUILD_PACKAGE = 'LAZARUS_BUILD_PACKAGE',
  FPC_TEST_FPCUNIT = 'FPC_TEST_FPCUNIT',
  // Docker
  DOCKER_BUILD_IMAGE = 'DOCKER_BUILD_IMAGE',
  DOCKER_COMPOSE_UP = 'DOCKER_COMPOSE_UP',
  DOCKER_COMPOSE_DOWN = 'DOCKER_COMPOSE_DOWN',
  DOCKER_COMPOSE_BUILD = 'DOCKER_COMPOSE_BUILD',
}

export enum LogLevel {
  Info = 'info',
  Command = 'command',
  Success = 'success',
  Error = 'error',
  Warn = 'warn',
}

export enum DebugLogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export type AppView = 'dashboard' | 'settings' | 'info' | 'edit-repository';

export type LocalPathState = 'valid' | 'missing' | 'checking' | 'not_a_repo';

export interface LogEntry {
  timestamp: string;
  message: string;
  level: LogLevel;
}

export interface DebugLogEntry {
  id: number;
  timestamp: Date;
  level: DebugLogLevel;
  message: string;
  data?: any;
}

export type ToastType = 'success' | 'error' | 'info';
export interface ToastMessage {
  message: string;
  type: ToastType;
}

export interface GlobalSettings {
  defaultBuildCommand: string;
  notifications: boolean;
  simulationMode: boolean;
  theme: 'light' | 'dark';
  iconSet: IconSet;
  debugLogging: boolean;
  allowPrerelease: boolean;
  openLinksIn: 'default' | 'chrome' | 'firefox';
  githubPat: string;
  gitExecutablePath: string;
  svnExecutablePath: string;
  zoomFactor: number;
  saveTaskLogs: boolean;
  taskLogPath: string;
  keyboardShortcuts: KeyboardShortcutSettings;
}

export interface TaskStep {
  id: string;
  type: TaskStepType;
  enabled: boolean;
  branch?: string; // for GitCheckout
  command?: string; // for RunCommand
  // Delphi
  delphiProjectFile?: string;
  delphiBuildMode?: 'Build' | 'Rebuild' | 'Clean';
  delphiConfiguration?: string;
  delphiPlatform?: string;
  delphiInstallerScript?: string;
  delphiInstallerDefines?: string;
  delphiTestExecutable?: string;
  delphiTestOutputFile?: string;
  delphiVersion?: string;
  // Lazarus
  lazarusProjectFile?: string;
  lazarusPackageFile?: string;
  lazarusBuildMode?: string;
  lazarusCpu?: string;
  lazarusOs?: string;
  lazarusWidgetset?: string;
  fpcTestOutputFile?: string;
  // Docker
  dockerfilePath?: string;
  dockerImageName?: string;
  dockerBuildArgs?: string;
  dockerComposePath?: string;
}

export interface TaskVariable {
  id: string;
  key: string;
  value: string;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
}

export interface Task {
  id: string;
  name: string;
  steps: TaskStep[];
  variables: TaskVariable[];
  environmentVariables: EnvironmentVariable[];
  showOnDashboard: boolean;
}

export interface WebLinkConfig {
  id: string;
  name: string;
  url: string;
}

export type LaunchConfigType = 'command' | 'select-executable';
export interface LaunchConfig {
  id: string;
  name: string;
  type: LaunchConfigType;
  command?: string; // only for 'command' type
  showOnDashboard: boolean;
}

export interface ReleaseInfo {
  id: number;
  tagName: string;
  name: string;
  body: string | null;
  isDraft: boolean;
  isPrerelease: boolean;
  url: string;
  createdAt: string;
}

export interface RepositoryBase {
  id: string;
  name: string;
  remoteUrl: string;
  localPath: string;
  status: RepoStatus;
  lastUpdated: string | null;
  buildHealth: BuildHealth;
  tasks: Task[];
  webLinks: WebLinkConfig[];
  launchConfigs: LaunchConfig[];
  latestRelease?: ReleaseInfo | null;
}

export interface GitRepository extends RepositoryBase {
  vcs: VcsType.Git;
  branch: string;
  ignoreDirty?: boolean;
}

export interface SvnRepository extends RepositoryBase {
  vcs: VcsType.Svn;
}

export type Repository = GitRepository | SvnRepository;

export type Launchable =
  | { type: 'manual'; config: LaunchConfig }
  | { type: 'detected'; path: string };

export interface VcsFileStatus {
  added: number;
  modified: number;
  deleted: number;
  conflicted: number;
  untracked: number;
  renamed: number;
}
export interface GitBranchStatus {
  ahead: number;
  behind: number;
  tracking: string;
}
export interface DetailedStatus {
  files: VcsFileStatus;
  isDirty: boolean;
  branchInfo?: GitBranchStatus; // Git only
  updatesAvailable?: boolean; // SVN only
}

export interface BranchInfo {
  local: string[];
  remote: string[];
  current: string | null;
}

export type UpdateStatus = 'checking' | 'available' | 'downloaded' | 'error';

export interface UpdateStatusMessage {
  status: UpdateStatus;
  message: string;
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

// --- Dashboard Categories ---
export interface Category {
  id: string;
  name: string;
  repositoryIds: string[];
  collapsed?: boolean;
  color?: string; // Light mode text
  backgroundColor?: string; // Light mode bg
  darkColor?: string; // Dark mode text
  darkBackgroundColor?: string; // Dark mode bg
}

export interface AppDataContextState {
  globalSettings: GlobalSettings;
  repositories: Repository[];
  categories: Category[];
  uncategorizedOrder: string[]; // <-- New field to fix DnD
}

// FIX: Add DropTarget type for robust DnD operations.
export interface DropTarget {
  repoId: string | null; // The repo ID being dropped ON, or null if dropped on category area
  categoryId: string | 'uncategorized';
  position: 'before' | 'after' | 'end';
}


// --- Project Intelligence Types ---

export interface DockerCapabilities {
  dockerfiles: string[];
  composeFiles: string[];
}

export interface PythonCapabilities {
  requestedPythonVersion: string | null;
  envManager: 'poetry' | 'pdm' | 'pipenv' | 'conda' | 'pip' | 'unknown';
  buildBackend: 'setuptools' | 'hatch' | 'poetry' | 'flit' | 'pdm' | 'mesonpy' | 'unknown';
  testFramework: 'pytest' | 'tox' | 'nox' | 'unknown';
  linters: ('ruff' | 'pylint')[];
  formatters: ('black' | 'isort')[];
  typeCheckers: ('mypy')[];
  hasPrecommit: boolean;
}

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
  packaging: { innoSetup: string[], nsis: string[] };
  hasDUnitX: boolean;
  packageManagers: { boss: boolean };
}

export interface LazarusProject {
  path: string;
  modes: string[];
  cpus: string[];
  oses: string[];
  widgetsets: string[];
}
export interface LazarusCapabilities {
  projects: LazarusProject[];
  packages: string[];
  make: { hasMakefileFpc: boolean, hasFpmake: boolean };
  tests: { hasFpcUnit: boolean };
}

export interface NodejsCapabilities {
  engine: string | null;
  declaredManager: string | null;
  packageManagers: { pnpm: boolean, yarn: boolean, npm: boolean, bun: boolean };
  typescript: boolean;
  testFrameworks: ('jest' | 'vitest' | 'playwright' | 'cypress')[];
  linters: ('eslint' | 'prettier')[];
  bundlers: ('vite' | 'webpack' | 'rollup' | 'tsup' | 'swc')[];
  monorepo: { workspaces: boolean, turbo: boolean, nx: boolean, yarnBerryPnp: boolean };
}

export interface ProjectInfo {
  tags: string[];
  files: { dproj: string[] };
  python?: PythonCapabilities;
  delphi?: DelphiCapabilities;
  nodejs?: NodejsCapabilities;
  lazarus?: LazarusCapabilities;
  docker?: DockerCapabilities;
}
