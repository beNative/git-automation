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
                        {(projectInfo?.delphi?.projects || []).map(p => (
                            <option key={p.path} value={p.path}>{p.path}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Project Groups">
                        {/* FIX: Add fallback to an empty array to prevent calling .map on an undefined value. */}
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
    setTask({ ...task, steps: [...task.steps, newStep] });
    setIsAddingStep(false);
  };

  const handleStepChange = (id: string, updates: Partial<TaskStep>) => {
    setTask({ ...task, steps: task.steps.map(s => s.id === id ? { ...s, ...updates } : s) });
  };
  
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...task.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
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
      
      <NodejsTaskGenerator nodejsCaps={projectInfo?.nodejs} onAddTask={onAddTask} />
      <LazarusTaskGenerator lazarusCaps={projectInfo?.lazarus} onAddTask={onAddTask} />
      <DelphiTaskGenerator delphiCaps={projectInfo?.delphi} onAddTask={onAddTask} />
      <PythonTaskGenerator pythonCaps={projectInfo?.python} onAddTask={onAddTask} />

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
}

const TaskListItem: React.FC<TaskListItemProps> = ({ task, isSelected, onSelect, onDelete, onDuplicate }) => {
  const deleteTooltip = useTooltip('Delete Task');
  const duplicateTooltip = useTooltip('Duplicate Task');

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(task.id);
  };
  
  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(task.id);
  };

  return (
    <li className={isSelected ? 'bg-blue-500/10' : ''}>
      <button type="button" onClick={() => onSelect(task.id)} className="w-full text-left px-3 py-2 group">
        <div className="flex justify-between items-start">
          <p className={`font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>{task.name}</p>
          <div className="flex items-center opacity-0 group-hover:opacity-100">
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

const RepoEditView: React.FC<RepoEditViewProps> = ({ onSave, onCancel, repository, onRefreshState, setToast, confirmAction, defaultCategoryId, onOpenWeblink }) => {
  const [formData, setFormData] = useState<Repository | Omit<Repository, 'id'>>(() => repository || NEW_REPO_TEMPLATE);

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

  // State for Releases Tab
  const [releases, setReleases] = useState<ReleaseInfo[] | null>(null);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [releasesError, setReleasesError] = useState<string | null>(null);
  const [editingRelease, setEditingRelease] = useState<Partial<ReleaseInfo> & { isNew?: boolean } | null>(null);


  const formInputStyle = "block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";
  const formLabelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300";

  const isGitRepo = formData.vcs === VcsType.Git;
  const isGitHubRepo = useMemo(() => isGitRepo && formData.remoteUrl?.includes('github.com'), [isGitRepo, formData.remoteUrl]);

  // Debounce history search
  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedHistorySearch(historySearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [historySearch]);

  const fetchHistory = useCallback(async (loadMore = false) => {
    if (!repository) return;
    
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
  }, [repository, setToast, commits.length, debouncedHistorySearch]);

  const fetchBranches = useCallback(async () => {
    if (!repository || !isGitRepo) return;
    setBranchesLoading(true);
    try {
        const branches = await window.electronAPI?.listBranches(repository.localPath);
        setBranchInfo(branches || null);
        if (branches?.current) {
            setBranchToMerge(branches.current);
        }
    } catch (e: any) {
        setToast({ message: `Failed to load branches: ${e.message}`, type: 'error' });
    } finally {
        setBranchesLoading(false);
    }
  }, [repository, isGitRepo, setToast]);

  const fetchReleases = useCallback(async () => {
    if (!repository || !isGitHubRepo) return;
    setReleasesLoading(true);
    setReleasesError(null);
    try {
      const result = await window.electronAPI.getAllReleases(repository);
      if (result) {
        setReleases(result);
      } else {
        const pat = await window.electronAPI.getGithubPat();
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
    if (repository?.localPath && isGitRepo) {
      if (branchInfo) return; // Don't re-fetch if we already have the info.
      const checkPathAndFetch = async () => {
        const pathState = await window.electronAPI.checkLocalPath(repository.localPath);
        if (pathState === 'valid') {
            fetchBranches();
        }
      };
      checkPathAndFetch();
    }
  }, [repository, isGitRepo, fetchBranches, branchInfo]);
  
  // Fetch data when a tab becomes active or search term changes
  useEffect(() => {
    if (activeTab === 'history') {
        fetchHistory(false);
    } else if (activeTab === 'branches') {
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
  
  const handleDeleteBranch = async (branchName: string, isRemote: boolean) => {
    if (!repository) return;
    confirmAction({
        title: `Delete ${isRemote ? 'Remote' : 'Local'} Branch`,
        message: `Are you sure you want to delete ${isRemote ? 'remote' : 'local'} branch '${branchName}'?`,
        confirmText: "Delete",
        icon: <ExclamationCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />,
        onConfirm: async () => {
            const result = await window.electronAPI?.deleteBranch(repository.localPath, branchName, isRemote);
            if (result?.success) {
                setToast({ message: `Branch '${branchName}' deleted`, type: 'success' });
                fetchBranches();
                onRefreshState(repository.id);
            } else {
                setToast({ message: `Error: ${result?.error || 'Electron API not available.'}`, type: 'error' });
            }
        }
    });
  };

  const handleMergeBranch = async () => {
      if (!repository || !branchToMerge) return;
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
  
  const handleDiscoverRemote = useCallback(async () => {
    const currentLocalPath = formData.localPath;
    if (!currentLocalPath) {
        setToast({ message: 'Please provide a local path first.', type: 'info' });
        return;
    }

    try {
        const result = await window.electronAPI.discoverRemoteUrl({ localPath: currentLocalPath, vcs: formData.vcs });
        if (result && result.url) {
            const discoveredUrl = result.url;
            const discoveredName = result.url.split('/').pop()?.replace(/\.git$/, '') || '';
            
            // This is the safe way: only set the local state. The useEffect will handle the toast.
            setFormData(prev => {
                const newName = (!prev.name || prev.name.trim() === '') ? discoveredName : prev.name;
                return { ...prev, remoteUrl: discoveredUrl, name: newName };
            });

        } else {
            const errorMsg = `Could not discover URL: ${result.error || 'No remote found.'}`;
            setToast({ message: errorMsg, type: 'error' });
        }
    } catch (e: any) {
        const errorMsg = `Error during discovery: ${e.message}`;
        setToast({ message: errorMsg, type: 'error' });
    }
  }, [formData.localPath, formData.vcs, setToast]);

  const handleChooseLocalPath = useCallback(async () => {
    const result = await window.electronAPI.showDirectoryPicker();
    if (!result.canceled && result.filePaths.length > 0) {
        setFormData(prev => ({ ...prev, localPath: result.filePaths[0] }));
    }
  }, []);

  const handleUpdateRelease = async (releaseId: number, options: Partial<ReleaseInfo>) => {
    if (!repository) return;
    const result = await window.electronAPI.updateRelease({ repo: repository, releaseId, options });
    if (result.success) {
      setToast({ message: 'Release updated.', type: 'success' });
      fetchReleases();
    } else {
      setToast({ message: `Error: ${result.error}`, type: 'error' });
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
        const result = await window.electronAPI.deleteRelease({ repo: repository, releaseId });
        if (result.success) {
          setToast({ message: 'Release deleted.', type: 'success' });
          fetchReleases();
        } else {
          setToast({ message: `Error: ${result.error}`, type: 'error' });
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
      result = await window.electronAPI.createRelease({ repo: repository, options });
    } else {
      result = await window.electronAPI.updateRelease({ repo: repository, releaseId: editingRelease.id!, options });
    }

    if (result.success) {
      setToast({ message: `Release ${editingRelease.isNew ? 'created' : 'saved'}.`, type: 'success' });
      setEditingRelease(null);
      fetchReleases();
    } else {
      setToast({ message: `Error: ${result.error}`, type: 'error' });
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
                          {(formData.tasks || []).map(task => (
                            <TaskListItem
                              key={task.id}
                              task={task}
                              isSelected={selectedTaskId === task.id}
                              onSelect={setSelectedTaskId}
                              onDelete={handleDeleteTask}
                              onDuplicate={handleDuplicateTask}
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
        case 'branches':
            return (
                 <div className="p-4 space-y-4">
                    {branchesLoading && <p>Loading branches...</p>}
                    {!hasBranches && !branchesLoading && <p>No branches found. This may be a new repository.</p>}
                    {hasBranches && !branchesLoading && (
                        <>
                            <p className="text-sm">Current branch: <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{branchInfo?.current}</span></p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-2">Local Branches</h4>
                                    <ul className="space-y-1">
                                        {(branchInfo?.local || []).map(b => (
                                            <li key={b} className="flex justify-between items-center p-2 rounded-md bg-gray-50 dark:bg-gray-900/50">
                                                <span className="font-mono text-sm">{b}</span>
                                                {b !== branchInfo?.current && <button type="button" onClick={() => handleDeleteBranch(b, false)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4"/></button>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Remote Branches</h4>
                                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                                        {(branchInfo?.remote || []).map(b => (
                                            <li key={b} className="flex justify-between items-center p-2 rounded-md bg-gray-50 dark:bg-gray-900/50">
                                                <span className="font-mono text-sm">{b}</span>
                                                <button type="button" onClick={() => handleDeleteBranch(b.split('/').slice(1).join('/'), true)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4"/></button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                        </>
                    )}
                </div>
            );
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
                        <div className="flex items-center gap-6">
                             <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editingRelease.isDraft} onChange={e => setEditingRelease(p => ({...p!, isDraft: e.target.checked}))} className="rounded" /> Draft</label>
                             <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editingRelease.isPrerelease} onChange={e => setEditingRelease(p => ({...p!, isPrerelease: e.target.checked}))} className="rounded" /> Pre-release</label>
                        </div>
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
                        <button onClick={() => setEditingRelease({ isNew: true, tagName: '', name: '', body: '', isDraft: true, isPrerelease: false })} className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">Create New Release</button>
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
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 animate-fade-in">
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
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className={formInputStyle} />
                    </div>
                     <div>
                        <label htmlFor="vcs" className={formLabelStyle}>Version Control</label>
                        <select id="vcs" name="vcs" value={formData.vcs} onChange={handleVcsChange} className={formInputStyle}>
                            <option value={VcsType.Git}>Git</option>
                            <option value={VcsType.Svn}>SVN</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="localPath" className={formLabelStyle}>Local Path</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input type="text" id="localPath" name="localPath" value={formData.localPath} onChange={handleChange} required className={formInputStyle} />
                          <button type="button" onClick={handleChooseLocalPath} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"><FolderOpenIcon className="h-5 w-5"/></button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="remoteUrl" className={formLabelStyle}>Remote URL</label>
                        <div className="mt-1 flex items-center gap-2">
                           <input type="text" id="remoteUrl" name="remoteUrl" value={formData.remoteUrl} onChange={handleChange} required className={formInputStyle} />
                           <button type="button" onClick={handleDiscoverRemote} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"><MagnifyingGlassIcon className="h-5 w-5"/></button>
                        </div>
                    </div>
                    {isGitRepo && 'branch' in formData && (
                      <div>
                          <label htmlFor="branch" className={formLabelStyle}>Default Branch</label>
                          <select id="branch" name="branch" value={formData.branch} onChange={handleChange} className={formInputStyle}>
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
                                    {lc.type === 'command' && (
                                        <input type="text" placeholder="e.g., npm start" value={lc.command} onChange={e => handleUpdateLaunchConfig(lc.id, 'command', e.target.value)} className={`${formInputStyle} text-xs font-mono`} />
                                    )}
                                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"><input type="checkbox" checked={lc.showOnDashboard} onChange={e => handleUpdateLaunchConfig(lc.id, 'showOnDashboard', e.target.checked)} className="rounded" /> Show on card</label>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddLaunchConfig} className="mt-2 flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"><PlusIcon className="h-3 w-3 mr-1"/>Add Launch Config</button>
                    </div>
                </div>
            </aside>
            <main className="flex-1 flex flex-col min-h-0">
                {'id' in formData && (
                    <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-4 px-4">
                            <button onClick={() => setActiveTab('tasks')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'tasks' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Tasks</button>
                            {isGitRepo && <button onClick={() => setActiveTab('history')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>History</button>}
                            {isGitRepo && <button onClick={() => setActiveTab('branches')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'branches' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Branches</button>}
                             {isGitRepo && <button onClick={() => setActiveTab('releases')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'releases' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Releases</button>}
                        </nav>
                    </div>
                )}
                {renderTabContent()}
            </main>
        </div>

        <footer className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            {repository && 'id' in repository && (
                <button type="button" onClick={() => onRefreshState(repository.id)} className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:underline">
                    <ArrowPathIcon className="h-4 w-4 mr-1.5"/>
                    Refresh State
                </button>
            )}
            <div className="flex gap-3">
                 <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors">
                    {repository ? 'Close' : 'Cancel'}
                </button>
                <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Save Repository
                </button>
            </div>
        </footer>
    </div>
  );
};

export default RepoEditView;
