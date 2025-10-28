import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Repository, Task, TaskStep, ProjectSuggestion, GitRepository, SvnRepository, LaunchConfig, WebLinkConfig, Commit, BranchInfo, PythonCapabilities, ProjectInfo, DelphiCapabilities, NodejsCapabilities, LazarusCapabilities, ReleaseInfo, DockerCapabilities, GoCapabilities, RustCapabilities, MavenCapabilities, DotnetCapabilities } from '../../types';
import { RepoStatus, BuildHealth, TaskStepType, VcsType } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowUpIcon } from '../icons/ArrowUpIcon';
import { ArrowDownIcon } from '../icons/ArrowDownIcon';
import { ArrowDownTrayIcon } from '../icons/ArrowDownTrayIcon';
import { CloudArrowDownIcon } from '../icons/CloudArrowDownIcon';
import { ArrowRightOnRectangleIcon } from '../icons/ArrowRightOnRectangleIcon';
import { ArchiveBoxIcon } from '../icons/ArchiveBoxIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { CubeTransparentIcon } from '../icons/CubeTransparentIcon';
import { CodeBracketIcon } from '../icons/CodeBracketIcon';
import { VariableIcon } from '../icons/VariableIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { GitBranchIcon } from '../icons/GitBranchIcon';
import { ExclamationCircleIcon } from '../icons/ExclamationCircleIcon';
// FIX: Import the missing ExclamationTriangleIcon component.
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { useTooltip } from '../../hooks/useTooltip';
import { useLogger } from '../../hooks/useLogger';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { PythonIcon } from '../icons/PythonIcon';
import { NodeIcon } from '../icons/NodeIcon';
import { DockerIcon } from '../icons/DockerIcon';
import { FolderOpenIcon } from '../icons/FolderOpenIcon';
import { DocumentDuplicateIcon } from '../icons/DocumentDuplicateIcon';
import { ServerIcon } from '../icons/ServerIcon';
import { TagIcon } from '../icons/TagIcon';
import { CubeIcon } from '../icons/CubeIcon';
import { ChevronsUpIcon } from '../icons/ChevronsUpIcon';
import { ChevronsDownIcon } from '../icons/ChevronsDownIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PencilIcon } from '../icons/PencilIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';

interface RepoEditViewProps {
  onSave: (repository: Repository, categoryId?: string) => void;
  onCancel: () => void;
  repository: Repository | null;
  onRefreshState: (repoId: string) => Promise<void>;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
  confirmAction: (options: {
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    confirmButtonClass?: string;
    icon?: React.ReactNode;
  }) => void;
  defaultCategoryId?: string;
  onOpenWeblink: (url: string) => void;
  detectedExecutables: Record<string, string[]>;
}

const NEW_REPO_TEMPLATE: Omit<GitRepository, 'id'> = {
  name: '',
  remoteUrl: '',
  localPath: '',
  webLinks: [],
  branch: 'main',
  status: RepoStatus.Idle,
  lastUpdated: null,
  buildHealth: BuildHealth.Unknown,
  tasks: [],
  vcs: VcsType.Git,
  launchConfigs: [],
  ignoreDirty: false,
};

const STEP_DEFINITIONS: Record<TaskStepType, { label: string; icon: React.ComponentType<{className: string}>; description: string }> = {
  [TaskStepType.GitPull]: { label: 'Git Pull', icon: ArrowDownTrayIcon, description: 'Pull latest changes from remote.' },
  [TaskStepType.GitFetch]: { label: 'Git Fetch', icon: CloudArrowDownIcon, description: 'Fetch updates from remote.' },
  [TaskStepType.GitCheckout]: { label: 'Git Checkout', icon: ArrowRightOnRectangleIcon, description: 'Switch to a specific branch.' },
  [TaskStepType.GitStash]: { label: 'Git Stash', icon: ArchiveBoxIcon, description: 'Stash uncommitted local changes.' },
  [TaskStepType.SvnUpdate]: { label: 'SVN Update', icon: ArrowDownTrayIcon, description: 'Update working copy to latest revision.' },
  [TaskStepType.SvnSwitch]: { label: 'SVN Switch', icon: ArrowRightOnRectangleIcon, description: 'Switch working copy to a different branch or URL.' },
  [TaskStepType.RunCommand]: { label: 'Run Command', icon: CodeBracketIcon, description: 'Execute a custom shell command.' },
  // Delphi
  [TaskStepType.DelphiBuild]: { label: 'Delphi Build', icon: BeakerIcon, description: 'Build, rebuild, or clean a Delphi project.' },
  [TaskStepType.DELPHI_BOSS_INSTALL]: { label: 'Delphi: Boss Install', icon: ArchiveBoxIcon, description: 'Install dependencies using the Boss package manager.' },
  [TaskStepType.DELPHI_PACKAGE_INNO]: { label: 'Delphi: Package (Inno)', icon: ArchiveBoxIcon, description: 'Create an installer using an Inno Setup script.' },
  [TaskStepType.DELPHI_PACKAGE_NSIS]: { label: 'Delphi: Package (NSIS)', icon: ArchiveBoxIcon, description: 'Create an installer using an NSIS script.' },
  [TaskStepType.DELPHI_TEST_DUNITX]: { label: 'Delphi: Run DUnitX Tests', icon: BeakerIcon, description: 'Execute a DUnitX test application.' },
  // Go
  [TaskStepType.GO_MOD_TIDY]: { label: 'Go: Mod Tidy', icon: CodeBracketIcon, description: 'Run go mod tidy to sync module requirements.' },
  [TaskStepType.GO_FMT]: { label: 'Go: Format', icon: CodeBracketIcon, description: 'Format Go sources with go fmt ./...' },
  [TaskStepType.GO_TEST]: { label: 'Go: Test', icon: BeakerIcon, description: 'Execute go test ./... across the project.' },
  [TaskStepType.GO_BUILD]: { label: 'Go: Build', icon: CodeBracketIcon, description: 'Compile all packages with go build ./...' },
  // Rust
  [TaskStepType.RUST_CARGO_FMT]: { label: 'Rust: Cargo Fmt', icon: CodeBracketIcon, description: 'Format the workspace with cargo fmt --all.' },
  [TaskStepType.RUST_CARGO_CLIPPY]: { label: 'Rust: Cargo Clippy', icon: BeakerIcon, description: 'Run cargo clippy with --all-targets and fail on warnings.' },
  [TaskStepType.RUST_CARGO_CHECK]: { label: 'Rust: Cargo Check', icon: CodeBracketIcon, description: 'Type-check the project with cargo check --all-targets.' },
  [TaskStepType.RUST_CARGO_TEST]: { label: 'Rust: Cargo Test', icon: BeakerIcon, description: 'Run cargo test --all-targets --all-features.' },
  [TaskStepType.RUST_CARGO_BUILD]: { label: 'Rust: Cargo Build', icon: CodeBracketIcon, description: 'Build the project with cargo build --release.' },
  // Java / Maven
  [TaskStepType.MAVEN_CLEAN]: { label: 'Maven: Clean', icon: DocumentTextIcon, description: 'Run mvn clean (or ./mvnw clean if available).' },
  [TaskStepType.MAVEN_TEST]: { label: 'Maven: Test', icon: DocumentTextIcon, description: 'Run mvn test to execute the project test suite.' },
  [TaskStepType.MAVEN_PACKAGE]: { label: 'Maven: Package', icon: DocumentTextIcon, description: 'Run mvn package to build distributables.' },
  // .NET
  [TaskStepType.DOTNET_RESTORE]: { label: '.NET: Restore', icon: CubeIcon, description: 'Restore NuGet dependencies with dotnet restore.' },
  [TaskStepType.DOTNET_BUILD]: { label: '.NET: Build', icon: CubeIcon, description: 'Build the solution with dotnet build --configuration Release.' },
  [TaskStepType.DOTNET_TEST]: { label: '.NET: Test', icon: CubeIcon, description: 'Run dotnet test with diagnostics-friendly output.' },
  // Python
  [TaskStepType.PYTHON_CREATE_VENV]: { label: 'Python: Create Venv', icon: PythonIcon, description: 'Create a .venv virtual environment.' },
  [TaskStepType.PYTHON_INSTALL_DEPS]: { label: 'Python: Install Deps', icon: PythonIcon, description: 'Install dependencies using the detected manager.' },
  [TaskStepType.PYTHON_RUN_LINT]: { label: 'Python: Run Linting', icon: PythonIcon, description: 'Run all detected linters (e.g., Ruff).' },
  [TaskStepType.PYTHON_RUN_FORMAT]: { label: 'Python: Run Formatting', icon: PythonIcon, description: 'Run all detected formatters (e.g., Black, isort).' },
  [TaskStepType.PYTHON_RUN_TYPECHECK]: { label: 'Python: Run Type Check', icon: PythonIcon, description: 'Run all detected type checkers (e.g., Mypy).' },
  [TaskStepType.PYTHON_RUN_TESTS]: { label: 'Python: Run Tests', icon: PythonIcon, description: 'Run tests using the detected framework (e.g., Pytest).' },
  [TaskStepType.PYTHON_RUN_BUILD]: { label: 'Python: Build Package', icon: PythonIcon, description: 'Build wheel and sdist using the detected backend.' },
  // Node.js
  [TaskStepType.NODE_INSTALL_DEPS]: { label: 'Node: Install Deps', icon: NodeIcon, description: 'Install dependencies using the detected package manager.' },
  [TaskStepType.NODE_RUN_LINT]: { label: 'Node: Run Linting', icon: NodeIcon, description: 'Run ESLint and Prettier to find issues.' },
  [TaskStepType.NODE_RUN_FORMAT]: { label: 'Node: Format Code', icon: NodeIcon, description: 'Format code using Prettier and ESLint.' },
  [TaskStepType.NODE_RUN_TYPECHECK]: { label: 'Node: Type Check', icon: NodeIcon, description: 'Run the TypeScript compiler to check for type errors.' },
  [TaskStepType.NODE_RUN_TESTS]: { label: 'Node: Run Tests', icon: NodeIcon, description: 'Run unit/integration tests with Jest or Vitest.' },
  [TaskStepType.NODE_RUN_BUILD]: { label: 'Node: Build Project', icon: NodeIcon, description: 'Run the build script or detected bundler.' },
  // Lazarus/FPC
  [TaskStepType.LAZARUS_BUILD]: { label: 'Lazarus: Build Project', icon: BeakerIcon, description: 'Build a Lazarus project (.lpi) using lazbuild.' },
  [TaskStepType.LAZARUS_BUILD_PACKAGE]: { label: 'Lazarus: Build Package', icon: BeakerIcon, description: 'Build a Lazarus package (.lpk) using lazbuild.' },
  [TaskStepType.FPC_TEST_FPCUNIT]: { label: 'Lazarus: Run FPCUnit Tests', icon: BeakerIcon, description: 'Build and run an FPCUnit test project.' },
  // Docker
  [TaskStepType.DOCKER_BUILD_IMAGE]: { label: 'Docker: Build Image', icon: DockerIcon, description: 'Build a Docker image from a Dockerfile.' },
  [TaskStepType.DOCKER_COMPOSE_UP]: { label: 'Docker: Compose Up', icon: DockerIcon, description: 'Create and start containers with Docker Compose.' },
  [TaskStepType.DOCKER_COMPOSE_DOWN]: { label: 'Docker: Compose Down', icon: DockerIcon, description: 'Stop and remove containers with Docker Compose.' },
  [TaskStepType.DOCKER_COMPOSE_BUILD]: { label: 'Docker: Compose Build', icon: DockerIcon, description: 'Build or rebuild services with Docker Compose.' },
};

const STEP_CATEGORIES = [
    { name: 'General', types: [TaskStepType.RunCommand] },
    { name: 'Git', types: [TaskStepType.GitPull, TaskStepType.GitFetch, TaskStepType.GitCheckout, TaskStepType.GitStash] },
    { name: 'SVN', types: [TaskStepType.SvnUpdate, TaskStepType.SvnSwitch] },
    { name: 'Node.js', types: [TaskStepType.NODE_INSTALL_DEPS, TaskStepType.NODE_RUN_BUILD, TaskStepType.NODE_RUN_TESTS, TaskStepType.NODE_RUN_LINT, TaskStepType.NODE_RUN_FORMAT, TaskStepType.NODE_RUN_TYPECHECK] },
    { name: 'Go', types: [TaskStepType.GO_MOD_TIDY, TaskStepType.GO_FMT, TaskStepType.GO_TEST, TaskStepType.GO_BUILD] },
    { name: 'Rust', types: [TaskStepType.RUST_CARGO_FMT, TaskStepType.RUST_CARGO_CLIPPY, TaskStepType.RUST_CARGO_CHECK, TaskStepType.RUST_CARGO_TEST, TaskStepType.RUST_CARGO_BUILD] },
    { name: 'Java / Maven', types: [TaskStepType.MAVEN_CLEAN, TaskStepType.MAVEN_TEST, TaskStepType.MAVEN_PACKAGE] },
    { name: '.NET', types: [TaskStepType.DOTNET_RESTORE, TaskStepType.DOTNET_BUILD, TaskStepType.DOTNET_TEST] },
    { name: 'Python', types: [TaskStepType.PYTHON_CREATE_VENV, TaskStepType.PYTHON_INSTALL_DEPS, TaskStepType.PYTHON_RUN_BUILD, TaskStepType.PYTHON_RUN_TESTS, TaskStepType.PYTHON_RUN_LINT, TaskStepType.PYTHON_RUN_FORMAT, TaskStepType.PYTHON_RUN_TYPECHECK] },
    { name: 'Delphi', types: [TaskStepType.DelphiBuild, TaskStepType.DELPHI_BOSS_INSTALL, TaskStepType.DELPHI_PACKAGE_INNO, TaskStepType.DELPHI_PACKAGE_NSIS, TaskStepType.DELPHI_TEST_DUNITX] },
    { name: 'Lazarus/FPC', types: [TaskStepType.LAZARUS_BUILD, TaskStepType.LAZARUS_BUILD_PACKAGE, TaskStepType.FPC_TEST_FPCUNIT] },
    { name: 'Docker', types: [TaskStepType.DOCKER_BUILD_IMAGE, TaskStepType.DOCKER_COMPOSE_UP, TaskStepType.DOCKER_COMPOSE_DOWN, TaskStepType.DOCKER_COMPOSE_BUILD] },
];

const PROTECTED_BRANCH_IDENTIFIERS = new Set(['main', 'origin', 'origin/main']);

const parseRemoteBranchIdentifier = (fullBranchName: string): { remoteName: string; branchName: string } | null => {
  const [remoteName, ...rest] = fullBranchName.split('/');
  if (!remoteName || rest.length === 0) {
      return null;
  }
  return { remoteName, branchName: rest.join('/') };
};

const formatBranchSelectionLabel = (selection: { name: string; scope: 'local' | 'remote' } | string, scopeOverride?: 'local' | 'remote'): string => {
  if (typeof selection === 'string') {
      const scope = scopeOverride ?? 'local';
      if (scope === 'remote') {
          const remoteDetails = parseRemoteBranchIdentifier(selection);
          if (remoteDetails) {
              return `${remoteDetails.remoteName}/${remoteDetails.branchName}`;
          }
      }
      return selection;
  }

  if (selection.scope === 'remote') {
      const remoteDetails = parseRemoteBranchIdentifier(selection.name);
      if (remoteDetails) {
          return `${remoteDetails.remoteName}/${remoteDetails.branchName}`;
      }
  }
  return selection.name;
};

const isProtectedBranch = (branchIdentifier: string, scope: 'local' | 'remote'): boolean => {
  const normalized = branchIdentifier.trim().toLowerCase();
  if (PROTECTED_BRANCH_IDENTIFIERS.has(normalized)) {
      return true;
  }

  if (scope === 'remote') {
      const remoteDetails = parseRemoteBranchIdentifier(branchIdentifier);
      if (remoteDetails) {
          const remoteNormalized = remoteDetails.remoteName.trim().toLowerCase();
          const branchNormalized = remoteDetails.branchName.trim().toLowerCase();
          const composite = `${remoteNormalized}/${branchNormalized}`;
          if (PROTECTED_BRANCH_IDENTIFIERS.has(composite)) {
              return true;
          }
          if (remoteNormalized === 'origin' && PROTECTED_BRANCH_IDENTIFIERS.has(branchNormalized)) {
              return true;
          }
      }
  }

  return false;
};

