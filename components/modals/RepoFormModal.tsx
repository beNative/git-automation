import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Repository, Task, TaskStep, ProjectSuggestion, GitRepository, SvnRepository, LaunchConfig, WebLinkConfig, Commit, BranchInfo, PythonCapabilities, ProjectInfo, DelphiCapabilities, NodejsCapabilities, LazarusCapabilities, ReleaseInfo, DockerCapabilities } from '../../types';
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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PencilIcon } from '../icons/PencilIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
// FIX: Import missing ClockIcon.
import { ClockIcon } from '../icons/ClockIcon';
// FIX: Import missing CommitHistoryModal.
import CommitHistoryModal from './CommitHistoryModal';

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
  [TaskStepType.RunCommand]: { label: 'Run Command', icon: CodeBracketIcon, description: 'Execute a custom shell command.' },
  // Delphi
  [TaskStepType.DelphiBuild]: { label: 'Delphi Build', icon: BeakerIcon, description: 'Build, rebuild, or clean a Delphi project.' },
  [TaskStepType.DELPHI_BOSS_INSTALL]: { label: 'Delphi: Boss Install', icon: ArchiveBoxIcon, description: 'Install dependencies using the Boss package manager.' },
  [TaskStepType.DELPHI_PACKAGE_INNO]: { label: 'Delphi: Package (Inno)', icon: ArchiveBoxIcon, description: 'Create an installer using an Inno Setup script.' },
  [TaskStepType.DELPHI_PACKAGE_NSIS]: { label: 'Delphi: Package (NSIS)', icon: ArchiveBoxIcon, description: 'Create an installer using an NSIS script.' },
  [TaskStepType.DELPHI_TEST_DUNITX]: { label: 'Delphi: Run DUnitX Tests', icon: BeakerIcon, description: 'Execute a DUnitX test application.' },
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
    { name: 'SVN', types: [TaskStepType.SvnUpdate] },
    { name: 'Node.js', types: [TaskStepType.NODE_INSTALL_DEPS, TaskStepType.NODE_RUN_BUILD, TaskStepType.NODE_RUN_TESTS, TaskStepType.NODE_RUN_LINT, TaskStepType.NODE_RUN_FORMAT, TaskStepType.NODE_RUN_TYPECHECK] },
    { name: 'Python', types: [TaskStepType.PYTHON_CREATE_VENV, TaskStepType.PYTHON_INSTALL_DEPS, TaskStepType.PYTHON_RUN_BUILD, TaskStepType.PYTHON_RUN_TESTS, TaskStepType.PYTHON_RUN_LINT, TaskStepType.PYTHON_RUN_FORMAT, TaskStepType.PYTHON_RUN_TYPECHECK] },
    { name: 'Delphi', types: [TaskStepType.DelphiBuild, TaskStepType.DELPHI_BOSS_INSTALL, TaskStepType.DELPHI_PACKAGE_INNO, TaskStepType.DELPHI_PACKAGE_NSIS, TaskStepType.DELPHI_TEST_DUNITX] },
    { name: 'Lazarus/FPC', types: [TaskStepType.LAZARUS_BUILD, TaskStepType.LAZARUS_BUILD_PACKAGE, TaskStepType.FPC_TEST_FPCUNIT] },
    { name: 'Docker', types: [TaskStepType.DOCKER_BUILD_IMAGE, TaskStepType.DOCKER_COMPOSE_UP, TaskStepType.DOCKER_COMPOSE_DOWN, TaskStepType.DOCKER_COMPOSE_BUILD] },
];

// Component for a single step in the TaskStepsEditor
const TaskStepItem: React.FC<{
  step: TaskStep;
  index: number;
  totalSteps: number;
  onStepChange: (id: string, updates: Partial<TaskStep>) => void;
  onMoveStep: (index: number, direction: 'up' | 'down') => void;
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
          <button type="button" onClick={() => onMoveStep(index, 'up')} disabled={index === 0} className="p-1.5 disabled:opacity-30 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><ArrowUpIcon className="h-4 w-4" /></button>
          <button type="button" onClick={() => onMoveStep(index, 'down')} disabled={index === totalSteps - 1} className="p-1.5 disabled:opacity-30 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><ArrowDownIcon className="h-4 w-4" /></button>
          <button {...duplicateTooltip} type="button" onClick={() => onDuplicateStep(index)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><DocumentDuplicateIcon className="h-4 w-4" /></button>
          <button type="button" onClick={() => onRemoveStep(step.id)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4" /></button>
        </div>
      </div>
      {step.type === TaskStepType.GitCheckout && (
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Branch Name</label>
          <input type="text" placeholder="e.g., main" value={step.branch || ''} onChange={(e) => onStepChange(step.id, { branch: e.target.value })} required className={formInputStyle} />
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
                        {/* FIX: Add guard to prevent calling .map on undefined or null. */}
                        {(projectInfo?.delphi?.projects || []).map(p => (
                            <option key={p.path} value={p.path}>{p.path}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Project Groups">
                        {/* FIX: Add guard to prevent calling .map on undefined or null. */}
                        {(projectInfo?.delphi?.groups || []).map(g => (
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
  
  const formInputStyle = "block w-full bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm";
  
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-800 dark:text-gray-200">Variables</h4>
      <div className="space-y-2">
        {variables.map(v => (
          <div key={v.id} className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              placeholder="KEY"
              value={v.key}
              onChange={(e) => handleUpdateVariable(v.id, 'key', e.target.value)}
              className={`${formInputStyle} col-span-5`}
            />
            <input
              type="text"
              placeholder="Value"
              value={v.value}
              onChange={(e) => handleUpdateVariable(v.id, 'value', e.target.value)}
              className={`${formInputStyle} col-span-6`}
            />
            <button
              type="button"
              onClick={() => handleRemoveVariable(v.id)}
              className="col-span-1 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAddVariable}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center"
      >
        <PlusIcon className="h-4 w-4 mr-1" /> Add Variable
      </button>
    </div>
  );
};

// Component for managing task environment variables
const TaskEnvironmentVariablesEditor: React.FC<{
  variables: Task['environmentVariables'];
  onVariablesChange: (variables: Task['environmentVariables']) => void;
}> = ({ variables = [], onVariablesChange }) => {
  const handleAddVariable = () => {
    const newVar = { id: `env_${Date.now()}`, key: '', value: '' };
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
  
  const formInputStyle = "block w-full bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm";
  
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-800 dark:text-gray-200">Environment Variables</h4>
       <div className="space-y-2">
        {variables.map(v => (
          <div key={v.id} className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              placeholder="ENV_VAR_NAME"
              value={v.key}
              onChange={(e) => handleUpdateVariable(v.id, 'key', e.target.value)}
              className={`${formInputStyle} col-span-5`}
            />
            <input
              type="text"
              placeholder="Value"
              value={v.value}
              onChange={(e) => handleUpdateVariable(v.id, 'value', e.target.value)}
              className={`${formInputStyle} col-span-6`}
            />
            <button
              type="button"
              onClick={() => handleRemoveVariable(v.id)}
              className="col-span-1 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAddVariable}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center"
      >
        <PlusIcon className="h-4 w-4 mr-1" /> Add Environment Variable
      </button>
    </div>
  );
};

// Component for managing all steps of a single task
const TaskStepsEditor: React.FC<{
  task: Task;
  onTaskChange: (task: Task) => void;
  suggestions: ProjectSuggestion[];
  projectInfo: ProjectInfo | null;
  delphiVersions: { name: string; version: string }[];
}> = ({ task, onTaskChange, suggestions, projectInfo, delphiVersions }) => {

  const handleAddStep = (type: TaskStepType) => {
    const newStep: TaskStep = { id: `step_${Date.now()}`, type, enabled: true };
    if (type === TaskStepType.GitCheckout) newStep.branch = 'main';
    onTaskChange({ ...task, steps: [...task.steps, newStep] });
  };

  const handleStepChange = (id: string, updates: Partial<TaskStep>) => {
    onTaskChange({
      ...task,
      steps: task.steps.map(s => s.id === id ? { ...s, ...updates } : s),
    });
  };

  const handleRemoveStep = (id: string) => {
    onTaskChange({ ...task, steps: task.steps.filter(s => s.id !== id) });
  };
  
  const handleDuplicateStep = (index: number) => {
    const originalStep = task.steps[index];
    if (!originalStep) return;
    const newStep = { ...originalStep, id: `step_${Date.now()}` };
    const newSteps = [...task.steps];
    newSteps.splice(index + 1, 0, newStep);
    onTaskChange({ ...task, steps: newSteps });
  };
  
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= task.steps.length) return;
    const newSteps = [...task.steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    onTaskChange({ ...task, steps: newSteps });
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <input
          type="text"
          value={task.name}
          onChange={(e) => onTaskChange({ ...task, name: e.target.value })}
          placeholder="Task Name (e.g., Build)"
          className="text-lg font-bold bg-transparent border-0 border-b-2 border-gray-300 dark:border-gray-600 focus:ring-0 focus:border-blue-500 p-1"
        />
        <label className="flex items-center space-x-2 text-sm">
          <input
            type="checkbox"
            checked={task.showOnDashboard}
            onChange={(e) => onTaskChange({ ...task, showOnDashboard: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span>Show on dashboard</span>
        </label>
      </div>

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
      
      <div className="p-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <p className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Add New Step</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {STEP_CATEGORIES.map(category => (
                <div key={category.name} className="relative group">
                    <button type="button" className="w-full text-left p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md text-sm font-medium">
                        {category.name}
                    </button>
                    <div className="absolute left-0 top-full mt-1 z-10 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 invisible group-hover:visible group-focus-within:visible transition-all duration-200">
                       {category.types.map(type => {
                          const stepDef = STEP_DEFINITIONS[type];
                          return (
                            <button
                                key={type}
                                type="button"
                                onClick={() => handleAddStep(type)}
                                className="w-full text-left flex items-center p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50"
                            >
                                <stepDef.icon className="h-5 w-5 mr-3 text-blue-500" />
                                <div>
                                    <p className="font-semibold text-sm">{stepDef.label}</p>
                                    <p className="text-xs text-gray-500">{stepDef.description}</p>
                                </div>
                            </button>
                          );
                       })}
                    </div>
                </div>
            ))}
          </div>
      </div>
      
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <TaskVariablesEditor variables={task.variables} onVariablesChange={vars => onTaskChange({ ...task, variables: vars })} />
      </div>
       <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <TaskEnvironmentVariablesEditor variables={task.environmentVariables} onVariablesChange={vars => onTaskChange({ ...task, environmentVariables: vars })} />
      </div>
    </div>
  );
};

// --- Helper component for Project Intelligence UI ---
const ProjectIntelligencePanel: React.FC<{
  projectInfo: ProjectInfo | null;
  onGenerateTasks: (steps: TaskStep[], name: string) => void;
}> = ({ projectInfo, onGenerateTasks }) => {

    const generateTask = (type: 'install' | 'ci' | 'build') => {
        let steps: TaskStep[] = [];
        let name = '';
        
        if (projectInfo?.nodejs) {
            steps.push({ id: 'step_pull', type: TaskStepType.GitPull, enabled: true });
            if (type === 'install') {
                steps.push({ id: 'step_install', type: TaskStepType.NODE_INSTALL_DEPS, enabled: true });
                name = 'Node: Install Dependencies';
            } else if (type === 'ci') {
                steps.push({ id: 'step_install', type: TaskStepType.NODE_INSTALL_DEPS, enabled: true });
                if (projectInfo.nodejs.linters.length > 0) steps.push({ id: 'step_lint', type: TaskStepType.NODE_RUN_LINT, enabled: true });
                if (projectInfo.nodejs.typescript) steps.push({ id: 'step_typecheck', type: TaskStepType.NODE_RUN_TYPECHECK, enabled: true });
                if (projectInfo.nodejs.testFrameworks.length > 0) steps.push({ id: 'step_test', type: TaskStepType.NODE_RUN_TESTS, enabled: true });
                steps.push({ id: 'step_build', type: TaskStepType.NODE_RUN_BUILD, enabled: true });
                name = 'Node: CI Checks & Build';
            }
        } else if (projectInfo?.python) {
             steps.push({ id: 'step_pull', type: TaskStepType.GitPull, enabled: true });
             if (type === 'install') {
                steps.push({ id: 'step_venv', type: TaskStepType.PYTHON_CREATE_VENV, enabled: true });
                steps.push({ id: 'step_install', type: TaskStepType.PYTHON_INSTALL_DEPS, enabled: true });
                name = 'Python: Setup & Install';
             } else if (type === 'ci') {
                steps.push({ id: 'step_install', type: TaskStepType.PYTHON_INSTALL_DEPS, enabled: true });
                if (projectInfo.python.linters.length > 0) steps.push({ id: 'step_lint', type: TaskStepType.PYTHON_RUN_LINT, enabled: true });
                if (projectInfo.python.typeCheckers.length > 0) steps.push({ id: 'step_typecheck', type: TaskStepType.PYTHON_RUN_TYPECHECK, enabled: true });
                if (projectInfo.python.testFramework !== 'unknown') steps.push({ id: 'step_test', type: TaskStepType.PYTHON_RUN_TESTS, enabled: true });
                if (projectInfo.python.buildBackend !== 'unknown') steps.push({ id: 'step_build', type: TaskStepType.PYTHON_RUN_BUILD, enabled: true });
                name = 'Python: CI Checks & Build';
             }
        } else if (projectInfo?.delphi) {
            steps.push({ id: 'step_pull', type: TaskStepType.GitPull, enabled: true });
            if (projectInfo.delphi.packageManagers.boss) {
                steps.push({ id: 'step_boss', type: TaskStepType.DELPHI_BOSS_INSTALL, enabled: true });
            }
            steps.push({ id: 'step_build', type: TaskStepType.DelphiBuild, enabled: true });
            name = 'Delphi: Build Project';
        }
        onGenerateTasks(steps, name);
    };

    const detectedTech: { name: string; icon: React.ReactNode; generateOptions: {type: 'install' | 'ci' | 'build', label: string}[] }[] = [];

    if (projectInfo?.nodejs) {
        detectedTech.push({ name: 'Node.js', icon: <NodeIcon className="h-5 w-5"/>, generateOptions: [{type: 'install', label: 'Install'}, {type: 'ci', label: 'CI & Build'}] });
    }
    if (projectInfo?.python) {
        detectedTech.push({ name: 'Python', icon: <PythonIcon className="h-5 w-5"/>, generateOptions: [{type: 'install', label: 'Setup & Install'}, {type: 'ci', label: 'CI & Build'}] });
    }
    if (projectInfo?.delphi) {
        detectedTech.push({ name: 'Delphi', icon: <BeakerIcon className="h-5 w-5"/>, generateOptions: [{type: 'build', label: 'Build'}] });
    }
    if (projectInfo?.docker) {
        detectedTech.push({ name: 'Docker', icon: <DockerIcon className="h-5 w-5"/>, generateOptions: [] });
    }
    if (projectInfo?.lazarus) {
        detectedTech.push({ name: 'Lazarus', icon: <BeakerIcon className="h-5 w-5"/>, generateOptions: [] });
    }

    if (detectedTech.length === 0) return null;

    return (
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2"><MagnifyingGlassIcon className="h-5 w-5"/> Project Intelligence</h4>
            <div className="flex flex-wrap gap-4 items-center">
                <p className="text-sm text-blue-700 dark:text-blue-300">Detected:</p>
                {detectedTech.map(tech => (
                    <div key={tech.name} className="flex items-center gap-2 bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-full">
                        {tech.icon}
                        <span className="font-medium text-sm">{tech.name}</span>
                    </div>
                ))}
            </div>
             <div className="flex flex-wrap gap-2">
                {detectedTech.flatMap(tech => tech.generateOptions.map(opt => (
                     <button key={`${tech.name}-${opt.type}`} type="button" onClick={() => generateTask(opt.type)} className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                        Generate '{opt.label}' Task
                    </button>
                )))}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const RepoEditView: React.FC<RepoEditViewProps> = ({ onSave, onCancel, repository, onRefreshState, setToast, confirmAction, defaultCategoryId, onOpenWeblink }) => {
  const [repo, setRepo] = useState<Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>>(NEW_REPO_TEMPLATE);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [delphiVersions, setDelphiVersions] = useState<{name: string, version: string}[]>([]);

  // States for branch management
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // States for release management
  const [releases, setReleases] = useState<ReleaseInfo[] | null>(null);
  const [isReleasesLoading, setIsReleasesLoading] = useState(false);

  useEffect(() => {
    if (repository) {
      setRepo(repository);
    }
  }, [repository]);
  
  const isNewRepo = !repository;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: string | boolean = value;

    if (type === 'checkbox') {
        finalValue = (e.target as HTMLInputElement).checked;
    }
    setRepo(prev => ({ ...prev, [name]: finalValue }));
  };
  
  // FIX: Use setRepo with a callback for the else block to fix scoping issue with `prev`.
  const handleVCSChange = (vcs: VcsType) => {
    if (vcs === VcsType.Git) {
        setRepo(prev => ({ ...(prev as SvnRepository), vcs, branch: 'main' } as GitRepository));
    } else {
        setRepo(prev => {
            const { branch, ...svnRepo } = prev as GitRepository;
            return { ...svnRepo, vcs };
        });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repo.name.trim() === '' || repo.remoteUrl.trim() === '') {
      setToast({ message: 'Repository Name and Remote URL are required.', type: 'error' });
      return;
    }
    const repoToSave: Repository = {
      ...(repository || { id: `new_${Date.now()}`, status: RepoStatus.Idle, lastUpdated: null, buildHealth: BuildHealth.Unknown }),
      ...repo,
    };
    onSave(repoToSave, defaultCategoryId);
  };

  const handleTaskChange = (updatedTask: Task) => {
    setRepo(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t => t.id === updatedTask.id ? updatedTask : t),
    }));
  };
  
  const handleAddTask = () => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      name: 'New Task',
      steps: [],
      variables: [],
      environmentVariables: [],
      showOnDashboard: false,
    };
    setRepo(prev => ({ ...prev, tasks: [...(prev.tasks || []), newTask] }));
  };
  
  const handleDeleteTask = (taskId: string) => {
    confirmAction({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      onConfirm: () => {
          setRepo(prev => ({
            ...prev,
            tasks: (prev.tasks || []).filter(t => t.id !== taskId),
          }));
      }
    });
  };
  
  const handleGenerateTasks = (steps: TaskStep[], name: string) => {
      const newTask: Task = {
        id: `task_${Date.now()}`,
        name,
        steps,
        variables: [],
        environmentVariables: [],
        showOnDashboard: true,
      };
      setRepo(prev => ({ ...prev, tasks: [...(prev.tasks || []), newTask] }));
  };

  const handleWebLinkChange = (id: string, field: 'name' | 'url', value: string) => {
    setRepo(prev => ({
      ...prev,
      webLinks: (prev.webLinks || []).map(l => l.id === id ? { ...l, [field]: value } : l),
    }));
  };

  const handleAddWebLink = () => {
    const newLink: WebLinkConfig = { id: `wl_${Date.now()}`, name: '', url: '' };
    setRepo(prev => ({ ...prev, webLinks: [...(prev.webLinks || []), newLink] }));
  };

  const handleDeleteWebLink = (id: string) => {
    setRepo(prev => ({ ...prev, webLinks: (prev.webLinks || []).filter(l => l.id !== id) }));
  };
  
  const handleLaunchConfigChange = (id: string, field: 'name' | 'command' | 'showOnDashboard' | 'type', value: string | boolean) => {
    setRepo(prev => ({
      ...prev,
      launchConfigs: (prev.launchConfigs || []).map(lc => lc.id === id ? { ...lc, [field]: value } : lc),
    }));
  };

  const handleAddLaunchConfig = () => {
    const newConfig: LaunchConfig = { id: `lc_${Date.now()}`, name: '', command: '', showOnDashboard: false, type: 'command' };
    setRepo(prev => ({ ...prev, launchConfigs: [...(prev.launchConfigs || []), newConfig] }));
  };

  const handleDeleteLaunchConfig = (id: string) => {
    setRepo(prev => ({ ...prev, launchConfigs: (prev.launchConfigs || []).filter(lc => lc.id !== id) }));
  };
  
  const handleChooseLocalPath = async () => {
    setIsLoading(true);
    try {
        const result = await window.electronAPI?.showDirectoryPicker();
        if (result && !result.canceled && result.filePaths.length > 0) {
            const chosenPath = result.filePaths[0];
            setRepo(prev => ({ ...prev, localPath: chosenPath }));
            const discoveryResult = await window.electronAPI?.discoverRemoteUrl({ localPath: chosenPath, vcs: repo.vcs });
            if (discoveryResult && discoveryResult.url) {
                setRepo(prev => ({...prev, localPath: chosenPath, remoteUrl: discoveryResult.url!}));
                setToast({ message: 'Remote URL auto-discovered!', type: 'success' });
            } else if (discoveryResult && discoveryResult.error) {
                setToast({ message: `Could not auto-discover URL: ${discoveryResult.error}`, type: 'info' });
            }
        }
    } catch (e: any) {
        setToast({ message: `Error: ${e.message}`, type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };
  
  const fetchProjectInfo = useCallback(async () => {
      if (repo.localPath) {
        setIsLoading(true);
        try {
            const info = await window.electronAPI?.getProjectInfo(repo.localPath);
            setProjectInfo(info || null);
            const suggs = await window.electronAPI?.getProjectSuggestions({ repoPath: repo.localPath, repoName: repo.name });
            setSuggestions(suggs || []);
        } catch (error) {
            console.error("Failed to fetch project info:", error);
            setProjectInfo(null);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
      }
  }, [repo.localPath, repo.name]);
  
  useEffect(() => {
    fetchProjectInfo();
  }, [fetchProjectInfo]);

  useEffect(() => {
    window.electronAPI?.getDelphiVersions().then(setDelphiVersions);
  }, []);
  
  const fetchBranchInfo = useCallback(async () => {
    if (repository && repo.vcs === VcsType.Git) {
      setIsLoading(true);
      try {
        const info = await window.electronAPI?.listBranches(repository.localPath);
        setBranchInfo(info || null);
      } finally {
        setIsLoading(false);
      }
    }
  }, [repository, repo.vcs]);

  const fetchReleases = useCallback(async () => {
    if (repository && repo.vcs === VcsType.Git) {
        setIsReleasesLoading(true);
        try {
            const releaseData = await window.electronAPI?.getAllReleases(repository);
            setReleases(releaseData);
        } catch (e) {
            setReleases(null);
        } finally {
            setIsReleasesLoading(false);
        }
    }
  }, [repository, repo.vcs]);

  useEffect(() => {
    if (activeTab === 'branches') fetchBranchInfo();
    if (activeTab === 'releases') fetchReleases();
  }, [activeTab, fetchBranchInfo, fetchReleases]);
  
  const handleCreateBranch = async () => {
    if (repository && newBranchName.trim()) {
        setIsCreatingBranch(true);
        const result = await window.electronAPI?.createBranch(repository.localPath, newBranchName.trim());
        if (result?.success) {
            setToast({ message: `Branch '${newBranchName.trim()}' created.`, type: 'success' });
            setNewBranchName('');
            await fetchBranchInfo();
        } else {
            setToast({ message: `Error creating branch: ${result?.error}`, type: 'error' });
        }
        setIsCreatingBranch(false);
    }
  };

  const handleDeleteBranch = async (branchName: string, isRemote: boolean) => {
    confirmAction({
        title: 'Delete Branch',
        message: `Are you sure you want to delete the ${isRemote ? 'remote' : 'local'} branch '${branchName}'?`,
        onConfirm: async () => {
            if (repository) {
                const result = await window.electronAPI?.deleteBranch(repository.localPath, branchName, isRemote);
                if (result?.success) {
                    setToast({ message: 'Branch deleted.', type: 'info' });
                    await fetchBranchInfo();
                } else {
                    setToast({ message: `Error deleting branch: ${result?.error}`, type: 'error' });
                }
            }
        },
    });
  };

  const handleMergeBranch = async (branchName: string) => {
    if (repository && branchInfo?.current) {
        confirmAction({
            title: 'Merge Branch',
            message: `Are you sure you want to merge '${branchName}' into '${branchInfo.current}'?`,
            confirmText: 'Merge',
            confirmButtonClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
            onConfirm: async () => {
                const result = await window.electronAPI?.mergeBranch(repository.localPath, branchName);
                if (result?.success) {
                    setToast({ message: 'Merge successful.', type: 'success' });
                    await onRefreshState(repository.id); // Refresh everything
                } else {
                    setToast({ message: `Merge failed: ${result?.error}`, type: 'error' });
                }
            },
        });
    }
  };

  const handleUpdateRelease = async (releaseId: number, options: Partial<ReleaseInfo>) => {
    if (!repository) return;
    const result = await window.electronAPI?.updateRelease({ repo: repository, releaseId, options });
    if (result?.success) {
      setToast({ message: 'Release updated.', type: 'success' });
      await fetchReleases();
    } else {
      setToast({ message: `Update failed: ${result?.error}`, type: 'error' });
    }
  };
  
  const handleCreateRelease = async (options: { tag_name: string, name: string, body: string, draft: boolean, prerelease: boolean }) => {
    if (!repository) return false;
    const result = await window.electronAPI?.createRelease({ repo: repository, options });
    if (result?.success) {
      setToast({ message: 'Release created.', type: 'success' });
      await fetchReleases();
      return true;
    } else {
      setToast({ message: `Creation failed: ${result?.error}`, type: 'error' });
      return false;
    }
  };

  const handleDeleteRelease = (release: ReleaseInfo) => {
    if (!repository) return;
    confirmAction({
        title: 'Delete Release',
        message: `Are you sure you want to delete release '${release.name || release.tagName}'? This cannot be undone.`,
        onConfirm: async () => {
            const result = await window.electronAPI?.deleteRelease({ repo: repository, releaseId: release.id });
            if (result?.success) {
                setToast({ message: 'Release deleted.', type: 'info' });
                await fetchReleases();
            } else {
                setToast({ message: `Delete failed: ${result?.error}`, type: 'error' });
            }
        },
    });
  };


  const tabButtonStyle = (tabName: string) => `px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${activeTab === tabName ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:bg-gray-700/50'}`;
  const formLabelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300";
  const formInputStyle = "mt-1 block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";
  
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 animate-fade-in">
        <header className="flex-shrink-0 bg-gray-50 dark:bg-gray-900/50 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <button onClick={onCancel} className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isNewRepo ? 'Add New Repository' : 'Edit Repository'}</h2>
                        {!isNewRepo && <p className="text-sm text-gray-500">{repo.name}</p>}
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                        Save Repository
                    </button>
                </div>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            <aside className="w-1/4 xl:w-1/5 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50 p-4">
                <nav className="space-y-1">
                    <button onClick={() => setActiveTab('general')} className={tabButtonStyle('general')}><ServerIcon className="h-5 w-5"/>General</button>
                    <button onClick={() => setActiveTab('tasks')} className={tabButtonStyle('tasks')}><CubeTransparentIcon className="h-5 w-5"/>Tasks</button>
                    <button onClick={() => setActiveTab('history')} className={tabButtonStyle('history')}><ClockIcon className="h-5 w-5"/>History</button>
                    {repo.vcs === VcsType.Git && <button onClick={() => setActiveTab('branches')} className={tabButtonStyle('branches')}><GitBranchIcon className="h-5 w-5"/>Branches</button>}
                    {repo.vcs === VcsType.Git && <button onClick={() => setActiveTab('releases')} className={tabButtonStyle('releases')}><TagIcon className="h-5 w-5"/>Releases</button>}
                </nav>
            </aside>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
              {(() => {
                switch(activeTab) {
                    case 'general': return (
                      <GeneralSettingsTab 
                        repo={repo} 
                        isNewRepo={isNewRepo} 
                        handleInputChange={handleInputChange} 
                        handleVCSChange={handleVCSChange} 
                        handleChooseLocalPath={handleChooseLocalPath}
                        handleWebLinkChange={handleWebLinkChange}
                        handleAddWebLink={handleAddWebLink}
                        handleDeleteWebLink={handleDeleteWebLink}
                        handleLaunchConfigChange={handleLaunchConfigChange}
                        handleAddLaunchConfig={handleAddLaunchConfig}
                        handleDeleteLaunchConfig={handleDeleteLaunchConfig}
                      />
                    );
                    case 'tasks': return (
                      <TasksTab 
                        repo={repo} 
                        handleTaskChange={handleTaskChange} 
                        handleAddTask={handleAddTask} 
                        handleDeleteTask={handleDeleteTask}
                        projectInfo={projectInfo}
                        suggestions={suggestions}
                        onGenerateTasks={handleGenerateTasks}
                        delphiVersions={delphiVersions}
                      />
                    );
                    case 'history': return <HistoryTab repository={repository} />;
                    case 'branches': return (
                      <BranchesTab 
                        branchInfo={branchInfo} 
                        isLoading={isLoading} 
                        newBranchName={newBranchName}
                        setNewBranchName={setNewBranchName}
                        isCreatingBranch={isCreatingBranch}
                        handleCreateBranch={handleCreateBranch}
                        handleDeleteBranch={handleDeleteBranch}
                        handleMergeBranch={handleMergeBranch}
                      />
                    );
                    case 'releases': return (
                        <ReleasesTab 
                            releases={releases}
                            isLoading={isReleasesLoading}
                            onUpdate={handleUpdateRelease}
                            onCreate={handleCreateRelease}
                            onDelete={handleDeleteRelease}
                            onOpenWeblink={onOpenWeblink}
                        />
                    );
                    default: return null;
                }
              })()}
            </main>
        </div>
    </div>
  );
};

// --- Sub-components for each tab ---

const GeneralSettingsTab: React.FC<{
    repo: Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>;
    isNewRepo: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleVCSChange: (vcs: VcsType) => void;
    handleChooseLocalPath: () => void;
    handleWebLinkChange: (id: string, field: 'name' | 'url', value: string) => void;
    handleAddWebLink: () => void;
    handleDeleteWebLink: (id: string) => void;
    handleLaunchConfigChange: (id: string, field: 'name' | 'command' | 'showOnDashboard' | 'type', value: string | boolean) => void;
    handleAddLaunchConfig: () => void;
    handleDeleteLaunchConfig: (id: string) => void;
}> = (props) => {
    const { repo, isNewRepo, handleInputChange, handleVCSChange, handleChooseLocalPath, handleWebLinkChange, handleAddWebLink, handleDeleteWebLink, handleLaunchConfigChange, handleAddLaunchConfig, handleDeleteLaunchConfig } = props;
    const formLabelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const formInputStyle = "mt-1 block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";
    
    return (
        <div className="space-y-6 max-w-4xl">
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                <h3 className="text-lg font-bold">Core Information</h3>
                <div>
                    <label htmlFor="name" className={formLabelStyle}>Repository Name</label>
                    <input type="text" name="name" id="name" value={repo.name} onChange={handleInputChange} required className={formInputStyle} />
                </div>
                <div>
                    <label className={formLabelStyle}>Version Control System</label>
                    <div className="mt-2 flex gap-4">
                        <label className="flex items-center"><input type="radio" name="vcs" value={VcsType.Git} checked={repo.vcs === VcsType.Git} onChange={() => handleVCSChange(VcsType.Git)} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/> <span className="ml-2">Git</span></label>
                        <label className="flex items-center"><input type="radio" name="vcs" value={VcsType.Svn} checked={repo.vcs === VcsType.Svn} onChange={() => handleVCSChange(VcsType.Svn)} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/> <span className="ml-2">SVN</span></label>
                    </div>
                </div>
                <div>
                    <label htmlFor="remoteUrl" className={formLabelStyle}>Remote URL</label>
                    <input type="text" name="remoteUrl" id="remoteUrl" value={repo.remoteUrl} onChange={handleInputChange} required className={formInputStyle} />
                </div>
                <div>
                    <label htmlFor="localPath" className={formLabelStyle}>Local Path</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="text" name="localPath" id="localPath" value={repo.localPath} onChange={handleInputChange} className="flex-1 min-w-0 block w-full px-3 py-1.5 rounded-none rounded-l-md bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                        <button type="button" onClick={handleChooseLocalPath} className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm">
                            <FolderOpenIcon className="h-5 w-5 mr-2"/> Browse...
                        </button>
                    </div>
                </div>
                {repo.vcs === VcsType.Git && (
                    <div>
                        <label htmlFor="branch" className={formLabelStyle}>Default Branch</label>
                        <input type="text" name="branch" id="branch" value={(repo as GitRepository).branch} onChange={handleInputChange} required className={formInputStyle} />
                    </div>
                )}
            </div>
            
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                <h3 className="text-lg font-bold">Web Links</h3>
                {repo.webLinks?.map(link => (
                    <div key={link.id} className="grid grid-cols-12 gap-2 items-center">
                        <input type="text" placeholder="Link Name (e.g., JIRA)" value={link.name} onChange={(e) => handleWebLinkChange(link.id, 'name', e.target.value)} className={`${formInputStyle} col-span-5`} />
                        <input type="text" placeholder="https://..." value={link.url} onChange={(e) => handleWebLinkChange(link.id, 'url', e.target.value)} className={`${formInputStyle} col-span-6`} />
                        <button type="button" onClick={() => handleDeleteWebLink(link.id)} className="col-span-1 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4" /></button>
                    </div>
                ))}
                <button type="button" onClick={handleAddWebLink} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center"><PlusIcon className="h-4 w-4 mr-1"/>Add Web Link</button>
            </div>
            
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                <h3 className="text-lg font-bold">Launch Configurations</h3>
                {repo.launchConfigs?.map(lc => (
                    <div key={lc.id} className="space-y-2 p-3 border border-gray-200 dark:border-gray-700 rounded-md">
                        <div className="grid grid-cols-12 gap-2 items-center">
                             <input type="text" placeholder="Config Name" value={lc.name} onChange={(e) => handleLaunchConfigChange(lc.id, 'name', e.target.value)} className={`${formInputStyle} col-span-4`} />
                             <select value={lc.type} onChange={(e) => handleLaunchConfigChange(lc.id, 'type', e.target.value)} className={`${formInputStyle} col-span-3`}>
                                <option value="command">Command</option>
                                <option value="select-executable">Select Executable</option>
                             </select>
                             {lc.type === 'command' && (
                                <input type="text" placeholder="e.g., npm start" value={lc.command || ''} onChange={(e) => handleLaunchConfigChange(lc.id, 'command', e.target.value)} className={`${formInputStyle} col-span-4`} />
                             )}
                             <div className="col-span-1 flex justify-center"><button type="button" onClick={() => handleDeleteLaunchConfig(lc.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4" /></button></div>
                        </div>
                        <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={lc.showOnDashboard} onChange={(e) => handleLaunchConfigChange(lc.id, 'showOnDashboard', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span>Show on dashboard</span></label>
                    </div>
                ))}
                 <button type="button" onClick={handleAddLaunchConfig} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center"><PlusIcon className="h-4 w-4 mr-1"/>Add Launch Config</button>
            </div>
            
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                <h3 className="text-lg font-bold">Advanced</h3>
                 {repo.vcs === VcsType.Git && (
                    <label className="flex items-start gap-3">
                        <input type="checkbox" name="ignoreDirty" checked={(repo as GitRepository).ignoreDirty} onChange={handleInputChange} className="mt-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"/>
                        <div>Ignore Dirty Repository
                            <p className="text-xs text-gray-500">If checked, tasks will proceed even if there are uncommitted local changes.</p>
                        </div>
                    </label>
                 )}
            </div>
        </div>
    );
};

const TasksTab: React.FC<{
    repo: Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>;
    handleTaskChange: (task: Task) => void;
    handleAddTask: () => void;
    handleDeleteTask: (taskId: string) => void;
    projectInfo: ProjectInfo | null;
    suggestions: ProjectSuggestion[];
    onGenerateTasks: (steps: TaskStep[], name: string) => void;
    delphiVersions: { name: string; version: string }[];
}> = (props) => {
    return (
        <div className="space-y-6 max-w-4xl">
            <ProjectIntelligencePanel projectInfo={props.projectInfo} onGenerateTasks={props.onGenerateTasks} />
            {(props.repo.tasks || []).map(task => (
                <div key={task.id} className="relative">
                    <TaskStepsEditor task={task} onTaskChange={props.handleTaskChange} suggestions={props.suggestions} projectInfo={props.projectInfo} delphiVersions={props.delphiVersions}/>
                    <button type="button" onClick={() => props.handleDeleteTask(task.id)} className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-5 w-5" /></button>
                </div>
            ))}
            <button type="button" onClick={props.handleAddTask} className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-blue-500 flex items-center justify-center font-medium">
                <PlusIcon className="h-5 w-5 mr-2" /> New Task
            </button>
        </div>
    );
};

const HistoryTab: React.FC<{ repository: Repository | null }> = ({ repository }) => {
    return repository ? (
        <div className="h-full">
            <CommitHistoryModal isOpen={true} repository={repository} onClose={() => {}} />
        </div>
    ) : (
        <div className="p-6 text-center text-gray-500 border-2 border-dashed rounded-lg">
            Save the repository to view its history.
        </div>
    );
};

const BranchesTab: React.FC<{
    branchInfo: BranchInfo | null;
    isLoading: boolean;
    newBranchName: string;
    setNewBranchName: (name: string) => void;
    isCreatingBranch: boolean;
    handleCreateBranch: () => void;
    handleDeleteBranch: (name: string, isRemote: boolean) => void;
    handleMergeBranch: (name: string) => void;
}> = (props) => {
    const { branchInfo, isLoading, newBranchName, setNewBranchName, isCreatingBranch, handleCreateBranch, handleDeleteBranch, handleMergeBranch } = props;
    
    if (isLoading) return <p>Loading branch information...</p>;
    if (!branchInfo) return <p>Could not load branch information. Ensure local path is correct and the repository is initialized.</p>;

    const remoteBranches = branchInfo.remote.filter(b => !b.includes('HEAD ->'));

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                <h3 className="text-lg font-bold">Create New Branch</h3>
                <div className="flex gap-2">
                    <input type="text" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} placeholder="new-branch-name" className="flex-1 mt-1 block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                    <button onClick={handleCreateBranch} disabled={isCreatingBranch || !newBranchName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {isCreatingBranch ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                    <h3 className="text-lg font-bold">Local Branches</h3>
                    <ul>
                        {branchInfo.local.map(b => (
                            <li key={b} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                <span className={b === branchInfo.current ? 'font-bold text-blue-600 dark:text-blue-400' : ''}>{b}</span>
                                {b !== branchInfo.current && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleMergeBranch(b)} className="text-xs font-medium text-green-600 hover:underline">Merge</button>
                                        <button onClick={() => handleDeleteBranch(b, false)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="h-4 w-4"/></button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                    <h3 className="text-lg font-bold">Remote Branches</h3>
                    <ul>
                        {remoteBranches.map(b => (
                            <li key={b} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                <span>{b}</span>
                                <button onClick={() => handleDeleteBranch(b.split('/').slice(1).join('/'), true)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="h-4 w-4"/></button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const ReleasesTab: React.FC<{
    releases: ReleaseInfo[] | null;
    isLoading: boolean;
    onUpdate: (id: number, options: Partial<ReleaseInfo>) => void;
    onCreate: (options: { tag_name: string, name: string, body: string, draft: boolean, prerelease: boolean }) => Promise<boolean>;
    onDelete: (release: ReleaseInfo) => void;
    onOpenWeblink: (url: string) => void;
}> = (props) => {
    const { releases, isLoading, onUpdate, onCreate, onDelete, onOpenWeblink } = props;
    const [isCreating, setIsCreating] = useState(false);
    
    if (isLoading) return <p>Loading releases...</p>;
    if (releases === null) return (
        <div className="p-6 text-center text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/40 border-2 border-dashed border-yellow-200 dark:border-yellow-700 rounded-lg">
            <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2"/>
            Could not load releases. This may be due to an invalid or missing GitHub Personal Access Token. Please configure it in the global settings.
        </div>
    );

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex justify-end">
                <button onClick={() => setIsCreating(p => !p)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    {isCreating ? 'Cancel' : 'Create New Release'}
                </button>
            </div>

            {isCreating && (
                <ReleaseEditor release={null} onSave={onCreate} onCancel={() => setIsCreating(false)} />
            )}
            
            {releases.length === 0 && !isCreating && (
                <p className="text-center text-gray-500">No releases found for this repository.</p>
            )}

            {releases.map(release => (
                <ReleaseItem key={release.id} release={release} onUpdate={onUpdate} onDelete={onDelete} onOpenWeblink={onOpenWeblink} />
            ))}
        </div>
    );
};

const ReleaseItem: React.FC<{ release: ReleaseInfo; onUpdate: (id: number, options: Partial<ReleaseInfo>) => void; onDelete: (release: ReleaseInfo) => void; onOpenWeblink: (url: string) => void; }> = ({ release, onUpdate, onDelete, onOpenWeblink }) => {
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = async (options: { tag_name: string, name: string, body: string, draft: boolean, prerelease: boolean }) => {
        await onUpdate(release.id, { 
            tagName: options.tag_name,
            name: options.name,
            body: options.body,
            isDraft: options.draft,
            isPrerelease: options.prerelease,
        });
        setIsEditing(false);
        return true;
    };

    if (isEditing) {
        return <ReleaseEditor release={release} onSave={handleSave} onCancel={() => setIsEditing(false)} />;
    }

    return (
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-lg">{release.name || release.tagName}</h4>
                    <a href={release.url} onClick={(e) => { e.preventDefault(); onOpenWeblink(release.url); }} className="text-sm font-mono text-blue-600 dark:text-blue-400 hover:underline">{release.tagName}</a>
                    <div className="mt-2 flex items-center gap-2">
                        {release.isDraft && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">Draft</span>}
                        {release.isPrerelease && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200">Pre-release</span>}
                        <span className="text-xs text-gray-500">Created: {new Date(release.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => onUpdate(release.id, { isDraft: !release.isDraft })} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300">{release.isDraft ? 'Publish' : 'Unpublish'}</button>
                    <button onClick={() => onUpdate(release.id, { isPrerelease: !release.isPrerelease })} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300">{release.isPrerelease ? 'Mark as Stable' : 'Mark as Pre-release'}</button>
                    <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-gray-200 rounded-full"><PencilIcon className="h-4 w-4"/></button>
                    <button onClick={() => onDelete(release)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="h-4 w-4"/></button>
                </div>
            </div>
            {release.body && (
                <article className="prose prose-sm dark:prose-invert max-w-none mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{release.body}</ReactMarkdown>
                </article>
            )}
        </div>
    );
};

const ReleaseEditor: React.FC<{ release: ReleaseInfo | null; onSave: (options: { tag_name: string, name: string, body: string, draft: boolean, prerelease: boolean }) => Promise<boolean>; onCancel: () => void; }> = ({ release, onSave, onCancel }) => {
    const [tagName, setTagName] = useState(release?.tagName || '');
    const [name, setName] = useState(release?.name || '');
    const [body, setBody] = useState(release?.body || '');
    const [isDraft, setIsDraft] = useState(release?.isDraft || true);
    const [isPrerelease, setIsPrerelease] = useState(release?.isPrerelease || false);
    const [isSaving, setIsSaving] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const success = await onSave({ tag_name: tagName, name, body, draft: isDraft, prerelease: isPrerelease });
        if (!success) {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800 space-y-4">
            <h4 className="font-bold text-lg">{release ? 'Edit Release' : 'Create New Release'}</h4>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium">Tag Name</label>
                    <input type="text" value={tagName} onChange={e => setTagName(e.target.value)} required className="mt-1 w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded-md"/>
                </div>
                <div>
                    <label className="text-sm font-medium">Release Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded-md"/>
                </div>
            </div>
            <div>
                 <label className="text-sm font-medium">Release Notes (Markdown)</label>
                 <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className="mt-1 w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm"/>
            </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <label className="flex items-center gap-2"><input type="checkbox" checked={isDraft} onChange={e => setIsDraft(e.target.checked)} className="rounded"/>Draft</label>
                     <label className="flex items-center gap-2"><input type="checkbox" checked={isPrerelease} onChange={e => setIsPrerelease(e.target.checked)} className="rounded"/>Pre-release</label>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onCancel} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 rounded-md text-sm">Cancel</button>
                    <button type="submit" disabled={isSaving} className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Release'}</button>
                </div>
             </div>
        </form>
    );
};

export default RepoEditView;