// Component for a single step in the TaskStepsEditor
const TaskStepItem: React.FC<{
  step: TaskStep;
  index: number;
  totalSteps: number;
  onStepChange: (id: string, updates: Partial<TaskStep>) => void;
  onMoveStep: (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  onRemoveStep: (id: string) => void;
  onDuplicateStep: (index: number) => void;
  suggestions: ProjectSuggestion[];
  projectInfo: ProjectInfo | null;
  delphiVersions: { name: string; version: string }[];
}> = ({ step, index, totalSteps, onStepChange, onMoveStep, onRemoveStep, onDuplicateStep, suggestions, projectInfo, delphiVersions }) => {
  const logger = useLogger();
  const stepDef = STEP_DEFINITIONS[step.type];
  const isEnabled = step.enabled ?? true;

  // --- HOOKS MOVED TO TOP ---
  const toggleTooltip = useTooltip(isEnabled ? 'Disable Step' : 'Enable Step');
  const duplicateTooltip = useTooltip('Duplicate Step');
  const moveToTopTooltip = useTooltip('Move Step to Top');
  const moveToBottomTooltip = useTooltip('Move Step to Bottom');
  
  const selectedDelphiProject = useMemo(() => {
    return projectInfo?.delphi?.projects.find(p => p.path === step.delphiProjectFile);
  }, [projectInfo?.delphi?.projects, step.delphiProjectFile]);

  const allDelphiPlatforms = useMemo(() => {
      const platformSet = new Set<string>();
      (projectInfo?.delphi?.projects || []).forEach(p => {
          p.platforms.forEach(platform => platformSet.add(platform));
      });
      return Array.from(platformSet).sort();
  }, [projectInfo?.delphi?.projects]);

  const allDelphiConfigs = useMemo(() => {
      const configSet = new Set<string>();
      (projectInfo?.delphi?.projects || []).forEach(p => {
          p.configs.forEach(config => configSet.add(config));
      });
      return Array.from(configSet).sort();
  }, [projectInfo?.delphi?.projects]);
  
  // Log invalid steps inside a useEffect to prevent render loops.
  useEffect(() => {
    if (!stepDef) {
        logger.error('Invalid step type encountered in TaskStepItem. This may be due to malformed data.', { step });
    }
  }, [step, stepDef, logger]);
  
  useEffect(() => {
      if (selectedDelphiProject) {
          if (step.delphiConfiguration && !selectedDelphiProject.configs.includes(step.delphiConfiguration)) {
              onStepChange(step.id, { delphiConfiguration: '' });
          }
          if (step.delphiPlatform && !selectedDelphiProject.platforms.includes(step.delphiPlatform)) {
              onStepChange(step.id, { delphiPlatform: '' });
          }
      }
  }, [selectedDelphiProject, step.delphiConfiguration, step.delphiPlatform, onStepChange, step.id]);
  // --- END HOOKS MOVED TO TOP ---
  
  if (!stepDef) {
      return (
        <div className="bg-red-50 dark:bg-red-900/40 p-3 rounded-lg border border-red-200 dark:border-red-700 space-y-2 text-red-700 dark:text-red-300">
            <div className="flex items-center gap-3">
                <ExclamationCircleIcon className="h-6 w-6"/>
                <div>
                    <p className="font-semibold">Invalid Step Type</p>
                    <p className="text-xs">The step type '{step.type}' is not recognized. This step may be from an older version or corrupted. Please remove it.</p>
                </div>
                <button type="button" onClick={() => onRemoveStep(step.id)} className="ml-auto p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4" /></button>
            </div>
        </div>
      );
  }
  
  const { label, icon: Icon } = stepDef;
  const formInputStyle = "mt-1 block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";
  const CUSTOM_COMMAND_VALUE = 'custom_command';
  
  const availablePlatforms = selectedDelphiProject ? selectedDelphiProject.platforms : allDelphiPlatforms;
  const availableConfigs = selectedDelphiProject ? selectedDelphiProject.configs : allDelphiConfigs;
  
  const DelphiVersionSelector: React.FC = () => (
    <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Compiler Version</label>
        <select
            value={step.delphiVersion || ''}
            onChange={(e) => onStepChange(step.id, { delphiVersion: e.target.value })}
            className={formInputStyle}
        >
            <option value="">Default (from PATH)</option>
            {delphiVersions.map(v => (
                <option key={v.version} value={v.version}>{v.name}</option>
            ))}
        </select>
    </div>
  );

  return (
    <div className={`bg-white dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2 transition-opacity ${!isEnabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-blue-500" />
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{label}</p>
            <p className="text-xs text-gray-500">Step {index + 1}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <label {...toggleTooltip} className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isEnabled} onChange={(e) => onStepChange(step.id, {enabled: e.target.checked})} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
          <button
            {...moveToTopTooltip}
            type="button"
            onClick={() => onMoveStep(index, 'top')}
            disabled={index === 0}
            aria-label="Move step to top"
            className="p-1.5 disabled:opacity-30 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
          >
            <ChevronsUpIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMoveStep(index, 'up')} disabled={index === 0} className="p-1.5 disabled:opacity-30 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><ArrowUpIcon className="h-4 w-4" /></button>
          <button type="button" onClick={() => onMoveStep(index, 'down')} disabled={index === totalSteps - 1} className="p-1.5 disabled:opacity-30 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><ArrowDownIcon className="h-4 w-4" /></button>
          <button
            {...moveToBottomTooltip}
            type="button"
            onClick={() => onMoveStep(index, 'bottom')}
            disabled={index === totalSteps - 1}
            aria-label="Move step to bottom"
            className="p-1.5 disabled:opacity-30 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
          >
            <ChevronsDownIcon className="h-4 w-4" />
          </button>
          <button {...duplicateTooltip} type="button" onClick={() => onDuplicateStep(index)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><DocumentDuplicateIcon className="h-4 w-4" /></button>
          <button type="button" onClick={() => onRemoveStep(step.id)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4" /></button>
        </div>
      </div>
      {(step.type === TaskStepType.GitCheckout || step.type === TaskStepType.SvnSwitch) && (
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {step.type === TaskStepType.GitCheckout ? 'Branch Name' : 'Switch Target'}
          </label>
          <input
            type="text"
            placeholder={step.type === TaskStepType.GitCheckout ? 'e.g., main' : 'e.g., ^/branches/release/1.2'}
            value={step.branch || ''}
            onChange={(e) => onStepChange(step.id, { branch: e.target.value })}
            required
            className={formInputStyle}
          />
        </div>
      )}
      {step.type === TaskStepType.DelphiBuild && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Project/Group File</label>
                <select
                    value={step.delphiProjectFile || ''}
                    onChange={(e) => onStepChange(step.id, { delphiProjectFile: e.target.value })}
                    className={formInputStyle}
                >
                    <option value="">Auto-detect</option>
                    <optgroup label="Projects">
                        {(projectInfo?.delphi?.projects || []).map(p => (
                            <option key={p.path} value={p.path}>{p.path}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Project Groups">
                        {/* FIX: Use Array.isArray as a type guard because the type from the Electron API might be unknown at compile time. */}
                        {Array.isArray(projectInfo?.delphi?.groups) && projectInfo?.delphi.groups.map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </optgroup>
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Mode</label>
                <select
                    value={step.delphiBuildMode || 'Build'}
                    onChange={(e) => onStepChange(step.id, { delphiBuildMode: e.target.value as any })}
                    className={formInputStyle}
                >
                    <option>Build</option>
                    <option>Rebuild</option>
                    <option>Clean</option>
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Configuration</label>
                <select
                    value={step.delphiConfiguration || ''}
                    onChange={(e) => onStepChange(step.id, { delphiConfiguration: e.target.value })}
                    className={formInputStyle}
                    disabled={availableConfigs.length === 0}
                >
                    <option value="">Default</option>
                    {availableConfigs.map(config => (
                        <option key={config} value={config}>{config}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Platform</label>
                <select
                    value={step.delphiPlatform || ''}
                    onChange={(e) => onStepChange(step.id, { delphiPlatform: e.target.value })}
                    className={formInputStyle}
                    disabled={availablePlatforms.length === 0}
                >
                    <option value="">Default</option>
                    {availablePlatforms.map(platform => (
                        <option key={platform} value={platform}>{platform}</option>
                    ))}
                </select>
            </div>
            <DelphiVersionSelector />
        </div>
      )}
      {step.type === TaskStepType.LAZARUS_BUILD && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Project File (.lpi)</label>
                <select
                    value={step.lazarusProjectFile || ''}
                    onChange={(e) => onStepChange(step.id, { lazarusProjectFile: e.target.value })}
                    className={formInputStyle}
                >
                    <option value="">Auto-detect</option>
                    {(projectInfo?.lazarus?.projects || []).map(p => (
                        <option key={p.path} value={p.path}>{p.path}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Build Mode</label>
                <input type="text" placeholder="e.g., Release" value={step.lazarusBuildMode || ''} onChange={(e) => onStepChange(step.id, { lazarusBuildMode: e.target.value })} className={formInputStyle} />
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Target CPU</label>
                <input type="text" placeholder="e.g., x86_64" value={step.lazarusCpu || ''} onChange={(e) => onStepChange(step.id, { lazarusCpu: e.target.value })} className={formInputStyle} />
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Target OS</label>
                <input type="text" placeholder="e.g., win64" value={step.lazarusOs || ''} onChange={(e) => onStepChange(step.id, { lazarusOs: e.target.value })} className={formInputStyle} />
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Widgetset</label>
                <input type="text" placeholder="e.g., qt5" value={step.lazarusWidgetset || ''} onChange={(e) => onStepChange(step.id, { lazarusWidgetset: e.target.value })} className={formInputStyle} />
            </div>
        </div>
      )}
      {step.type === TaskStepType.LAZARUS_BUILD_PACKAGE && (
        <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Package File (.lpk)</label>
            <select
                value={step.lazarusPackageFile || ''}
                onChange={(e) => onStepChange(step.id, { lazarusPackageFile: e.target.value })}
                className={formInputStyle}
            >
                <option value="">Auto-detect</option>
                {(projectInfo?.lazarus?.packages || []).map(p => (
                    <option key={p} value={p}>{p}</option>
                ))}
            </select>
        </div>
      )}
      {step.type === TaskStepType.FPC_TEST_FPCUNIT && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Test Project File (.lpi)</label>
                <input type="text" placeholder="e.g., tests/MyTests.lpi" value={step.lazarusProjectFile || ''} onChange={(e) => onStepChange(step.id, { lazarusProjectFile: e.target.value })} className={formInputStyle} />
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">JUnit XML Output File (optional)</label>
                <input type="text" placeholder="e.g., reports/junit.xml" value={step.fpcTestOutputFile || ''} onChange={(e) => onStepChange(step.id, { fpcTestOutputFile: e.target.value })} className={formInputStyle} />
            </div>
        </div>
      )}
      {(step.type === TaskStepType.DELPHI_PACKAGE_INNO || step.type === TaskStepType.DELPHI_PACKAGE_NSIS) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Installer Script File</label>
                <input type="text" placeholder="e.g., scripts/installer.iss" value={step.delphiInstallerScript || ''} onChange={(e) => onStepChange(step.id, { delphiInstallerScript: e.target.value })} className={formInputStyle} />
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Defines (semicolon-separated)</label>
                <input type="text" placeholder="e.g., AppVersion=1.0;Mode=PRO" value={step.delphiInstallerDefines || ''} onChange={(e) => onStepChange(step.id, { delphiInstallerDefines: e.target.value })} className={formInputStyle} />
            </div>
            <DelphiVersionSelector />
        </div>
      )}
      {step.type === TaskStepType.DELPHI_TEST_DUNITX && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Test Executable Path</label>
                <input type="text" placeholder="e.g., bin/Win32/Release/Tests.exe" value={step.delphiTestExecutable || ''} onChange={(e) => onStepChange(step.id, { delphiTestExecutable: e.target.value })} className={formInputStyle} />
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">JUnit XML Output File (optional)</label>
                <input type="text" placeholder="e.g., reports/junit.xml" value={step.delphiTestOutputFile || ''} onChange={(e) => onStepChange(step.id, { delphiTestOutputFile: e.target.value })} className={formInputStyle} />
            </div>
            <DelphiVersionSelector />
        </div>
      )}
      {step.type === TaskStepType.RunCommand && (() => {
        const allPredefined = [...suggestions.map(s => s.value)];
        const isCustom = !allPredefined.includes(step.command || '');
        const selectValue = isCustom ? CUSTOM_COMMAND_VALUE : step.command;
        const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
            (acc[suggestion.group] = acc[suggestion.group] || []).push(suggestion);
            return acc;
        }, {} as Record<string, ProjectSuggestion[]>);
        
        const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
          const newValue = e.target.value;
          // When a predefined command is selected, update the step.
          // When "Custom Command..." is selected, do nothing, preserving the current text for editing.
          if (newValue !== CUSTOM_COMMAND_VALUE) {
            onStepChange(step.id, { command: newValue });
          }
        };

        return (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Command</label>
            <select value={selectValue} onChange={handleSelectChange} className={formInputStyle}>
              {Object.entries(groupedSuggestions).map(([groupName, suggestions]) => (
                  <optgroup key={groupName} label={groupName}>
                      {suggestions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </optgroup>
              ))}
              <option value={CUSTOM_COMMAND_VALUE}>Custom Command...</option>
            </select>
            
            <textarea
                placeholder={`e.g., npm run build -- --env=production\nUse \${VAR_NAME} for variables.`}
                value={step.command || ''}
                onChange={(e) => onStepChange(step.id, { command: e.target.value })}
                required
                className={`${formInputStyle} font-mono min-h-[5rem] text-sm`}
                rows={3}
            />
          </div>
        );
      })()}
    </div>
  );
};

// Component for managing task-level variables
const TaskVariablesEditor: React.FC<{
  variables: Task['variables'];
  onVariablesChange: (variables: Task['variables']) => void;
}> = ({ variables = [], onVariablesChange }) => {
  const handleAddVariable = () => {
    const newVar = { id: `var_${Date.now()}`, key: '', value: '' };
    onVariablesChange([...variables, newVar]);
  };

  const handleUpdateVariable = (id: string, field: 'key' | 'value', fieldValue: string) => {
    const newVariables = variables.map(v => 
      v.id === id ? { ...v, [field]: fieldValue } : v
    );
    onVariablesChange(newVariables);
  };

  const handleRemoveVariable = (id: string) => {
    onVariablesChange(variables.filter(v => v.id !== id));
  };
  
  const formInputStyle = "block w-full bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1 px-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <VariableIcon className="h-5 w-5 text-gray-500"/>
          <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Task Variables (Substitution)</h3>
        </div>
        <div className="space-y-2">
            {variables.map((variable) => (
                <div key={variable.id} className="flex items-center space-x-2">
                    <input 
                      type="text"
                      placeholder="KEY"
                      value={variable.key}
                      onChange={(e) => handleUpdateVariable(variable.id, 'key', e.target.value)}
                      className={`${formInputStyle} font-mono uppercase`}
                    />
                     <span className="text-gray-400">=</span>
                    <input 
                      type="text"
                      placeholder="VALUE"
                      value={variable.value}
                      onChange={(e) => handleUpdateVariable(variable.id, 'value', e.target.value)}
                      className={formInputStyle}
                    />
                    <button type="button" onClick={() => handleRemoveVariable(variable.id)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4" /></button>
                </div>
            ))}
        </div>
         <button type="button" onClick={handleAddVariable} className="mt-3 flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
            <PlusIcon className="h-3 w-3 mr-1"/> Add Variable
        </button>
    </div>
  );
}

// Component for managing task-level environment variables
const TaskEnvironmentVariablesEditor: React.FC<{
  variables: Task['environmentVariables'];
  onVariablesChange: (variables: Task['environmentVariables']) => void;
}> = ({ variables = [], onVariablesChange }) => {
  const handleAddVariable = () => {
    const newVar = { id: `env_var_${Date.now()}`, key: '', value: '' };
    onVariablesChange([...variables, newVar]);
  };

  const handleUpdateVariable = (id: string, field: 'key' | 'value', fieldValue: string) => {
    const newVariables = variables.map(v => 
      v.id === id ? { ...v, [field]: fieldValue } : v
    );
    onVariablesChange(newVariables);
  };

  const handleRemoveVariable = (id: string) => {
    onVariablesChange(variables.filter(v => v.id !== id));
  };
  
  const formInputStyle = "block w-full bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1 px-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <ServerIcon className="h-5 w-5 text-gray-500"/>
          <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Environment Variables</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
            These variables are set in the shell environment before step commands are executed. They can be accessed by scripts (e.g., as `process.env.VAR_NAME` in Node.js or `$VAR_NAME` in bash).
        </p>
        <div className="space-y-2">
            {variables.map((variable) => (
                <div key={variable.id} className="flex items-center space-x-2">
                    <input 
                      type="text"
                      placeholder="KEY"
                      value={variable.key}
                      onChange={(e) => handleUpdateVariable(variable.id, 'key', e.target.value)}
                      className={`${formInputStyle} font-mono`}
                    />
                     <span className="text-gray-400">=</span>
                    <input 
                      type="text"
                      placeholder="VALUE (supports ${...} substitution)"
                      value={variable.value}
                      onChange={(e) => handleUpdateVariable(variable.id, 'value', e.target.value)}
                      className={formInputStyle}
                    />
                    <button type="button" onClick={() => handleRemoveVariable(variable.id)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4" /></button>
                </div>
            ))}
        </div>
         <button type="button" onClick={handleAddVariable} className="mt-3 flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
            <PlusIcon className="h-3 w-3 mr-1"/> Add Environment Variable
        </button>
    </div>
  );
}


const NodejsTaskGenerator: React.FC<{
    nodejsCaps: NodejsCapabilities | undefined;
    onAddTask: (task: Partial<Task>) => void;
}> = ({ nodejsCaps, onAddTask }) => {
    if (!nodejsCaps) return null;
    
    const createInstallTask = () => onAddTask({
        name: 'Install Dependencies',
        steps: [{ type: TaskStepType.NODE_INSTALL_DEPS, id: '', enabled: true }]
    });

    const createCiTask = () => {
        const steps: Omit<TaskStep, 'id'>[] = [
            { type: TaskStepType.NODE_INSTALL_DEPS, enabled: true },
        ];
        if (nodejsCaps.linters.includes('eslint') || nodejsCaps.linters.includes('prettier')) {
            steps.push({ type: TaskStepType.NODE_RUN_LINT, enabled: true });
        }
        if (nodejsCaps.typescript) {
            steps.push({ type: TaskStepType.NODE_RUN_TYPECHECK, enabled: true });
        }
        if (nodejsCaps.testFrameworks.length > 0) {
            steps.push({ type: TaskStepType.NODE_RUN_TESTS, enabled: true });
        }
        steps.push({ type: TaskStepType.NODE_RUN_BUILD, enabled: true });

        onAddTask({
            name: 'CI Checks & Build',
            steps: steps.map(s => ({...s, id: ''}))
        });
    };

    let detectedManager = 'npm';
    if (nodejsCaps.declaredManager) detectedManager = nodejsCaps.declaredManager.split('@')[0];
    else if (nodejsCaps.packageManagers.pnpm) detectedManager = 'pnpm';
    else if (nodejsCaps.packageManagers.yarn) detectedManager = 'yarn';
    else if (nodejsCaps.packageManagers.bun) detectedManager = 'bun';

    const detectedTools = [
        `Manager: ${detectedManager}`,
        ...(nodejsCaps.typescript ? ['TypeScript'] : []),
        ...nodejsCaps.testFrameworks,
        ...nodejsCaps.linters,
        ...nodejsCaps.bundlers,
        ...(nodejsCaps.monorepo.turbo ? ['Turbo'] : []),
        ...(nodejsCaps.monorepo.nx ? ['NX'] : []),
    ].map(t => t.charAt(0).toUpperCase() + t.slice(1));


    return (
        <div className="p-3 mb-4 bg-green-50 dark:bg-gray-900/50 rounded-lg border border-green-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
                <NodeIcon className="h-5 w-5 text-green-500"/>
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Node.js Project Detected</h3>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 flex flex-wrap gap-2">
                {detectedTools.map(tool => (
                    <span key={tool} className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">{tool}</span>
                ))}
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={createInstallTask} className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md">Add Install Task</button>
                <button type="button" onClick={createCiTask} className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md">Add CI/Checks Task</button>
            </div>
        </div>
    );
};

const GoTaskGenerator: React.FC<{
    goCaps: GoCapabilities | undefined;
    onAddTask: (task: Partial<Task>) => void;
}> = ({ goCaps, onAddTask }) => {
    if (!goCaps) return null;

    const getBasename = (p: string) => p.split(/[\\/]/).pop() || p;
    const moduleBadges = goCaps.modules.map(m => `Module: ${m.module ?? getBasename(m.path)}`);
    const versionBadges = Array.from(new Set(goCaps.modules.map(m => m.goVersion).filter((v): v is string => Boolean(v)))).map(v => `Go ${v}`);
    const toolchainBadges = Array.from(new Set(goCaps.modules.map(m => m.toolchain).filter((v): v is string => Boolean(v)))).map(v => `Toolchain ${v}`);
    const badges = [
        ...moduleBadges,
        ...versionBadges,
        ...toolchainBadges,
        ...(goCaps.hasGoWork ? ['go.work workspace'] : []),
        ...(goCaps.hasGoSum ? ['go.sum present'] : []),
        ...(goCaps.hasTests ? ['Tests detected'] : []),
    ];

    const createTidyTask = () => onAddTask({
        name: 'Go Mod Tidy',
        steps: [{ type: TaskStepType.GO_MOD_TIDY, id: '', enabled: true }],
    });

    const createCiTask = () => {
        const steps: Omit<TaskStep, 'id'>[] = [
            { type: TaskStepType.GO_MOD_TIDY, enabled: true },
            { type: TaskStepType.GO_FMT, enabled: true },
            { type: TaskStepType.GO_TEST, enabled: true },
            { type: TaskStepType.GO_BUILD, enabled: true },
        ];
        onAddTask({
            name: 'Go CI Checks',
            steps: steps.map(step => ({ ...step, id: '' })),
        });
    };

    return (
        <div className="p-3 mb-4 bg-cyan-50 dark:bg-gray-900/50 rounded-lg border border-cyan-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
                <CodeBracketIcon className="h-5 w-5 text-cyan-500" />
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Go Project Detected</h3>
            </div>
            {badges.length > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 flex flex-wrap gap-2">
                    {badges.map(badge => (
                        <span key={badge} className="bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 px-2 py-0.5 rounded-full">{badge}</span>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={createTidyTask} className="text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 px-3 py-1.5 rounded-md">Add Mod Tidy Task</button>
                <button type="button" onClick={createCiTask} className="text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 px-3 py-1.5 rounded-md">Add Go CI Task</button>
            </div>
        </div>
    );
};

const RustTaskGenerator: React.FC<{
    rustCaps: RustCapabilities | undefined;
    onAddTask: (task: Partial<Task>) => void;
}> = ({ rustCaps, onAddTask }) => {
    if (!rustCaps) return null;

    const getBasename = (p: string) => p.split(/[\\/]/).pop() || p;
    const packageBadges = rustCaps.packages.map(pkg => `Crate: ${pkg.name ?? getBasename(pkg.path)}`);
    const editionBadges = Array.from(new Set(rustCaps.packages.map(pkg => pkg.edition).filter((v): v is string => Boolean(v)))).map(v => `Edition ${v}`);
    const versionBadges = Array.from(new Set(rustCaps.packages.map(pkg => pkg.rustVersion).filter((v): v is string => Boolean(v)))).map(v => `Rust ${v}`);
    const badges = [
        ...packageBadges,
        ...editionBadges,
        ...versionBadges,
        ...(rustCaps.hasWorkspace ? ['Workspace'] : []),
        ...(rustCaps.hasLockfile ? ['Cargo.lock'] : []),
        ...(rustCaps.hasTests ? ['Tests detected'] : []),
        ...(rustCaps.workspaceMembers.length > 0 ? [`Members: ${rustCaps.workspaceMembers.length}`] : []),
    ];

    const createFmtTask = () => onAddTask({
        name: 'Cargo Fmt',
        steps: [{ type: TaskStepType.RUST_CARGO_FMT, id: '', enabled: true }],
    });

    const createClippyTask = () => onAddTask({
        name: 'Cargo Clippy',
        steps: [{ type: TaskStepType.RUST_CARGO_CLIPPY, id: '', enabled: true }],
    });

    const createCiTask = () => {
        const steps: Omit<TaskStep, 'id'>[] = [
            { type: TaskStepType.RUST_CARGO_FMT, enabled: true },
            { type: TaskStepType.RUST_CARGO_CLIPPY, enabled: true },
            { type: TaskStepType.RUST_CARGO_CHECK, enabled: true },
            { type: TaskStepType.RUST_CARGO_TEST, enabled: true },
            { type: TaskStepType.RUST_CARGO_BUILD, enabled: true },
        ];
        onAddTask({
            name: 'Cargo CI Pipeline',
            steps: steps.map(step => ({ ...step, id: '' })),
        });
    };

    return (
        <div className="p-3 mb-4 bg-amber-50 dark:bg-gray-900/50 rounded-lg border border-amber-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
                <CodeBracketIcon className="h-5 w-5 text-amber-500" />
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Rust Project Detected</h3>
            </div>
            {badges.length > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 flex flex-wrap gap-2">
                    {badges.map(badge => (
                        <span key={badge} className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">{badge}</span>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={createFmtTask} className="text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-md">Add Cargo Fmt Task</button>
                <button type="button" onClick={createClippyTask} className="text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-md">Add Cargo Clippy Task</button>
                <button type="button" onClick={createCiTask} className="text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-md">Add Cargo CI Task</button>
            </div>
        </div>
    );
};

const MavenTaskGenerator: React.FC<{
    mavenCaps: MavenCapabilities | undefined;
    onAddTask: (task: Partial<Task>) => void;
}> = ({ mavenCaps, onAddTask }) => {
    if (!mavenCaps) return null;

    const getBasename = (p: string) => p.split(/[\\/]/).pop() || p;
    const coordinates = mavenCaps.projects.map(project => {
        if (project.groupId && project.artifactId) {
            return `${project.groupId}:${project.artifactId}`;
        }
        return `POM: ${getBasename(project.path)}`;
    });
    const packagingBadges = Array.from(new Set(mavenCaps.projects.map(project => project.packaging).filter((v): v is string => Boolean(v)))).map(v => `Packaging: ${v}`);
    const javaBadges = Array.from(new Set(mavenCaps.projects.map(project => project.javaVersion).filter((v): v is string => Boolean(v)))).map(v => `Java ${v}`);
    const badges = [
        ...coordinates,
        ...packagingBadges,
        ...javaBadges,
        ...(mavenCaps.hasWrapper ? ['Maven Wrapper'] : []),
    ];

    const createCleanTask = () => onAddTask({
        name: 'Maven Clean',
        steps: [{ type: TaskStepType.MAVEN_CLEAN, id: '', enabled: true }],
    });

    const createTestTask = () => onAddTask({
        name: 'Maven Test',
        steps: [{ type: TaskStepType.MAVEN_TEST, id: '', enabled: true }],
    });

    const createBuildTask = () => {
        const steps: Omit<TaskStep, 'id'>[] = [
            { type: TaskStepType.MAVEN_CLEAN, enabled: true },
            { type: TaskStepType.MAVEN_TEST, enabled: true },
            { type: TaskStepType.MAVEN_PACKAGE, enabled: true },
        ];
        onAddTask({
            name: 'Maven Build Pipeline',
            steps: steps.map(step => ({ ...step, id: '' })),
        });
    };

    return (
        <div className="p-3 mb-4 bg-orange-50 dark:bg-gray-900/50 rounded-lg border border-orange-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
                <DocumentTextIcon className="h-5 w-5 text-orange-500" />
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Maven Project Detected</h3>
            </div>
            {badges.length > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 flex flex-wrap gap-2">
                    {badges.map(badge => (
                        <span key={badge} className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 px-2 py-0.5 rounded-full">{badge}</span>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={createCleanTask} className="text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-md">Add Maven Clean Task</button>
                <button type="button" onClick={createTestTask} className="text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-md">Add Maven Test Task</button>
                <button type="button" onClick={createBuildTask} className="text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-md">Add Maven Build Task</button>
            </div>
        </div>
    );
};

const DotnetTaskGenerator: React.FC<{
    dotnetCaps: DotnetCapabilities | undefined;
    onAddTask: (task: Partial<Task>) => void;
}> = ({ dotnetCaps, onAddTask }) => {
    if (!dotnetCaps) return null;

    const getBasename = (p: string) => p.split(/[\\/]/).pop() || p;
    const frameworkBadges = Array.from(new Set(dotnetCaps.projects.flatMap(project => project.targetFrameworks))).map(fw => `TFM: ${fw}`);
    const sdkBadges = Array.from(new Set(dotnetCaps.projects.map(project => project.sdk).filter((v): v is string => Boolean(v)))).map(sdk => `SDK: ${sdk}`);
    const projectBadges = dotnetCaps.projects.length > 1
        ? dotnetCaps.projects.map(project => `Project: ${getBasename(project.path)}`)
        : [];
    const badges = [
        ...frameworkBadges,
        ...sdkBadges,
        ...projectBadges,
        ...(dotnetCaps.hasSolution ? ['Solution (.sln) detected'] : []),
    ];

    const createRestoreTask = () => onAddTask({
        name: '.NET Restore',
        steps: [{ type: TaskStepType.DOTNET_RESTORE, id: '', enabled: true }],
    });

    const createBuildTask = () => onAddTask({
        name: '.NET Build',
        steps: [{ type: TaskStepType.DOTNET_BUILD, id: '', enabled: true }],
    });

    const createTestTask = () => onAddTask({
        name: '.NET Test',
        steps: [{ type: TaskStepType.DOTNET_TEST, id: '', enabled: true }],
    });

    const createPipelineTask = () => {
        const steps: Omit<TaskStep, 'id'>[] = [
            { type: TaskStepType.DOTNET_RESTORE, enabled: true },
            { type: TaskStepType.DOTNET_BUILD, enabled: true },
            { type: TaskStepType.DOTNET_TEST, enabled: true },
        ];
        onAddTask({
            name: '.NET Build Pipeline',
            steps: steps.map(step => ({ ...step, id: '' })),
        });
    };

    return (
        <div className="p-3 mb-4 bg-purple-50 dark:bg-gray-900/50 rounded-lg border border-purple-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
                <CubeIcon className="h-5 w-5 text-purple-500" />
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">.NET Project Detected</h3>
            </div>
            {badges.length > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 flex flex-wrap gap-2">
                    {badges.map(badge => (
                        <span key={badge} className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full">{badge}</span>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={createRestoreTask} className="text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md">Add Restore Task</button>
                <button type="button" onClick={createBuildTask} className="text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md">Add Build Task</button>
                <button type="button" onClick={createTestTask} className="text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md">Add Test Task</button>
                <button type="button" onClick={createPipelineTask} className="text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md">Add Build Pipeline</button>
            </div>
        </div>
    );
};

const PythonTaskGenerator: React.FC<{
    pythonCaps: PythonCapabilities | undefined;
    onAddTask: (task: Partial<Task>) => void;
}> = ({ pythonCaps, onAddTask }) => {
    if (!pythonCaps) return null;
    
    const createSetupTask = () => {
        onAddTask({
            name: 'Setup Environment',
            steps: [
                { type: TaskStepType.PYTHON_CREATE_VENV },
                { type: TaskStepType.PYTHON_INSTALL_DEPS }
            ].map(s => ({ ...s, id: '', enabled: true }))
        });
    };

    const createChecksTask = () => {
        const steps: Omit<TaskStep, 'id'>[] = [];
        if (pythonCaps.linters.length > 0) steps.push({ type: TaskStepType.PYTHON_RUN_LINT, enabled: true });
        if (pythonCaps.typeCheckers.length > 0) steps.push({ type: TaskStepType.PYTHON_RUN_TYPECHECK, enabled: true });
        if (pythonCaps.testFramework !== 'unknown') steps.push({ type: TaskStepType.PYTHON_RUN_TESTS, enabled: true });

        onAddTask({
            name: 'Run Checks',
            steps: steps.map(s => ({ ...s, id: '' }))
        });
    };

    const createBuildTask = () => {
        onAddTask({
            name: 'Build Package',
            steps: [{ type: TaskStepType.PYTHON_RUN_BUILD, id: '', enabled: true }]
        });
    };

    const detectedTools = [
        `Env: ${pythonCaps.envManager}`,
        `Build: ${pythonCaps.buildBackend}`,
        `Test: ${pythonCaps.testFramework}`,
        ...pythonCaps.linters,
        ...pythonCaps.formatters,
        ...pythonCaps.typeCheckers,
    ].filter(t => !t.endsWith('unknown')).map(t => t.charAt(0).toUpperCase() + t.slice(1));


    return (
        <div className="p-3 mb-4 bg-blue-50 dark:bg-gray-900/50 rounded-lg border border-blue-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
                <PythonIcon className="h-5 w-5 text-blue-500"/>
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Python Project Detected</h3>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 flex flex-wrap gap-2">
                {detectedTools.map(tool => (
                    <span key={tool} className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">{tool}</span>
                ))}
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={createSetupTask} className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md">Add Setup Task</button>
                <button type="button" onClick={createChecksTask} className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md">Add Checks Task</button>
                <button type="button" onClick={createBuildTask} className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md">Add Build Task</button>
            </div>
        </div>
    );
};

const DockerTaskGenerator: React.FC<{
    dockerCaps: DockerCapabilities | undefined;
    onAddTask: (task: Partial<Task>) => void;
}> = ({ dockerCaps, onAddTask }) => {
    if (!dockerCaps) return null;
    const dockerfiles = dockerCaps.dockerfiles ?? [];
    const composeFiles = dockerCaps.composeFiles ?? [];
    if (dockerfiles.length === 0 && composeFiles.length === 0) return null;

    const getBasename = (p: string) => p.split(/[\\/]/).pop() || p;

    const createDockerBuildTask = (dockerfile: string) => {
        onAddTask({
            name: `Build Image (${getBasename(dockerfile)})`,
            steps: [
                {
                    type: TaskStepType.DOCKER_BUILD_IMAGE,
                    dockerfilePath: dockerfile,
                },
            ].map(step => ({ ...step, id: '', enabled: true })),
        });
    };

    const createComposeTask = (
        composePath: string,
        type: TaskStepType.DOCKER_COMPOSE_UP | TaskStepType.DOCKER_COMPOSE_DOWN | TaskStepType.DOCKER_COMPOSE_BUILD,
    ) => {
        const labelMap: Record<
            TaskStepType.DOCKER_COMPOSE_UP | TaskStepType.DOCKER_COMPOSE_DOWN | TaskStepType.DOCKER_COMPOSE_BUILD,
            string
        > = {
            [TaskStepType.DOCKER_COMPOSE_UP]: 'Compose Up',
            [TaskStepType.DOCKER_COMPOSE_DOWN]: 'Compose Down',
            [TaskStepType.DOCKER_COMPOSE_BUILD]: 'Compose Build',
        };

        const name = `${labelMap[type]} (${getBasename(composePath)})`;
        onAddTask({
            name,
            steps: [
                {
                    type,
                    dockerComposePath: composePath,
                },
            ].map(step => ({ ...step, id: '', enabled: true })),
        });
    };

    const detectedArtifacts = [
        ...dockerfiles.map(file => `Dockerfile: ${getBasename(file)}`),
        ...composeFiles.map(file => `Compose: ${getBasename(file)}`),
    ];

    return (
        <div className="p-3 mb-4 bg-sky-50 dark:bg-gray-900/50 rounded-lg border border-sky-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
                <DockerIcon className="h-5 w-5 text-sky-500" />
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Docker Artifacts Detected</h3>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 flex flex-wrap gap-2">
                {detectedArtifacts.map(artifact => (
                    <span
                        key={artifact}
                        className="bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-full"
                    >
                        {artifact}
                    </span>
                ))}
            </div>
            <div className="flex flex-wrap gap-2">
                {dockerfiles.map(file => (
                    <button
                        key={`dockerfile-${file}`}
                        type="button"
                        onClick={() => createDockerBuildTask(file)}
                        className="text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 px-3 py-1.5 rounded-md"
                    >
                        Add Build Task for {getBasename(file)}
                    </button>
                ))}
                {composeFiles.flatMap(file => [
                    <button
                        key={`compose-up-${file}`}
                        type="button"
                        onClick={() => createComposeTask(file, TaskStepType.DOCKER_COMPOSE_UP)}
                        className="text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-md"
                    >
                        Add Compose Up Task ({getBasename(file)})
                    </button>,
                    <button
                        key={`compose-down-${file}`}
                        type="button"
                        onClick={() => createComposeTask(file, TaskStepType.DOCKER_COMPOSE_DOWN)}
                        className="text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-md"
                    >
                        Add Compose Down Task ({getBasename(file)})
                    </button>,
                    <button
                        key={`compose-build-${file}`}
                        type="button"
                        onClick={() => createComposeTask(file, TaskStepType.DOCKER_COMPOSE_BUILD)}
                        className="text-xs font-medium text-white bg-slate-600 hover:bg-slate-700 px-3 py-1.5 rounded-md"
                    >
                        Add Compose Build Task ({getBasename(file)})
                    </button>,
                ])}
            </div>
        </div>
    );
};

const DelphiTaskGenerator: React.FC<{
    delphiCaps: DelphiCapabilities | undefined;
    onAddTask: (task: Partial<Task>) => void;
}> = ({ delphiCaps, onAddTask }) => {
    if (!delphiCaps || (delphiCaps.projects.length === 0 && delphiCaps.groups.length === 0 && !delphiCaps.packageManagers.boss)) return null;

    const getBasename = (p: string) => p.split(/[\\/]/).pop() || p;

    const createBuildTask = (projectPath: string) => {
        onAddTask({
            name: `Build ${getBasename(projectPath)}`,
            steps: [{
                type: TaskStepType.DelphiBuild,
                delphiProjectFile: projectPath,
                delphiBuildMode: 'Build' as 'Build',
                delphiConfiguration: 'Release',
                delphiPlatform: 'Win32'
            }].map(s => ({ ...s, id: '', enabled: true }))
        });
    };

    const createInnoTask = (scriptPath: string) => {
        onAddTask({
            name: `Package ${getBasename(scriptPath)}`,
            steps: [{
                type: TaskStepType.DELPHI_PACKAGE_INNO,
                delphiInstallerScript: scriptPath,
            }].map(s => ({ ...s, id: '', enabled: true }))
        });
    };
    
    const createBossInstallTask = () => {
        onAddTask({
            name: `Boss Install`,
            steps: [{
                type: TaskStepType.DELPHI_BOSS_INSTALL
            }].map(s => ({ ...s, id: '', enabled: true }))
        });
    };

    return (
        <div className="p-3 mb-4 bg-indigo-50 dark:bg-gray-900/50 rounded-lg border border-indigo-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
                <BeakerIcon className="h-5 w-5 text-indigo-500"/>
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Delphi Project Detected</h3>
            </div>
            <div className="flex flex-wrap gap-2">
                {delphiCaps.packageManagers.boss && (
                    <button type="button" onClick={createBossInstallTask} className="text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-md">
                        Add Boss Install Task
                    </button>
                )}
                {delphiCaps.projects.map(p => (
                    <button key={p.path} type="button" onClick={() => createBuildTask(p.path)} className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md">
                        Add Build Task for {getBasename(p.path)}
                    </button>
                ))}
                {delphiCaps.groups.map(g => (
                    <button key={g} type="button" onClick={() => createBuildTask(g)} className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md">
                        Add Build Task for Group {getBasename(g)}
                    </button>
                ))}
                {delphiCaps.packaging.innoSetup.map(s => (
                     <button key={s} type="button" onClick={() => createInnoTask(s)} className="text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md">
                        Add Inno Setup Task for {getBasename(s)}
                    </button>
                ))}
            </div>
        </div>
    );
};

const LazarusTaskGenerator: React.FC<{
    lazarusCaps: LazarusCapabilities | undefined;
    onAddTask: (task: Partial<Task>) => void;
}> = ({ lazarusCaps, onAddTask }) => {
    if (!lazarusCaps || (lazarusCaps.projects.length === 0 && lazarusCaps.packages.length === 0)) return null;

    const getBasename = (p: string) => p.split(/[\\/]/).pop() || p;

    const createBuildTask = (projectPath: string) => {
        onAddTask({
            name: `Build ${getBasename(projectPath)}`,
            steps: [{
                type: TaskStepType.LAZARUS_BUILD,
                lazarusProjectFile: projectPath,
                lazarusBuildMode: 'Release',
            }].map(s => ({ ...s, id: '', enabled: true }))
        });
    };
    
    const createBuildPackageTask = (packagePath: string) => {
        onAddTask({
            name: `Build Pkg ${getBasename(packagePath)}`,
            steps: [{
                type: TaskStepType.LAZARUS_BUILD_PACKAGE,
                lazarusPackageFile: packagePath,
            }].map(s => ({ ...s, id: '', enabled: true }))
        });
    };

    return (
        <div className="p-3 mb-4 bg-teal-50 dark:bg-gray-900/50 rounded-lg border border-teal-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
                <BeakerIcon className="h-5 w-5 text-teal-500"/>
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Lazarus/FPC Project Detected</h3>
            </div>
            <div className="flex flex-wrap gap-2">
                {lazarusCaps.projects.map(p => (
                    <button key={p.path} type="button" onClick={() => createBuildTask(p.path)} className="text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-md">
                        Add Build Task for {getBasename(p.path)}
                    </button>
                ))}
                {lazarusCaps.packages.map(p => (
                    <button key={p} type="button" onClick={() => createBuildPackageTask(p)} className="text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 px-3 py-1.5 rounded-md">
                        Add Build Task for Pkg {getBasename(p)}
                    </button>
                ))}
            </div>
        </div>
    );
};


// Component for editing the steps of a single task
const TaskStepsEditor: React.FC<{
  task: Task;
  setTask: (task: Task) => void;
  repository: Partial<Repository> | null;
  onAddTask: (template: Partial<Task>) => void;
}> = ({ task, setTask, repository, onAddTask }) => {
  const logger = useLogger();
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [delphiVersions, setDelphiVersions] = useState<{ name: string; version: string }[]>([]);
  const showOnDashboardTooltip = useTooltip('Show this task as a button on the repository card');
  
  useEffect(() => {
    if (repository?.localPath) {
      logger.debug("Fetching project info & suggestions", { repoPath: repository.localPath });
      window.electronAPI?.getProjectInfo(repository.localPath)
        .then(info => {
            setProjectInfo(info);
            logger.info("Project info loaded", { info });
        })
        .catch(error => logger.warn("Could not load project info:", { error }));
      
      window.electronAPI?.getProjectSuggestions({ repoPath: repository.localPath, repoName: repository.name || '' })
        .then(s => {
          setSuggestions(s || []);
          logger.info("Project suggestions loaded", { count: s?.length || 0 });
        })
        .catch(error => logger.warn("Could not load project suggestions:", { error }));
    } else {
      setSuggestions([]);
      setProjectInfo(null);
    }
  }, [repository?.localPath, repository?.name, logger]);

  useEffect(() => {
    if (projectInfo?.tags.includes('delphi') && window.electronAPI?.getDelphiVersions) {
        window.electronAPI.getDelphiVersions()
            .then(setDelphiVersions)
            .catch(e => logger.error('Failed to get Delphi versions', e));
    }
  }, [projectInfo, logger]);
  
  const handleAddStep = (type: TaskStepType) => {
    const newStep: TaskStep = { id: `step_${Date.now()}`, type, enabled: true };
    if (type === TaskStepType.RunCommand) newStep.command = suggestions.length > 0 ? suggestions[0].value : 'npm run build';
    if (type === TaskStepType.GitCheckout) newStep.branch = 'main';
    if (type === TaskStepType.SvnSwitch) newStep.branch = 'trunk';
    setTask({ ...task, steps: [...task.steps, newStep] });
    setIsAddingStep(false);
  };

  const handleStepChange = (id: string, updates: Partial<TaskStep>) => {
    setTask({ ...task, steps: task.steps.map(s => s.id === id ? { ...s, ...updates } : s) });
  };
  
  const handleMoveStep = (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const newSteps = [...task.steps];
    if (direction === 'top') {
      if (index === 0) return;
      const [stepToMove] = newSteps.splice(index, 1);
      newSteps.unshift(stepToMove);
    } else if (direction === 'bottom') {
      if (index === newSteps.length - 1) return;
      const [stepToMove] = newSteps.splice(index, 1);
      newSteps.push(stepToMove);
    } else {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newSteps.length) return;
      [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    }
    setTask({ ...task, steps: newSteps });
  };
  
  const handleRemoveStep = (id: string) => {
    setTask({ ...task, steps: task.steps.filter(s => s.id !== id) });
  };
  
  const handleDuplicateStep = (index: number) => {
    const stepToDuplicate = task.steps[index];
    if (!stepToDuplicate) return;
    const newStep = {
        ...stepToDuplicate,
        id: `step_${Date.now()}_${Math.random()}`
    };
    const newSteps = [...task.steps];
    newSteps.splice(index + 1, 0, newStep);
    setTask({ ...task, steps: newSteps });
  };
  
  const handleVariablesChange = (vars: Task['variables']) => {
    setTask({ ...task, variables: vars });
  };
  
  const handleEnvironmentVariablesChange = (vars: Task['environmentVariables']) => {
    setTask({ ...task, environmentVariables: vars });
  };
  
  const availableSteps = useMemo(() => {
    const allStepTypes = (Object.keys(STEP_DEFINITIONS) as (keyof typeof STEP_DEFINITIONS)[]);
    const vcs = repository?.vcs;
    const tags = projectInfo?.tags || [];

    return allStepTypes.filter(type => {
        if (type.startsWith('GIT_')) return vcs === VcsType.Git;
        if (type.startsWith('SVN_')) return vcs === VcsType.Svn;
        if (type.startsWith('DELPHI_')) return tags.includes('delphi');
        if (type.startsWith('PYTHON_')) return tags.includes('python');
        if (type.startsWith('NODE_')) return tags.includes('nodejs');
        if (type.startsWith('GO_')) return tags.includes('go');
        if (type.startsWith('RUST_')) return tags.includes('rust');
        if (type.startsWith('MAVEN_')) return tags.includes('maven') || tags.includes('java');
        if (type.startsWith('DOTNET_')) return tags.includes('dotnet');
        if (type.startsWith('LAZARUS_') || type.startsWith('FPC_')) return tags.includes('lazarus');
        if (type.startsWith('DOCKER_')) return tags.includes('docker');
        // All other steps (like RunCommand) are always available.
        return true;
    });
  }, [repository?.vcs, projectInfo]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input 
          type="text" 
          value={task.name} 
          onChange={e => setTask({ ...task, name: e.target.value })}
          placeholder="Task Name"
          className="flex-grow text-lg font-bold bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-0 pb-0.5"
        />
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Show on card</span>
          <label {...showOnDashboardTooltip} className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={task.showOnDashboard ?? false} onChange={(e) => setTask({...task, showOnDashboard: e.target.checked})} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
      
      <div className="space-y-3">
        <TaskVariablesEditor variables={task.variables} onVariablesChange={handleVariablesChange} />
        <TaskEnvironmentVariablesEditor variables={task.environmentVariables} onVariablesChange={handleEnvironmentVariablesChange} />
      </div>
      
      {task.steps.length === 0 && (
          <div className="text-center py-6 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
              <CubeTransparentIcon className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-800 dark:text-gray-200">This task has no steps.</h3>
              <p className="mt-1 text-xs text-gray-500">Add steps manually to begin.</p>
          </div>
      )}
      
      <DockerTaskGenerator dockerCaps={projectInfo?.docker} onAddTask={onAddTask} />
      <NodejsTaskGenerator nodejsCaps={projectInfo?.nodejs} onAddTask={onAddTask} />
      <GoTaskGenerator goCaps={projectInfo?.go} onAddTask={onAddTask} />
      <RustTaskGenerator rustCaps={projectInfo?.rust} onAddTask={onAddTask} />
      <MavenTaskGenerator mavenCaps={projectInfo?.maven} onAddTask={onAddTask} />
      <DotnetTaskGenerator dotnetCaps={projectInfo?.dotnet} onAddTask={onAddTask} />
      <PythonTaskGenerator pythonCaps={projectInfo?.python} onAddTask={onAddTask} />
      <LazarusTaskGenerator lazarusCaps={projectInfo?.lazarus} onAddTask={onAddTask} />
      <DelphiTaskGenerator delphiCaps={projectInfo?.delphi} onAddTask={onAddTask} />

      <div className="space-y-3">
        {task.steps.map((step, index) => (
          <TaskStepItem 
            key={step.id} 
            step={step} 
            index={index} 
            totalSteps={task.steps.length} 
            onStepChange={handleStepChange}
            onMoveStep={handleMoveStep}
            onRemoveStep={handleRemoveStep}
            onDuplicateStep={handleDuplicateStep}
            suggestions={suggestions}
            projectInfo={projectInfo}
            delphiVersions={delphiVersions}
          />
        ))}
      </div>

      {isAddingStep && (
        <div className="space-y-4">
            {STEP_CATEGORIES.map(category => {
                const relevantSteps = category.types.filter(type => availableSteps.includes(type));
                if (relevantSteps.length === 0) return null;

                return (
                    <div key={category.name}>
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">{category.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {relevantSteps.map(type => {
                                const { label, icon: Icon, description } = STEP_DEFINITIONS[type];
                                return (
                                    <button key={type} type="button" onClick={() => handleAddStep(type)} className="text-left p-2 bg-gray-100 dark:bg-gray-900/50 rounded-lg hover:bg-blue-500/10 hover:ring-2 ring-blue-500 transition-all">
                                        <div className="flex items-center gap-3">
                                        <Icon className="h-6 w-6 text-blue-500" />
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{label}</p>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
      )}
      
      <button type="button" onClick={() => setIsAddingStep(p => !p)} className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
        <PlusIcon className="h-4 w-4 mr-1"/> {isAddingStep ? 'Cancel' : 'Add Step'}
      </button>
    </div>
  );
};

interface TaskListItemProps {
  task: Task;
  isSelected: boolean;
  onSelect: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (taskId: string) => void;
  onMove: (taskId: string, direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const TaskListItem: React.FC<TaskListItemProps> = ({ task, isSelected, onSelect, onDelete, onDuplicate, onMove, canMoveUp, canMoveDown }) => {
  const deleteTooltip = useTooltip('Delete Task');
  const duplicateTooltip = useTooltip('Duplicate Task');
  const moveUpTooltip = useTooltip('Move Task Up');
  const moveDownTooltip = useTooltip('Move Task Down');

  const moveButtonBaseClass = 'p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
  const getMoveButtonClass = (canMove: boolean) =>
    canMove
      ? `${moveButtonBaseClass} text-gray-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50`
      : `${moveButtonBaseClass} text-gray-300 cursor-not-allowed`;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(task.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(task.id);
  };

  const handleMove = (e: React.MouseEvent, direction: 'up' | 'down') => {
    e.stopPropagation();
    onMove(task.id, direction);
  };

  return (
    <li className={isSelected ? 'bg-blue-500/10' : ''}>
      <button type="button" onClick={() => onSelect(task.id)} className="w-full text-left px-3 py-2 group">
        <div className="flex justify-between items-start">
          <p className={`font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>{task.name}</p>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
            <button
              {...moveUpTooltip}
              type="button"
              onClick={(e) => handleMove(e, 'up')}
              disabled={!canMoveUp}
              aria-label="Move task up"
              className={getMoveButtonClass(canMoveUp)}
            >
              <ArrowUpIcon className="h-4 w-4"/>
            </button>
            <button
              {...moveDownTooltip}
              type="button"
              onClick={(e) => handleMove(e, 'down')}
              disabled={!canMoveDown}
              aria-label="Move task down"
              className={getMoveButtonClass(canMoveDown)}
            >
              <ArrowDownIcon className="h-4 w-4"/>
            </button>
            <button
              {...duplicateTooltip}
              type="button"
              onClick={handleDuplicate}
              className="p-1 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              <DocumentDuplicateIcon className="h-4 w-4"/>
            </button>
            <button
              {...deleteTooltip}
              type="button"
              onClick={handleDelete}
              className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
            >
              <TrashIcon className="h-4 w-4"/>
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{task.steps.length} step(s)</p>
      </button>
    </li>
  );
};

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    if (!highlight.trim()) {
        return <>{text}</>;
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5 py-0 text-gray-900 dark:text-gray-900">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};

type BranchSelectionMode = 'default' | 'toggle' | 'range';

interface CommitListItemProps {
  commit: Commit;
  highlight: string;
}

const CommitListItem: React.FC<CommitListItemProps> = ({ commit, highlight }) => {
  const commitHashTooltip = useTooltip(commit.hash);
  return (
    <li className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <pre className="font-sans whitespace-pre-wrap text-gray-900 dark:text-gray-100">
          <HighlightedText text={commit.message} highlight={highlight} />
        </pre>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>{commit.author}</span>
            <span {...commitHashTooltip} className="font-mono">{commit.shortHash} &bull; {commit.date}</span>
        </div>
    </li>
  );
};

const RepoEditView: React.FC<RepoEditViewProps> = ({ onSave, onCancel, repository, onRefreshState, setToast, confirmAction, defaultCategoryId, onOpenWeblink, detectedExecutables }) => {
  const [formData, setFormData] = useState<Repository | Omit<Repository, 'id'>>(() => repository || NEW_REPO_TEMPLATE);

  const repoIdForSuggestions = useMemo(() => {
    if ('id' in formData) {
      return formData.id;
    }
    return repository?.id ?? null;
  }, [formData, repository]);

  const commandSuggestions = useMemo(() => {
    if (!repoIdForSuggestions) {
      return [] as string[];
    }
    const suggestions = detectedExecutables[repoIdForSuggestions] || [];
    return Array.from(new Set(suggestions)).sort((a, b) => a.localeCompare(b));
  }, [detectedExecutables, repoIdForSuggestions]);

  // Ref to track previous remoteUrl to fire toast only once on discovery
  const prevRemoteUrlRef = useRef(formData.remoteUrl);

  // This effect runs *after* a render, decoupling the parent toast update from the local state update.
  useEffect(() => {
    const currentRemoteUrl = formData.remoteUrl;
    const prevRemoteUrl = prevRemoteUrlRef.current;
  
    // If the previous URL was empty and the current one is not, it means we just discovered it.
    if (!prevRemoteUrl && currentRemoteUrl) {
      setToast({ message: 'Remote URL and name discovered!', type: 'success' });
    }
  
    // Update the ref for the next render.
    prevRemoteUrlRef.current = currentRemoteUrl;
  }, [formData.remoteUrl, setToast]);
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
    if (repository && repository.tasks && repository.tasks.length > 0) {
        return repository.tasks[0].id;
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'branches' | 'releases'>('tasks');
  
  // State for History Tab
  const [commits, setCommits] = useState<Commit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isMoreHistoryLoading, setIsMoreHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState('');
  const [historyMatchStats, setHistoryMatchStats] = useState({ commitCount: 0, occurrenceCount: 0 });

  // State for Branches Tab
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [branchToMerge, setBranchToMerge] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<Array<{ name: string; scope: 'local' | 'remote' }>>([]);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [branchFilter, setBranchFilter] = useState('');
  const [debouncedBranchFilter, setDebouncedBranchFilter] = useState('');
  const [isDeletingBranches, setIsDeletingBranches] = useState(false);
  const branchItemRefs = useRef<{ local: Map<string, HTMLDivElement>; remote: Map<string, HTMLDivElement> }>({
    local: new Map<string, HTMLDivElement>(),
    remote: new Map<string, HTMLDivElement>(),
  });
  const lastSelectedBranchRef = useRef<{ name: string; scope: 'local' | 'remote' } | null>(null);

  const primarySelectedBranch = useMemo(() => selectedBranches[0] ?? null, [selectedBranches]);

  const normalizedSelectedBranchName = useMemo(() => {
    if (!primarySelectedBranch) {
        return '';
    }
    if (primarySelectedBranch.scope === 'remote') {
        const segments = primarySelectedBranch.name.split('/').slice(1);
        return segments.join('/') || primarySelectedBranch.name;
    }
    return primarySelectedBranch.name;
  }, [primarySelectedBranch]);

  const selectedBranchKeySet = useMemo(() => {
    const keySet = new Set<string>();
    selectedBranches.forEach(selection => {
        keySet.add(`${selection.scope}:${selection.name}`);
    });
    return keySet;
  }, [selectedBranches]);

  // State for Releases Tab
  const [releases, setReleases] = useState<ReleaseInfo[] | null>(null);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [releasesError, setReleasesError] = useState<string | null>(null);
  const [editingRelease, setEditingRelease] = useState<Partial<ReleaseInfo> & { isNew?: boolean } | null>(null);


  const formInputStyle = "block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";
  const formLabelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300";

  const isGitRepo = formData.vcs === VcsType.Git;
  const isSvnRepo = formData.vcs === VcsType.Svn;
  const supportsHistoryTab = isGitRepo || isSvnRepo;
  const supportsBranchTab = isGitRepo || isSvnRepo;
  const isGitHubRepo = useMemo(() => isGitRepo && formData.remoteUrl?.includes('github.com'), [isGitRepo, formData.remoteUrl]);

  // Debounce history search
  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedHistorySearch(historySearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [historySearch]);

  // Debounce branch search
  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedBranchFilter(branchFilter);
    }, 300);
    return () => clearTimeout(handler);
  }, [branchFilter]);

  const normalizedBranchFilter = debouncedBranchFilter.trim().toLowerCase();
  const filteredLocalBranches = useMemo(() => {
    const localBranches = branchInfo?.local ?? [];
    if (!normalizedBranchFilter) return localBranches;
    return localBranches.filter(branch => branch.toLowerCase().includes(normalizedBranchFilter));
  }, [branchInfo?.local, normalizedBranchFilter]);

  const filteredRemoteBranches = useMemo(() => {
    const remoteBranches = branchInfo?.remote ?? [];
    if (!normalizedBranchFilter) return remoteBranches;
    return remoteBranches.filter(branch => branch.toLowerCase().includes(normalizedBranchFilter));
  }, [branchInfo?.remote, normalizedBranchFilter]);

  useEffect(() => {
    setSelectedBranches(prev => {
        if (prev.length === 0) {
            return prev;
        }
        const next = prev.filter(selection => {
            const availableBranches = selection.scope === 'local' ? filteredLocalBranches : filteredRemoteBranches;
            return availableBranches.includes(selection.name);
        });
        if (next.length === prev.length) {
            return prev;
        }
        if (next.length > 0) {
            return next;
        }
        if (branchInfo?.current && filteredLocalBranches.includes(branchInfo.current)) {
            return [{ name: branchInfo.current, scope: 'local' }];
        }
        return next;
    });
  }, [filteredLocalBranches, filteredRemoteBranches, branchInfo?.current]);

  useEffect(() => {
    if (!branchInfo) {
        return;
    }
    if (branchToMerge && (branchInfo.local || []).includes(branchToMerge)) {
        return;
    }
    if (branchInfo.current) {
        setBranchToMerge(branchInfo.current);
    } else {
        setBranchToMerge('');
    }
  }, [branchInfo, branchToMerge]);

  useEffect(() => {
    if (!branchInfo) {
        return;
    }
    const firstLocalSelection = selectedBranches.find(selection => selection.scope === 'local' && selection.name !== branchInfo.current);
    if (!firstLocalSelection) {
        return;
    }
    setBranchToMerge(prev => {
        if (!prev || prev === branchInfo.current || !(branchInfo.local || []).includes(prev)) {
            return firstLocalSelection.name;
        }
        return prev;
    });
  }, [selectedBranches, branchInfo]);

  const fetchHistory = useCallback(async (loadMore = false) => {
    if (!repository || !supportsHistoryTab) return;
    
    if (loadMore) {
        setIsMoreHistoryLoading(true);
    } else {
        setHistoryLoading(true);
        setHistoryMatchStats({ commitCount: 0, occurrenceCount: 0 });
    }

    const skipCount = loadMore ? commits.length : 0;
    
    try {
        const newCommits = await window.electronAPI?.getCommitHistory(repository, skipCount, debouncedHistorySearch);
        if(loadMore) {
            setCommits(prev => [...prev, ...(newCommits || [])]);
        } else {
            setCommits(newCommits || []);
        }
        setHasMoreHistory((newCommits || []).length === 100);

        if (debouncedHistorySearch) {
          const regex = new RegExp(debouncedHistorySearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
          let newOccurrences = 0;
          (newCommits || []).forEach(commit => {
            newOccurrences += (commit.message.match(regex) || []).length;
          });

          if (loadMore) {
            setHistoryMatchStats(prev => ({
              commitCount: prev.commitCount + (newCommits?.length || 0),
              occurrenceCount: prev.occurrenceCount + newOccurrences
            }));
          } else {
            setHistoryMatchStats({
              commitCount: (newCommits?.length || 0),
              occurrenceCount: newOccurrences
            });
          }
        } else {
          setHistoryMatchStats({ commitCount: 0, occurrenceCount: 0 });
        }
    } catch (e: any) {
        setToast({ message: `Failed to load history: ${e.message}`, type: 'error' });
    } finally {
        setHistoryLoading(false);
        setIsMoreHistoryLoading(false);
    }
  }, [repository, setToast, commits.length, debouncedHistorySearch, supportsHistoryTab]);

  const fetchBranches = useCallback(async () => {
    if (!repository || !supportsBranchTab) return;
    setBranchesLoading(true);
    try {
        const branches = await window.electronAPI?.listBranches({ repoPath: repository.localPath, vcs: repository.vcs });
        setBranchInfo(branches || null);
        if (branches?.current) {
            setBranchToMerge(branches.current);
        }
        setSelectedBranches(prev => {
            if (!branches) {
                return [];
            }
            const next = prev.filter(selection => {
                const availableBranches = selection.scope === 'local' ? branches.local : branches.remote;
                return availableBranches.includes(selection.name);
            });
            if (next.length > 0) {
                return next;
            }
            if (branches.current) {
                return [{ name: branches.current, scope: 'local' }];
            }
            return [];
        });
    } catch (e: any) {
        setToast({ message: `Failed to load branches: ${e.message}`, type: 'error' });
    } finally {
        setBranchesLoading(false);
    }
  }, [repository, supportsBranchTab, setToast]);

  const fetchReleases = useCallback(async () => {
    if (!repository || !isGitHubRepo) return;
    setReleasesLoading(true);
    setReleasesError(null);
    try {
      const result = await window.electronAPI?.getAllReleases(repository);
      if (result) {
        setReleases(result);
      } else {
        const pat = await window.electronAPI?.getGithubPat();
        if (!pat) {
          setReleasesError("A GitHub Personal Access Token is required to manage releases. Please set one in Settings > Behavior.");
        } else {
          setReleasesError("Failed to fetch releases. This may be due to an invalid PAT or insufficient permissions (requires 'Contents: Read & write'). Check the debug console for more details.");
        }
      }
    } catch (e: any) {
      setReleasesError(`Error: ${e.message}`);
    } finally {
      setReleasesLoading(false);
    }
  }, [repository, isGitHubRepo]);


  // Fetch branch info on mount for the dropdown if possible
  useEffect(() => {
    if (repository?.localPath && supportsBranchTab) {
      if (branchInfo) return; // Don't re-fetch if we already have the info.
      const checkPathAndFetch = async () => {
        const pathState = await window.electronAPI?.checkLocalPath(repository.localPath);
        if (pathState === 'valid') {
            fetchBranches();
        }
      };
      checkPathAndFetch();
    }
  }, [repository, supportsBranchTab, fetchBranches, branchInfo]);
  
  // Fetch data when a tab becomes active or search term changes
  useEffect(() => {
    if (activeTab === 'history' && supportsHistoryTab) {
        fetchHistory(false);
    } else if (activeTab === 'branches' && supportsBranchTab) {
        if (!branchInfo) {
            fetchBranches();
        }
    } else if (activeTab === 'releases') {
        if (!releases) {
            fetchReleases();
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedHistorySearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleVcsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVcs = e.target.value as VcsType;
    setFormData(prev => {
        if (prev.vcs === newVcs) return prev;

        const common = {
            ...( 'id' in prev ? { id: prev.id } : {}),
            name: prev.name,
            localPath: prev.localPath,
            webLinks: prev.webLinks || [],
            tasks: [], // Reset tasks when VCS changes as steps might become invalid
            launchConfigs: prev.launchConfigs || [], // Keep launch configs
            status: RepoStatus.Idle,
            lastUpdated: null,
            buildHealth: BuildHealth.Unknown,
        };

        setSelectedTaskId(null); // Deselect task

        if (newVcs === VcsType.Svn) {
            return {
                ...common,
                vcs: VcsType.Svn,
                remoteUrl: '',
            } as SvnRepository | Omit<SvnRepository, 'id'>;
        } else { // Git
            return {
                ...common,
                vcs: VcsType.Git,
                remoteUrl: '',
                branch: 'main',
            } as GitRepository | Omit<GitRepository, 'id'>;
        }
    });
};


  const handleSave = () => {
    const dataToSave = 'id' in formData ? formData : { ...formData, id: `repo_${Date.now()}` };
    onSave(dataToSave as Repository, defaultCategoryId);
  };

  const handleTaskChange = (updatedTask: Task) => {
    setFormData(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t => t.id === updatedTask.id ? updatedTask : t)
    }));
  };
  
  const handleNewTask = useCallback((template?: Partial<Task>) => {
    const newSteps = (template?.steps || []).map(s => ({
        ...s,
        id: `step_${Date.now()}_${Math.random()}`,
        enabled: true,
    }));

    const newTask: Task = {
        id: `task_${Date.now()}`,
        name: template?.name || 'New Task',
        steps: newSteps,
        variables: [],
        environmentVariables: [],
        showOnDashboard: false,
    };
    const newTasks = [...(formData.tasks || []), newTask];
    setFormData(prev => ({ ...prev, tasks: newTasks }));
    setSelectedTaskId(newTask.id);
  }, [formData.tasks]);
  
  const handleDeleteTask = (taskId: string) => {
    confirmAction({
        title: "Delete Task",
        message: "Are you sure you want to delete this task?",
        confirmText: "Delete",
        icon: <ExclamationCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />,
        onConfirm: () => {
            const newTasks = (formData.tasks || []).filter(t => t.id !== taskId);
            setFormData(prev => ({ ...prev, tasks: newTasks }));
            if (selectedTaskId === taskId) {
              setSelectedTaskId(newTasks.length > 0 ? newTasks[0].id : null);
            }
        }
    });
  };
  
  const handleDuplicateTask = (taskId: string) => {
    const taskToDuplicate = formData.tasks?.find(t => t.id === taskId);
    if (!taskToDuplicate) return;

    // Deep copy, assign new IDs to task and steps
    const newTask = {
        ...JSON.parse(JSON.stringify(taskToDuplicate)),
        id: `task_${Date.now()}`,
        name: `${taskToDuplicate.name} (copy)`,
        steps: taskToDuplicate.steps.map((step: TaskStep) => ({
            ...step,
            id: `step_${Date.now()}_${Math.random()}`
        })),
        environmentVariables: (taskToDuplicate.environmentVariables || []).map((envVar: any) => ({
            ...envVar,
            id: `env_var_${Date.now()}_${Math.random()}`
        })),
    };

    const newTasks = [...(formData.tasks || [])];
    const originalIndex = newTasks.findIndex(t => t.id === taskId);
    newTasks.splice(originalIndex + 1, 0, newTask);

    setFormData(prev => ({...prev, tasks: newTasks}));
    setSelectedTaskId(newTask.id);
  };

  const handleMoveTask = (taskId: string, direction: 'up' | 'down') => {
    setFormData(prev => {
      const tasks = prev.tasks || [];
      const currentIndex = tasks.findIndex(t => t.id === taskId);
      if (currentIndex === -1) {
        return prev;
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= tasks.length) {
        return prev;
      }

      const newTasks = [...tasks];
      const [movedTask] = newTasks.splice(currentIndex, 1);
      newTasks.splice(targetIndex, 0, movedTask);

      return { ...prev, tasks: newTasks };
    });

    setSelectedTaskId(prevSelected => (prevSelected === taskId ? taskId : prevSelected));
  };

  const handleAddWebLink = () => {
    const newLink: WebLinkConfig = { id: `wl_${Date.now()}`, name: 'New Link', url: 'https://' };
    setFormData(prev => ({...prev, webLinks: [...(prev.webLinks || []), newLink]}));
  };

  const handleUpdateWebLink = (id: string, field: keyof Omit<WebLinkConfig, 'id'>, value: string) => {
    setFormData(prev => ({
        ...prev,
        webLinks: (prev.webLinks || []).map(wl => 
            wl.id === id ? { ...wl, [field]: value } : wl
        )
    }));
  };

  const handleRemoveWebLink = (id: string) => {
    setFormData(prev => ({
        ...prev,
        webLinks: (prev.webLinks || []).filter(wl => wl.id !== id)
    }));
  };

  const handleAddLaunchConfig = () => {
    const newConfig: LaunchConfig = { id: `lc_${Date.now()}`, name: 'New Launch', type: 'command', command: '', showOnDashboard: false };
    setFormData(prev => ({...prev, launchConfigs: [...(prev.launchConfigs || []), newConfig]}));
  };

  const handleUpdateLaunchConfig = (id: string, field: keyof LaunchConfig, value: string | boolean) => {
    setFormData(prev => ({
        ...prev,
        launchConfigs: (prev.launchConfigs || []).map(lc => {
          if (lc.id === id) {
            const updated = {...lc, [field]: value};
            // When changing type, reset the other type's data
            if (field === 'type') {
                if (value === 'command') delete (updated as any).command;
            }
            return updated;
          }
          return lc;
        })
    }));
  };

  const handleRemoveLaunchConfig = (id: string) => {
    setFormData(prev => ({
        ...prev,
        launchConfigs: (prev.launchConfigs || []).filter(lc => lc.id !== id)
    }));
  };
  
  const handleCreateBranch = async () => {
    if (!repository || !newBranchName.trim()) return;
    if (!isGitRepo) {
        setToast({ message: 'Branch creation is only supported for Git repositories.', type: 'info' });
        return;
    }
    const result = await window.electronAPI?.createBranch(repository.localPath, newBranchName.trim());
    if (result?.success) {
        setToast({ message: `Branch '${newBranchName.trim()}' created`, type: 'success' });
        setNewBranchName('');
        fetchBranches();
        onRefreshState(repository.id);
    } else {
        setToast({ message: `Error: ${result?.error || 'Electron API not available.'}`, type: 'error' });
    }
  };
  
  const handleDeleteBranch = async (branchIdentifier: string, scope: 'local' | 'remote') => {
    if (!repository) return;
    if (!isGitRepo) {
        setToast({ message: 'Branch deletion is only supported for Git repositories.', type: 'info' });
        return;
    }
    const isRemote = scope === 'remote';
    const remoteDetails = isRemote ? parseRemoteBranchIdentifier(branchIdentifier) : null;
    const branchLabel = formatBranchSelectionLabel(branchIdentifier, scope);

    if (scope === 'local' && branchInfo?.current && branchIdentifier === branchInfo.current) {
        setToast({ message: 'Cannot delete the currently checked out branch.', type: 'info' });
        return;
    }

    if (isProtectedBranch(branchLabel, scope)) {
        setToast({ message: `Branch '${branchLabel}' is protected and cannot be deleted.`, type: 'info' });
        return;
    }

    confirmAction({
        title: `Delete ${isRemote ? 'Remote' : 'Local'} Branch`,
        message: `Are you sure you want to delete ${isRemote ? 'remote' : 'local'} branch '${branchLabel}'?`,
        confirmText: "Delete",
        icon: <ExclamationCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />,
        onConfirm: async () => {
            const branchArgument = isRemote ? (remoteDetails?.branchName ?? branchIdentifier) : branchIdentifier;
            const remoteName = remoteDetails?.remoteName;
            const result = await window.electronAPI?.deleteBranch(
                repository.localPath,
                branchArgument,
                isRemote,
                remoteName
            );
            if (result?.success) {
                setToast({ message: `Branch '${branchLabel}' deleted`, type: 'success' });
                fetchBranches();
                onRefreshState(repository.id);
            } else {
                setToast({ message: `Error: ${result?.error || 'Electron API not available.'}`, type: 'error' });
            }
        }
    });
  };

  const handleBulkDeleteSelectedBranches = useCallback(() => {
    if (!repository || selectedBranches.length === 0) {
        return;
    }

    if (!isGitRepo) {
        setToast({ message: 'Bulk branch deletion is only supported for Git repositories.', type: 'info' });
        return;
    }

    const currentBranch = branchInfo?.current;
    let skippedCurrentCount = 0;
    let skippedProtectedCount = 0;

    const deletable = selectedBranches.filter(selection => {
        if (selection.scope === 'local' && currentBranch && selection.name === currentBranch) {
            skippedCurrentCount += 1;
            return false;
        }
        if (isProtectedBranch(selection.name, selection.scope)) {
            skippedProtectedCount += 1;
            return false;
        }
        return true;
    });

    if (deletable.length === 0) {
        const messages: string[] = [];
        if (skippedProtectedCount) {
            messages.push(`Cannot delete protected branch${skippedProtectedCount > 1 ? 'es' : ''}.`);
        }
        if (skippedCurrentCount) {
            messages.push('Cannot delete the currently checked out branch.');
        }
        setToast({ message: messages.join(' ') || 'No branches can be deleted.', type: 'info' });
        return;
    }

    const summaryLines = deletable
        .map(selection => `• ${selection.scope === 'remote' ? 'Remote' : 'Local'}: ${formatBranchSelectionLabel(selection)}`)
        .join('\n');

    confirmAction({
        title: `Delete ${deletable.length} Branch${deletable.length > 1 ? 'es' : ''}`,
        message: `Are you sure you want to delete the following branches?\n${summaryLines}`,
        confirmText: 'Delete',
        icon: <ExclamationCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />,
        onConfirm: async () => {
            setIsDeletingBranches(true);
            try {
                const results: Array<{ selection: { name: string; scope: 'local' | 'remote' }; success: boolean; error?: string }> = [];
                for (const selection of deletable) {
                    const isRemoteSelection = selection.scope === 'remote';
                    const remoteDetails = isRemoteSelection ? parseRemoteBranchIdentifier(selection.name) : null;
                    const branchArgument = isRemoteSelection
                        ? (remoteDetails?.branchName ?? selection.name)
                        : selection.name;
                    const remoteName = remoteDetails?.remoteName;
                    try {
                        const result = await window.electronAPI?.deleteBranch(
                            repository.localPath,
                            branchArgument,
                            isRemoteSelection,
                            remoteName
                        );
                        if (result?.success) {
                            results.push({ selection, success: true });
                        } else {
                            results.push({ selection, success: false, error: result?.error || 'Electron API not available.' });
                        }
                    } catch (error: any) {
                        results.push({ selection, success: false, error: error.message });
                    }
                }

                const failed = results.filter(result => !result.success);
                const succeeded = results.filter(result => result.success);

                const messages: string[] = [];
                if (succeeded.length) {
                    const successBase = `Deleted ${succeeded.length} branch${succeeded.length > 1 ? 'es' : ''}.`;
                    const skippedMessages: string[] = [];
                    if (skippedProtectedCount) {
                        skippedMessages.push(`Skipped ${skippedProtectedCount} protected branch${skippedProtectedCount > 1 ? 'es' : ''}.`);
                    }
                    if (skippedCurrentCount) {
                        skippedMessages.push('Skipped the currently checked out branch.');
                    }
                    const failureMention = failed.length ? 'Some branches could not be deleted.' : '';
                    messages.push([successBase, skippedMessages.join(' '), failureMention].filter(Boolean).join(' '));
                } else {
                    if (skippedProtectedCount) {
                        messages.push(`Skipped ${skippedProtectedCount} protected branch${skippedProtectedCount > 1 ? 'es' : ''}.`);
                    }
                    if (skippedCurrentCount) {
                        messages.push('Skipped the currently checked out branch.');
                    }
                }

                if (failed.length) {
                    const failureList = failed
                        .map(item => `${item.selection.scope === 'remote' ? 'remote' : 'local'}:${formatBranchSelectionLabel(item.selection)}`)
                        .join(', ');
                    messages.push(`Failed to delete ${failed.length} branch${failed.length > 1 ? 'es' : ''}: ${failureList}.`);
                }

                if (messages.length) {
                    const toastType: 'success' | 'info' | 'error' = failed.length
                        ? (succeeded.length ? 'info' : 'error')
                        : 'success';
                    setToast({ message: messages.join(' '), type: toastType });
                }

                const successfulKeys = new Set(
                    succeeded.map(result => `${result.selection.scope}:${result.selection.name}`)
                );
                if (successfulKeys.size > 0) {
                    setSelectedBranches(prev => prev.filter(selection => !successfulKeys.has(`${selection.scope}:${selection.name}`)));
                }

                await fetchBranches();
                await onRefreshState(repository.id);
            } finally {
                setIsDeletingBranches(false);
            }
        }
    });
  }, [repository, selectedBranches, branchInfo?.current, confirmAction, setToast, fetchBranches, onRefreshState, isGitRepo]);

  const handleMergeBranch = async () => {
      if (!repository || !branchToMerge) return;
      if (!isGitRepo) {
        setToast({ message: 'Branch merging is only supported for Git repositories.', type: 'info' });
        return;
      }
      const currentBranch = branchInfo?.current;
      if (!currentBranch || branchToMerge === currentBranch) {
        setToast({ message: 'Cannot merge a branch into itself.', type: 'info' });
        return;
      }

      confirmAction({
          title: "Merge Branch",
          message: `Are you sure you want to merge '${branchToMerge}' into '${currentBranch}'?`,
          confirmText: "Merge",
          icon: <GitBranchIcon className="h-6 w-6 text-green-600 dark:text-green-400" />,
          confirmButtonClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          onConfirm: async () => {
              const result = await window.electronAPI?.mergeBranch(repository.localPath, branchToMerge);
              if (result?.success) {
                  setToast({ message: `Successfully merged '${branchToMerge}' into '${currentBranch}'`, type: 'success' });
                  fetchBranches();
                  onRefreshState(repository.id);
              } else {
                  setToast({ message: `Merge failed: ${result?.error || 'Electron API not available.'}`, type: 'error' });
              }
          }
      });
  };

  const handleSelectBranch = useCallback((branchName: string, scope: 'local' | 'remote', mode: BranchSelectionMode = 'default') => {
    const scopedBranches = scope === 'local' ? filteredLocalBranches : filteredRemoteBranches;
    setSelectedBranches(prev => {
        if (mode === 'toggle') {
            const exists = prev.some(selection => selection.scope === scope && selection.name === branchName);
            if (exists) {
                return prev.filter(selection => !(selection.scope === scope && selection.name === branchName));
            }
            const filteredPrev = prev.filter(selection => !(selection.scope === scope && selection.name === branchName));
            return [{ name: branchName, scope }, ...filteredPrev];
        }

        if (mode === 'range' && lastSelectedBranchRef.current && lastSelectedBranchRef.current.scope === scope) {
            const anchorName = lastSelectedBranchRef.current.name;
            const anchorIndex = scopedBranches.indexOf(anchorName);
            const targetIndex = scopedBranches.indexOf(branchName);
            if (anchorIndex !== -1 && targetIndex !== -1) {
                const start = Math.min(anchorIndex, targetIndex);
                const end = Math.max(anchorIndex, targetIndex);
                const rangeBranches = scopedBranches.slice(start, end + 1);
                return rangeBranches.map(name => ({ name, scope }));
            }
        }

        return [{ name: branchName, scope }];
    });
    lastSelectedBranchRef.current = { name: branchName, scope };
  }, [filteredLocalBranches, filteredRemoteBranches]);

  const setBranchItemRef = useCallback((scope: 'local' | 'remote', branchName: string, element: HTMLDivElement | null) => {
    const scopeMap = branchItemRefs.current[scope];
    if (!scopeMap) {
        return;
    }
    if (element) {
        scopeMap.set(branchName, element);
    } else {
        scopeMap.delete(branchName);
    }
  }, []);

  const focusBranchItem = useCallback((scope: 'local' | 'remote', branchName: string) => {
    const scopeMap = branchItemRefs.current[scope];
    const element = scopeMap?.get(branchName);
    element?.focus();
  }, []);

  const handleCheckoutBranch = useCallback(async () => {
    if (!repository || selectedBranches.length !== 1 || !primarySelectedBranch) {
        return;
    }

    const currentBranch = branchInfo?.current;
    const focusTarget = normalizedSelectedBranchName || primarySelectedBranch.name;
    const checkoutLabel = primarySelectedBranch.name;

    if (currentBranch && normalizedSelectedBranchName && normalizedSelectedBranchName === currentBranch) {
        setToast({ message: `Already on '${currentBranch}'.`, type: 'info' });
        return;
    }

    setIsCheckoutLoading(true);
    const checkoutTarget = primarySelectedBranch.name;

    try {
        const result = await window.electronAPI?.checkoutBranch({ repoPath: repository.localPath, branch: checkoutTarget, vcs: repository.vcs });
        if (result?.success) {
            setToast({ message: `Checked out '${checkoutLabel}'.`, type: 'success' });
            setBranchToMerge('');
            setSelectedBranches([]);
            await fetchBranches();
            await onRefreshState(repository.id);
            if (focusTarget) {
                requestAnimationFrame(() => focusBranchItem('local', focusTarget));
            }
        } else {
            setToast({ message: `Checkout failed: ${result?.error || 'Electron API not available.'}`, type: 'error' });
        }
    } catch (error: any) {
        setToast({ message: `Checkout failed: ${error.message}`, type: 'error' });
    } finally {
        setIsCheckoutLoading(false);
    }
  }, [repository, selectedBranches.length, primarySelectedBranch, branchInfo?.current, normalizedSelectedBranchName, setToast, fetchBranches, onRefreshState, focusBranchItem]);

  const handleBranchKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>, branchName: string, scope: 'local' | 'remote') => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const mode: BranchSelectionMode = event.shiftKey
            ? 'range'
            : (event.metaKey || event.ctrlKey)
                ? 'toggle'
                : 'default';
        handleSelectBranch(branchName, scope, mode);
        return;
    }

    const scopedBranches = scope === 'local' ? filteredLocalBranches : filteredRemoteBranches;
    if (!scopedBranches.length) {
        return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const currentIndex = scopedBranches.findIndex(branch => branch === branchName);
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = (() => {
            if (currentIndex === -1) {
                return event.key === 'ArrowDown' ? 0 : scopedBranches.length - 1;
            }
            return Math.min(scopedBranches.length - 1, Math.max(0, currentIndex + delta));
        })();
        const nextBranch = scopedBranches[nextIndex];
        if (nextBranch) {
            handleSelectBranch(nextBranch, scope);
            requestAnimationFrame(() => focusBranchItem(scope, nextBranch));
        }
        return;
    }

    if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const targetBranch = event.key === 'Home' ? scopedBranches[0] : scopedBranches[scopedBranches.length - 1];
        if (targetBranch) {
            handleSelectBranch(targetBranch, scope);
            requestAnimationFrame(() => focusBranchItem(scope, targetBranch));
        }
    }
  }, [filteredLocalBranches, filteredRemoteBranches, focusBranchItem, handleSelectBranch]);

  const handleBranchClick = useCallback((event: React.MouseEvent<HTMLDivElement>, branchName: string, scope: 'local' | 'remote') => {
    const mode: BranchSelectionMode = event.shiftKey
        ? 'range'
        : (event.metaKey || event.ctrlKey)
            ? 'toggle'
            : 'default';
    handleSelectBranch(branchName, scope, mode);
  }, [handleSelectBranch]);
  
  const handleDiscoverRemote = useCallback(async () => {
    const currentLocalPath = formData.localPath;
    if (!currentLocalPath) {
        setToast({ message: 'Please provide a local path first.', type: 'info' });
        return;
    }

    try {
        const result = await window.electronAPI?.discoverRemoteUrl({ localPath: currentLocalPath, vcs: formData.vcs });
        if (result && result.url) {
            const discoveredUrl = result.url;
            const discoveredName = result.url.split('/').pop()?.replace(/\.git$/, '') || '';
            
            // This is the safe way: only set the local state. The useEffect will handle the toast.
            setFormData(prev => {
                const newName = (!prev.name || prev.name.trim() === '') ? discoveredName : prev.name;
                return { ...prev, remoteUrl: discoveredUrl, name: newName };
            });

        } else {
            const errorMsg = `Could not discover URL: ${result?.error || 'No remote found.'}`;
            setToast({ message: errorMsg, type: 'error' });
        }
    } catch (e: any) {
        const errorMsg = `Error during discovery: ${e.message}`;
        setToast({ message: errorMsg, type: 'error' });
    }
  }, [formData.localPath, formData.vcs, setToast]);

  const handleChooseLocalPath = useCallback(async () => {
    const result = await window.electronAPI?.showDirectoryPicker();
    if (result && !result.canceled && result.filePaths.length > 0) {
        setFormData(prev => ({ ...prev, localPath: result.filePaths[0] }));
    }
  }, []);

  const handleUpdateRelease = async (releaseId: number, options: Partial<ReleaseInfo>) => {
    if (!repository) return;
    const result = await window.electronAPI?.updateRelease({ repo: repository, releaseId, options });
    if (result?.success) {
      setToast({ message: 'Release updated.', type: 'success' });
      fetchReleases();
    } else {
      setToast({ message: `Error: ${result?.error || 'API call failed.'}`, type: 'error' });
    }
  };
  
  const handleDeleteRelease = async (releaseId: number) => {
    if (!repository) return;
    confirmAction({
      title: 'Delete Release',
      message: 'Are you sure you want to delete this release? This action cannot be undone.',
      confirmText: 'Delete',
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />,
      onConfirm: async () => {
        const result = await window.electronAPI?.deleteRelease({ repo: repository, releaseId });
        if (result?.success) {
          setToast({ message: 'Release deleted.', type: 'success' });
          fetchReleases();
        } else {
          setToast({ message: `Error: ${result?.error || 'API call failed.'}`, type: 'error' });
        }
      },
    });
  };

  const handleSaveRelease = async () => {
    if (!repository || !editingRelease) return;
    
    const options = {
        tag_name: editingRelease.tagName!,
        name: editingRelease.name!,
        body: editingRelease.body || '',
        draft: editingRelease.isDraft || false,
        prerelease: editingRelease.isPrerelease || false,
    };
    
    let result;
    if (editingRelease.isNew) {
      result = await window.electronAPI?.createRelease({ repo: repository, options });
    } else {
      result = await window.electronAPI?.updateRelease({ repo: repository, releaseId: editingRelease.id!, options });
    }

    if (result?.success) {
      setToast({ message: `Release ${editingRelease.isNew ? 'created' : 'saved'}.`, type: 'success' });
      setEditingRelease(null);
      fetchReleases();
    } else {
      setToast({ message: `Error: ${result?.error || 'API call failed.'}`, type: 'error' });
    }
  };


  const selectedTask = useMemo(() => {
    return formData.tasks?.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, formData.tasks]);

  const repositoryForTaskEditor = useMemo(() => {
    return {
        localPath: formData.localPath,
        name: formData.name,
        vcs: formData.vcs,
    };
  }, [formData.localPath, formData.name, formData.vcs]);
  
  const hasBranches = branchInfo && (branchInfo.local.length > 0 || branchInfo.remote.length > 0);

  // FIX: Create a memoized component map for ReactMarkdown to handle external links.
  const markdownComponents = useMemo(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a: ({node, ...props}: any) => {
      if (props.href && (props.href.startsWith('http') || props.href.startsWith('https'))) {
        return <a {...props} onClick={(e) => {
          e.preventDefault();
          onOpenWeblink(props.href);
        }} />;
      }
      return <a {...props} />;
    }
  }), [onOpenWeblink]);

  const renderTabContent = () => {
    if (!('id' in formData)) {
        return <div className="p-4 text-center text-gray-500">Please save the repository to access advanced features.</div>
    }
    switch(activeTab) {
        case 'tasks':
            return (
                <div className="flex-1 flex overflow-hidden">
                    <aside className="w-1/3 xl:w-1/5 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
                        <div className="p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Tasks</h3>
                          <button type="button" onClick={() => handleNewTask()} className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full">
                            <PlusIcon className="h-5 w-5"/>
                          </button>
                        </div>
                        <ul className="flex-1 overflow-y-auto">
                          {(formData.tasks || []).map((task, index, array) => (
                            <TaskListItem
                              key={task.id}
                              task={task}
                              isSelected={selectedTaskId === task.id}
                              onSelect={setSelectedTaskId}
                              onDelete={handleDeleteTask}
                              onDuplicate={handleDuplicateTask}
                              onMove={handleMoveTask}
                              canMoveUp={index > 0}
                              canMoveDown={index < array.length - 1}
                            />
                          ))}
                           {(formData.tasks || []).length === 0 && (
                                <p className="p-4 text-center text-xs text-gray-500">No tasks created yet.</p>
                           )}
                        </ul>
                    </aside>
                    <div className="flex-1 p-4 overflow-y-auto">
                      {selectedTask ? (
                        <TaskStepsEditor task={selectedTask} setTask={handleTaskChange} repository={repositoryForTaskEditor} onAddTask={handleNewTask} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-center text-gray-500">
                           Select a task on the left, or create a new one.
                        </div>
                      )}
                    </div>
                </div>
            );
        case 'history':
            if (!supportsHistoryTab) {
                return <div className="p-4 text-center text-gray-500">History is only available for Git or SVN repositories.</div>;
            }
            return (
                <div className="p-4 space-y-3 flex flex-col overflow-hidden h-full">
                    <div className="relative flex-shrink-0">
                        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search commit messages..."
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            className={`${formInputStyle} pl-10`}
                        />
                    </div>
                    {debouncedHistorySearch && !historyLoading && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 px-1 flex-shrink-0">
                            Found <span className="font-bold text-gray-700 dark:text-gray-200">{historyMatchStats.occurrenceCount}</span> occurrence(s) in <span className="font-bold text-gray-700 dark:text-gray-200">{historyMatchStats.commitCount}</span> commit(s).
                        </p>
                    )}
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {historyLoading ? (
                            <p className="text-center text-gray-500">Loading history...</p>
                        ) : commits.length === 0 ? (
                            <p className="text-center text-gray-500">{debouncedHistorySearch ? `No commits found for "${debouncedHistorySearch}".` : 'No commits found.'}</p>
                        ) : (
                            <>
                                {commits.map(commit => <CommitListItem key={commit.hash} commit={commit} highlight={debouncedHistorySearch} />)}
                                {hasMoreHistory && (
                                    <div className="text-center">
                                        <button onClick={() => fetchHistory(true)} disabled={isMoreHistoryLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
                                            {isMoreHistoryLoading ? 'Loading...' : 'Load More'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            );
        case 'branches': {
            if (!supportsBranchTab) {
                return <div className="p-4 text-center text-gray-500">Branch management is only available for Git or SVN repositories.</div>;
            }
            const selectedBranchCount = selectedBranches.length;
            const selectedLocalCount = selectedBranches.filter(selection => selection.scope === 'local').length;
            const selectedRemoteCount = selectedBranchCount - selectedLocalCount;
            const isCurrentSelection = Boolean(
                selectedBranchCount === 1 &&
                primarySelectedBranch?.scope === 'local' &&
                branchInfo?.current &&
                primarySelectedBranch.name === branchInfo.current
            );
            const checkoutDisabled = selectedBranchCount !== 1 || isCheckoutLoading || branchesLoading || isCurrentSelection;
            const selectionDescription = (() => {
                if (!selectedBranchCount) {
                    return 'Select a branch to checkout.';
                }
                if (selectedBranchCount === 1 && primarySelectedBranch) {
                    return `${primarySelectedBranch.scope === 'remote' ? 'Remote' : 'Local'} branch: ${primarySelectedBranch.name}`;
                }
                const parts: string[] = [];
                if (selectedLocalCount) {
                    parts.push(`${selectedLocalCount} local`);
                }
                if (selectedRemoteCount) {
                    parts.push(`${selectedRemoteCount} remote`);
                }
                return `${selectedBranchCount} branches selected (${parts.join(', ')})`;
            })();
            const hasProtectedSelection = selectedBranches.some(selection => isProtectedBranch(selection.name, selection.scope));
            const hasCurrentBranchSelected = selectedBranches.some(selection => selection.scope === 'local' && branchInfo?.current && selection.name === branchInfo.current);
            const hasDeletableSelection = selectedBranches.some(selection => {
                if (selection.scope === 'local' && branchInfo?.current && selection.name === branchInfo.current) {
                    return false;
                }
                if (isProtectedBranch(selection.name, selection.scope)) {
                    return false;
                }
                return true;
            });
            const bulkDeleteDisabled = !hasDeletableSelection || isDeletingBranches || branchesLoading;
            const bulkDeleteTitle = (() => {
                if (hasDeletableSelection) {
                    return undefined;
                }
                if (hasProtectedSelection) {
                    return 'Cannot delete protected branches.';
                }
                if (hasCurrentBranchSelected) {
                    return 'Cannot delete the currently checked out branch.';
                }
                return undefined;
            })();
            return (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
                        {branchesLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading branches...</p>}
                        {!hasBranches && !branchesLoading && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No branches found. This may be a new repository.</p>
                        )}
                        {hasBranches && !branchesLoading && (
                            <div className="flex-1 flex flex-col overflow-hidden gap-4">
                                <p className="text-sm">
                                    Current branch: <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{branchInfo?.current}</span>
                                </p>
                                <div className="max-w-md flex flex-col sm:flex-row sm:items-center gap-2">
                                    <input
                                        type="text"
                                        value={branchFilter}
                                        onChange={event => setBranchFilter(event.target.value)}
                                        placeholder="Filter branches"
                                        className={`${formInputStyle} flex-1`}
                                    />
                                    <button
                                        type="button"
                                        onClick={fetchBranches}
                                        disabled={branchesLoading}
                                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {branchesLoading ? (
                                            <>
                                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                                Refreshing...
                                            </>
                                        ) : (
                                            'Refresh'
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Tip: Use Shift or Ctrl/Cmd-click to select multiple branches.</p>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                                    <div className="flex flex-col min-h-0">
                                        <h4 className="font-semibold mb-2 flex-shrink-0">Local Branches</h4>
                                        <ul className="flex-1 overflow-y-auto space-y-2 pr-1">
                                            {filteredLocalBranches.map(b => {
                                                const isCurrent = b === branchInfo?.current;
                                                const isSelected = selectedBranchKeySet.has(`local:${b}`);
                                                const isProtectedLocal = isProtectedBranch(b, 'local');
                                                return (
                                                    <li key={b}>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            aria-selected={isSelected}
                                                            onClick={(event) => handleBranchClick(event, b, 'local')}
                                                            onKeyDown={(event) => handleBranchKeyDown(event, b, 'local')}
                                                            ref={element => setBranchItemRef('local', b, element)}
                                                            className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-500 focus-visible:ring-offset-0 ${isSelected ? 'border-transparent bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100' : 'border-transparent bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-sm break-all">
                                                                    <HighlightedText text={b} highlight={debouncedBranchFilter} />
                                                                </span>
                                                                {isCurrent && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">Current</span>}
                                                                {isProtectedLocal && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">Protected</span>}
                                                            </div>
                                                            {!isCurrent && !isProtectedLocal && isGitRepo && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        handleDeleteBranch(b, 'local');
                                                                }}
                                                                    className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
                                                                >
                                                                    <TrashIcon className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                    <div className="flex flex-col min-h-0">
                                        <h4 className="font-semibold mb-2 flex-shrink-0">Remote Branches</h4>
                                        <ul className="flex-1 overflow-y-auto space-y-2 pr-1">
                                            {filteredRemoteBranches.map(b => {
                                                const isSelected = selectedBranchKeySet.has(`remote:${b}`);
                                                const isProtectedRemote = isProtectedBranch(b, 'remote');
                                                return (
                                                    <li key={b}>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            aria-selected={isSelected}
                                                            onClick={(event) => handleBranchClick(event, b, 'remote')}
                                                            onKeyDown={(event) => handleBranchKeyDown(event, b, 'remote')}
                                                            ref={element => setBranchItemRef('remote', b, element)}
                                                            className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-500 focus-visible:ring-offset-0 ${isSelected ? 'border-transparent bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100' : 'border-transparent bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-sm break-all">
                                                                    <HighlightedText text={b} highlight={debouncedBranchFilter} />
                                                                </span>
                                                                {isProtectedRemote && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">Protected</span>}
                                                            </div>
                                                            {!isProtectedRemote && isGitRepo && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        handleDeleteBranch(b, 'remote');
                                                                    }}
                                                                    className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
                                                                >
                                                                    <TrashIcon className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </div>
                                <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-4 flex-shrink-0">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{selectionDescription}</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {isGitRepo && (
                                                <button
                                                    type="button"
                                                    onClick={handleBulkDeleteSelectedBranches}
                                                    disabled={bulkDeleteDisabled}
                                                    title={bulkDeleteTitle}
                                                    className={`px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed ${isDeletingBranches ? 'cursor-wait' : ''}`}
                                                >
                                                    {isDeletingBranches ? 'Deleting…' : 'Delete Selected'}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleCheckoutBranch}
                                                disabled={checkoutDisabled}
                                                className={`px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed ${isCheckoutLoading ? 'cursor-wait' : ''}`}
                                            >
                                                {isCheckoutLoading ? 'Checking out...' : 'Checkout'}
                                            </button>
                                        </div>
                                    </div>
                                    {isSvnRepo && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Branch creation, deletion, and merging are currently only available for Git repositories.
                                        </p>
                                    )}
                                    {isGitRepo && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-semibold mb-2">Create New Branch</h4>
                                                <div className="flex gap-2">
                                                    <input type="text" value={newBranchName} onChange={e => setNewBranchName(e.target.value)} placeholder="new-branch-name" className={formInputStyle}/>
                                                    <button type="button" onClick={handleCreateBranch} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">Create</button>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-2">Merge Branch into Current</h4>
                                                <div className="flex gap-2">
                                                    <select value={branchToMerge || ''} onChange={e => setBranchToMerge(e.target.value)} className={formInputStyle}>
                                                        <option value="" disabled>Select a branch</option>
                                                        {(branchInfo?.local || []).filter(b => b !== branchInfo?.current).map(b => (
                                                            <option key={b} value={b}>{b}</option>
                                                        ))}
                                                    </select>
                                                    <button type="button" onClick={handleMergeBranch} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Merge</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        case 'releases':
            if (!isGitHubRepo) return <div className="p-4 text-center text-gray-500">Release management is only available for repositories hosted on GitHub.</div>;
            if (editingRelease) {
                return (
                    <div className="p-4 space-y-3">
                        <h3 className="text-lg font-semibold">{editingRelease.isNew ? 'Create New Release' : 'Edit Release'}</h3>
                        <div>
                            <label className={formLabelStyle}>Tag Name</label>
                            <input type="text" value={editingRelease.tagName || ''} onChange={e => setEditingRelease(p => ({...p!, tagName: e.target.value}))} className={formInputStyle} />
                        </div>
                         <div>
                            <label className={formLabelStyle}>Release Title</label>
                            <input type="text" value={editingRelease.name || ''} onChange={e => setEditingRelease(p => ({...p!, name: e.target.value}))} className={formInputStyle} />
                        </div>
                         <div>
                            <label className={formLabelStyle}>Release Notes (Markdown)</label>
                            <textarea value={editingRelease.body || ''} onChange={e => setEditingRelease(p => ({...p!, body: e.target.value}))} rows={10} className={`${formInputStyle} font-mono`} />
                        </div>
                        {(() => {
                            const releaseType = editingRelease.isDraft
                                ? 'draft'
                                : editingRelease.isPrerelease
                                    ? 'prerelease'
                                    : 'full';

                            const updateReleaseType = (type: 'draft' | 'prerelease' | 'full') => {
                                setEditingRelease(prev => {
                                    if (!prev) return prev;
                                    if (type === 'draft') {
                                        return { ...prev, isDraft: true, isPrerelease: false };
                                    }
                                    if (type === 'prerelease') {
                                        return { ...prev, isDraft: false, isPrerelease: true };
                                    }
                                    return { ...prev, isDraft: false, isPrerelease: false };
                                });
                            };

                            return (
                                <div>
                                    <p className={formLabelStyle}>Release Type</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-6">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="release-type"
                                                value="full"
                                                checked={releaseType === 'full'}
                                                onChange={() => updateReleaseType('full')}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            Full release
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="release-type"
                                                value="draft"
                                                checked={releaseType === 'draft'}
                                                onChange={() => updateReleaseType('draft')}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            Draft
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="release-type"
                                                value="prerelease"
                                                checked={releaseType === 'prerelease'}
                                                onChange={() => updateReleaseType('prerelease')}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            Pre-release
                                        </label>
                                    </div>
                                </div>
                            );
                        })()}
                        <div className="flex gap-2">
                            <button onClick={handleSaveRelease} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save Release</button>
                            <button onClick={() => setEditingRelease(null)} className="px-4 py-2 bg-gray-500 text-white rounded-md">Cancel</button>
                        </div>
                    </div>
                )
            }
            return (
                <div className="p-4 space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">GitHub Releases</h3>
                        <button onClick={() => setEditingRelease({ isNew: true, tagName: '', name: '', body: '', isDraft: false, isPrerelease: false })} className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">Create New Release</button>
                     </div>
                     {releasesLoading && <p>Loading releases...</p>}
                     {releasesError && <p className="text-red-500">{releasesError}</p>}
                     {releases && releases.length === 0 && (
                        <div className="p-4 text-center text-gray-500">
                            <p>No releases found for this repository.</p>
                            <p className="mt-2 text-xs">
                                Note: To view draft releases, your GitHub Personal Access Token must have repository permissions for "Contents: Read & write".
                            </p>
                        </div>
                     )}
                     <ul className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {releases?.map(release => (
                            <li key={release.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <a href={release.url} onClick={e => { e.preventDefault(); onOpenWeblink(release.url); }} className="text-lg font-bold text-blue-600 dark:text-blue-400 hover:underline">{release.name || release.tagName}</a>
                                            <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{release.tagName}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Released on {new Date(release.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {release.isDraft && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">Draft</span>}
                                        {release.isPrerelease && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200">Pre-release</span>}
                                        <button onClick={() => setEditingRelease(release)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><PencilIcon className="h-4 w-4"/></button>
                                        <button onClick={() => handleDeleteRelease(release.id)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4"/></button>
                                    </div>
                                </div>
                                {release.body && (
                                    <article className="prose prose-sm dark:prose-invert max-w-none mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{release.body}</ReactMarkdown>
                                    </article>
                                )}
                            </li>
                        ))}
                     </ul>
                </div>
            );
    }
    return null;
  };
  
  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 animate-fade-in"
      data-automation-id="repo-form"
    >
        <header className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
                <div className="flex items-center">
                    <button onClick={onCancel} className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold">{repository ? 'Edit Repository' : 'Add New Repository'}</h2>
                        {repository && <p className="text-sm text-gray-500">{repository.name}</p>}
                    </div>
                </div>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            <aside className="w-1/3 xl:w-1/5 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                    <div>
                        <label htmlFor="name" className={formLabelStyle}>Repository Name</label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className={formInputStyle}
                          data-automation-id="repo-form-name"
                        />
                    </div>
                     <div>
                        <label htmlFor="vcs" className={formLabelStyle}>Version Control</label>
                        <select
                          id="vcs"
                          name="vcs"
                          value={formData.vcs}
                          onChange={handleVcsChange}
                          className={formInputStyle}
                          data-automation-id="repo-form-vcs"
                        >
                            <option value={VcsType.Git}>Git</option>
                            <option value={VcsType.Svn}>SVN</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="localPath" className={formLabelStyle}>Local Path</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="text"
                            id="localPath"
                            name="localPath"
                            value={formData.localPath}
                            onChange={handleChange}
                            required
                            className={formInputStyle}
                            data-automation-id="repo-form-local-path"
                          />
                          <button
                            type="button"
                            onClick={handleChooseLocalPath}
                            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                            data-automation-id="repo-form-choose-path"
                          ><FolderOpenIcon className="h-5 w-5"/></button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="remoteUrl" className={formLabelStyle}>Remote URL</label>
                        <div className="mt-1 flex items-center gap-2">
                           <input
                             type="text"
                             id="remoteUrl"
                             name="remoteUrl"
                             value={formData.remoteUrl}
                             onChange={handleChange}
                             required
                             className={formInputStyle}
                             data-automation-id="repo-form-remote-url"
                           />
                           <button
                             type="button"
                             onClick={handleDiscoverRemote}
                             className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                             data-automation-id="repo-form-discover-remote"
                           ><MagnifyingGlassIcon className="h-5 w-5"/></button>
                        </div>
                    </div>
                    {isGitRepo && 'branch' in formData && (
                      <div>
                          <label htmlFor="branch" className={formLabelStyle}>Default Branch</label>
                          <select
                            id="branch"
                            name="branch"
                            value={formData.branch}
                            onChange={handleChange}
                            className={formInputStyle}
                            data-automation-id="repo-form-branch"
                          >
                            {branchInfo?.current && <option value={branchInfo.current}>{branchInfo.current} (current)</option>}
                            {(branchInfo?.local || []).filter(b => b !== branchInfo?.current).map(b => <option key={b} value={b}>{b}</option>)}
                            <optgroup label="Remotes">
                                {(branchInfo?.remote || []).map(b => <option key={b} value={b.split('/').slice(1).join('/')}>{b}</option>)}
                            </optgroup>
                          </select>
                      </div>
                    )}
                    {isGitRepo && (
                         <div className="flex items-start">
                            <div className="flex items-center h-5"><input id="ignoreDirty" name="ignoreDirty" type="checkbox" checked={(formData as GitRepository).ignoreDirty || false} onChange={e => setFormData(p => ({...(p as GitRepository), ignoreDirty: e.target.checked}))} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded bg-gray-200 dark:bg-gray-900"/></div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="ignoreDirty" className="font-medium text-gray-700 dark:text-gray-300">Ignore Dirty Repository</label>
                                <p className="text-xs text-gray-500">If checked, tasks will not check for uncommitted changes before pulling.</p>
                            </div>
                        </div>
                    )}

                    <div className="pt-3">
                        <h4 className="font-semibold mb-2">Web Links</h4>
                        <div className="space-y-2">
                            {(formData.webLinks || []).map(link => (
                                <div key={link.id} className="flex gap-2">
                                    <input type="text" placeholder="Name" value={link.name} onChange={e => handleUpdateWebLink(link.id, 'name', e.target.value)} className={`${formInputStyle} text-xs`} />
                                    <input type="text" placeholder="URL" value={link.url} onChange={e => handleUpdateWebLink(link.id, 'url', e.target.value)} className={`${formInputStyle} text-xs`} />
                                    <button type="button" onClick={() => handleRemoveWebLink(link.id)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddWebLink} className="mt-2 flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"><PlusIcon className="h-3 w-3 mr-1"/>Add Link</button>
                    </div>

                    <div className="pt-3">
                        <h4 className="font-semibold mb-2">Launch Configurations</h4>
                        <div className="space-y-3">
                            {(formData.launchConfigs || []).map(lc => (
                                <div key={lc.id} className="p-2 rounded-md bg-gray-100 dark:bg-gray-900/50 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input type="text" placeholder="Name" value={lc.name} onChange={e => handleUpdateLaunchConfig(lc.id, 'name', e.target.value)} className={`${formInputStyle} text-xs`} />
                                        <select value={lc.type} onChange={e => handleUpdateLaunchConfig(lc.id, 'type', e.target.value)} className={`${formInputStyle} text-xs`}>
                                            <option value="command">Command</option>
                                            <option value="select-executable">Select Executable</option>
                                        </select>
                                        <button type="button" onClick={() => handleRemoveLaunchConfig(lc.id)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4"/></button>
                                    </div>
                                    {lc.type === 'command' && (() => {
                                        const datalistId = `launch-command-suggestions-${lc.id}`;
                                        return (
                                            <div className="space-y-1">
                                                <input
                                                    type="text"
                                                    placeholder="e.g., npm start"
                                                    value={lc.command}
                                                    onChange={e => handleUpdateLaunchConfig(lc.id, 'command', e.target.value)}
                                                    className={`${formInputStyle} text-xs font-mono`}
                                                    list={commandSuggestions.length > 0 ? datalistId : undefined}
                                                />
                                                {commandSuggestions.length > 0 && (
                                                    <>
                                                        <datalist id={datalistId}>
                                                            {commandSuggestions.map(path => (
                                                                <option key={path} value={path} />
                                                            ))}
                                                        </datalist>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                            Suggestions are populated from detected executables in this repository.
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"><input type="checkbox" checked={lc.showOnDashboard} onChange={e => handleUpdateLaunchConfig(lc.id, 'showOnDashboard', e.target.checked)} className="rounded" /> Show on card</label>
                                </div>
                            ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddLaunchConfig}
                          className="mt-2 flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          data-automation-id="repo-form-add-launch-config"
                        ><PlusIcon className="h-3 w-3 mr-1"/>Add Launch Config</button>
                    </div>
                </div>
            </aside>
            <main className="flex-1 flex flex-col min-h-0">
                {'id' in formData && (
                    <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-4 px-4">
                            <button onClick={() => setActiveTab('tasks')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'tasks' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Tasks</button>
                            {supportsHistoryTab && <button onClick={() => setActiveTab('history')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>History</button>}
                            {supportsBranchTab && <button onClick={() => setActiveTab('branches')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'branches' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Branches</button>}
                             {isGitRepo && <button onClick={() => setActiveTab('releases')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'releases' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Releases</button>}
                        </nav>
                    </div>
                )}
                {renderTabContent()}
            </main>
        </div>

        <footer className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            {repository && 'id' in repository && (
                <button
                  type="button"
                  onClick={() => onRefreshState(repository.id)}
                  className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:underline"
                  data-automation-id="repo-form-refresh-state"
                >
                    <ArrowPathIcon className="h-4 w-4 mr-1.5"/>
                    Refresh State
                </button>
            )}
            <div className="flex gap-3">
                 <button
                   type="button"
                   onClick={onCancel}
                   className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
                   data-automation-id="repo-form-cancel"
                 >
                    {repository ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  data-automation-id="repo-form-save"
                >
                    Save Repository
                </button>
            </div>
        </footer>
    </div>
  );
};

export default RepoEditView;