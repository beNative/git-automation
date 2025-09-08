

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Repository, Task, TaskStep, ProjectSuggestion, GitRepository, SvnRepository, LaunchConfig, WebLinkConfig, Commit, BranchInfo, PythonCapabilities, ProjectInfo, DelphiCapabilities, NodejsCapabilities, LazarusCapabilities, ReleaseInfo } from '../../types';
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
import { useTooltip } from '../../hooks/useTooltip';
import { useLogger } from '../../hooks/useLogger';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { PythonIcon } from '../icons/PythonIcon';
import { NodeIcon } from '../icons/NodeIcon';
import { FolderOpenIcon } from '../icons/FolderOpenIcon';
import { DocumentDuplicateIcon } from '../icons/DocumentDuplicateIcon';
import { ServerIcon } from '../icons/ServerIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// New Icons
const TagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
);

const EllipsisVerticalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
  </svg>
);


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
  onOpenWeblink: (url: string) => Promise<void>;
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
};

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
}> = ({ step, index, totalSteps, onStepChange, onMoveStep, onRemoveStep, onDuplicateStep, suggestions, projectInfo }) => {
  const logger = useLogger();
  
  const stepDef = STEP_DEFINITIONS[step.type];

  // Log invalid steps inside a useEffect to prevent render loops.
  useEffect(() => {
    if (!stepDef) {
        logger.error('Invalid step type encountered in TaskStepItem. This may be due to malformed data.', { step });
    }
  }, [step, stepDef, logger]);
  
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
  const isEnabled = step.enabled ?? true;
  const toggleTooltip = useTooltip(isEnabled ? 'Disable Step' : 'Enable Step');
  const duplicateTooltip = useTooltip('Duplicate Step');

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
      {step.type === TaskStepType.RunCommand && (
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Command</label>
          <select
            // FIX START: This complex expression was a potential source of a boolean being passed as a value.
            // Rewriting it to be more explicit and guarantee a string value.
            value={(step.command && (step.command.startsWith('msbuild') || step.command.startsWith('npm'))) ? step.command : CUSTOM_COMMAND_VALUE}
            // FIX END
            onChange={(e) => {
              const val = e.target.value;
              if (val === CUSTOM_COMMAND_VALUE) {
                onStepChange(step.id, { command: '' });
              } else {
                onStepChange(step.id, { command: val });
              }
            }}
            className={formInputStyle}
          >
            <option value={CUSTOM_COMMAND_VALUE}>Custom Command</option>
            {suggestions.map(s => (
              <optgroup key={s.group} label={s.group}>
                <option value={s.value}>{s.label}</option>
              </optgroup>
            ))}
          </select>
          {(step.command === '' || !((step.command || '').startsWith('msbuild') || (step.command || '').startsWith('npm'))) && (
            <input
              type="text"
              placeholder="e.g., npm run build"
              value={step.command || ''}
              onChange={(e) => onStepChange(step.id, { command: e.target.value })}
              required
              className={`${formInputStyle} mt-2`}
            />
          )}
        </div>
      )}
      {step.type === TaskStepType.DelphiBuild && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Project/Group File</label>
                <select
                    value={step.delphiProjectFile || ''}
                    onChange={(e) => onStepChange(step.id, { delphiProjectFile: e.target.value })}
                    className={formInputStyle}
                >
                    <option value="">Auto-detect</option>
                    <optgroup label="Projects">
                        {projectInfo?.delphi?.projects.map(p => (
                            <option key={p.path} value={p.path}>{p.path}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Project Groups">
                        {projectInfo?.delphi?.groups.map(g => (
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
                <input type="text" placeholder="e.g., Release" value={step.delphiConfiguration || ''} onChange={(e) => onStepChange(step.id, { delphiConfiguration: e.target.value })} className={formInputStyle} />
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Platform</label>
                <input type="text" placeholder="e.g., Win32" value={step.delphiPlatform || ''} onChange={(e) => onStepChange(step.id, { delphiPlatform: e.target.value })} className={formInputStyle} />
            </div>
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
                    {projectInfo?.lazarus?.projects.map(p => (
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
                {projectInfo?.lazarus?.packages.map(p => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Installer Script File</label>
                <input type="text" placeholder="e.g., scripts/installer.iss" value={step.delphiInstallerScript || ''} onChange={(e) => onStepChange(step.id, { delphiInstallerScript: e.target.value })} className={formInputStyle} />
            </div>
            <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Defines (semicolon-separated)</label>
                <input type="text" placeholder="e.g., AppVersion=1.0;Mode=PRO" value={step.delphiInstallerDefines || ''} onChange={(e) => onStepChange(step.id, { delphiInstallerDefines: e.target.value })} className={formInputStyle} />
            </div>
        </div>
      )}
    </div>
  );
};

// ... (rest of the file remains the same)

const RepoEditView: React.FC<RepoEditViewProps> = ({ onSave, onCancel, repository, onRefreshState, setToast, confirmAction, defaultCategoryId, onOpenWeblink }) => {
  const logger = useLogger();
  const [repoState, setRepoState] = useState<Repository>(
    repository ? JSON.parse(JSON.stringify(repository)) : { ...NEW_REPO_TEMPLATE, id: 'new' }
  );
  const [activeTab, setActiveTab] = useState('general');
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null | undefined>(undefined);
  const [allReleases, setAllReleases] = useState<ReleaseInfo[] | null>(null);


  useEffect(() => {
    if (repoState.localPath) {
      const fetchSuggestions = async () => {
        const suggs = await window.electronAPI.getProjectSuggestions({ repoPath: repoState.localPath, repoName: repoState.name });
        setSuggestions(suggs);
      };
      fetchSuggestions();
      handleScanProject();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoState.localPath, repoState.name]);
  
   useEffect(() => {
    if (repository) {
      setLatestRelease(repository.latestRelease);
    }
  }, [repository]);

  const handleScanProject = useCallback(async () => {
    if (!repoState.localPath) {
        setToast({ message: 'Local path is required to scan the project.', type: 'info' });
        return;
    }
    setIsScanning(true);
    try {
        const info = await window.electronAPI.getProjectInfo(repoState.localPath);
        setProjectInfo(info);
        setToast({ message: 'Project scan complete!', type: 'success' });
    } catch (e: any) {
        setToast({ message: `Project scan failed: ${e.message}`, type: 'error' });
    } finally {
        setIsScanning(false);
    }
  }, [repoState.localPath, setToast]);

  const handleRepoChange = (field: keyof Repository, value: any) => {
    setRepoState(prev => {
      // Handle VCS type change
      if (field === 'vcs' && prev.vcs !== value) {
        const newRepoBase = { ...prev, vcs: value };
        if (value === VcsType.Svn) {
          const { branch, ignoreDirty, ...svnRepo } = newRepoBase as GitRepository;
          return svnRepo as SvnRepository;
        } else {
          return { ...newRepoBase, branch: 'main', ignoreDirty: false } as GitRepository;
        }
      }
      return { ...prev, [field]: value };
    });
  };
  
  const handleDiscoverUrl = async () => {
    if (!repoState.localPath || !repoState.vcs) {
        setToast({ message: 'Local path and VCS type are required to discover URL.', type: 'info' });
        return;
    }
    setIsDiscovering(true);
    try {
        const result = await window.electronAPI.discoverRemoteUrl({ localPath: repoState.localPath, vcs: repoState.vcs });
        if (result.url) {
            setRepoState(prev => ({...prev, remoteUrl: result.url as string}));
            setToast({ message: 'Remote URL discovered!', type: 'success' });
        } else {
            setToast({ message: `Could not discover remote URL: ${result.error}`, type: 'error' });
        }
    } catch (e: any) {
         setToast({ message: `Error during discovery: ${e.message}`, type: 'error' });
    } finally {
        setIsDiscovering(false);
    }
  };

  const handleSave = () => {
    // Basic validation
    if (!repoState.name || !repoState.localPath || !repoState.remoteUrl) {
      setToast({ message: 'Name, Local Path, and Remote URL are required.', type: 'error' });
      return;
    }
    onSave(repoState, defaultCategoryId);
  };

  // --- Task Management ---
  const handleTaskChange = (field: keyof Task, value: any) => {
    if (taskToEdit) {
      setTaskToEdit({ ...taskToEdit, [field]: value });
    }
  };

  const handleSaveTask = () => {
    if (taskToEdit) {
      const existingTask = repoState.tasks.find(t => t.id === taskToEdit.id);
      if (existingTask) {
        handleRepoChange('tasks', repoState.tasks.map(t => t.id === taskToEdit.id ? taskToEdit : t));
      } else {
        handleRepoChange('tasks', [...repoState.tasks, taskToEdit]);
      }
      setTaskToEdit(null);
    }
  };

  const handleNewTask = () => {
    setTaskToEdit({
      id: `task_${Date.now()}`,
      name: 'New Task',
      steps: [],
      variables: [],
      environmentVariables: [],
      showOnDashboard: false,
    });
  };

  const handleDeleteTask = (taskId: string) => {
    handleRepoChange('tasks', repoState.tasks.filter(t => t.id !== taskId));
    if (taskToEdit && taskToEdit.id === taskId) {
      setTaskToEdit(null);
    }
  };

  const handleDuplicateTask = (taskId: string) => {
    const task = repoState.tasks.find(t => t.id === taskId);
    if (task) {
        const newTask = {
            ...task,
            id: `task_${Date.now()}`,
            name: `${task.name} (Copy)`,
        };
        handleRepoChange('tasks', [...repoState.tasks, newTask]);
    }
  };


  // --- Helper to add a new item to a list (links, launches, etc.) ---
  const handleAddItem = <T extends { id: string }>(
    listName: 'webLinks' | 'launchConfigs',
    newItem: Omit<T, 'id'>
  ) => {
    const newList = [...(repoState[listName] as T[] || []), { ...newItem, id: `${listName}_${Date.now()}` } as T];
    handleRepoChange(listName, newList);
  };

  // --- Helper to update an item in a list ---
  const handleUpdateItem = <T extends { id: string }>(
    listName: 'webLinks' | 'launchConfigs',
    itemId: string,
    field: keyof T,
    value: any
  ) => {
    const newList = (repoState[listName] as T[] || []).map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    handleRepoChange(listName, newList);
  };

  // --- Helper to delete an item from a list ---
  const handleDeleteItem = (listName: 'webLinks' | 'launchConfigs', itemId: string) => {
    const newList = (repoState[listName] as any[] || []).filter(item => item.id !== itemId);
    handleRepoChange(listName, newList);
  };
  
  // --- Release Management ---
  const fetchAllReleases = useCallback(async () => {
    if (!repository) return;
    try {
        const releases = await window.electronAPI?.getAllReleases(repository);
        setAllReleases(releases);
    } catch (e: any) {
        setToast({ message: `Failed to fetch releases: ${e.message}`, type: 'error' });
    }
  }, [repository, setToast]);

  useEffect(() => {
    if (activeTab === 'releases' && repository) {
        fetchAllReleases();
    }
  }, [activeTab, repository, fetchAllReleases]);

  const handleUpdateRelease = async (releaseId: number, options: { draft?: boolean, prerelease?: boolean }) => {
    if (!repository) return;
    const result = await window.electronAPI?.updateRelease({ repo: repository, releaseId, options });
    if (result?.success) {
        setToast({ message: 'Release updated!', type: 'success' });
        fetchAllReleases(); // Refresh list
    } else {
        setToast({ message: `Failed to update release: ${result?.error}`, type: 'error' });
    }
  };
  
  const handleDeleteRelease = (releaseId: number) => {
    if (!repository) return;
    confirmAction({
        title: 'Delete Release',
        message: 'Are you sure you want to delete this release? This action cannot be undone and will remove it from GitHub.',
        confirmText: 'Delete',
        confirmButtonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        onConfirm: async () => {
            const result = await window.electronAPI?.deleteRelease({ repo: repository, releaseId });
            if (result?.success) {
                setToast({ message: 'Release deleted.', type: 'info' });
                fetchAllReleases(); // Refresh list
            } else {
                setToast({ message: `Failed to delete release: ${result?.error}`, type: 'error' });
            }
        }
    });
  };

  const isNewRepo = repoState.id === 'new';

  return (
    <div className="flex h-full flex-col animate-fade-in-fast">
      <header className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onCancel} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <ArrowLeftIcon className="h-6 w-6"/>
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {isNewRepo ? 'Add New Repository' : 'Edit Repository'}
                    </h1>
                    {!isNewRepo && <p className="text-sm text-gray-500">{repoState.name}</p>}
                </div>
            </div>
            <div className="flex items-center space-x-3">
            <button
                type="button"
                onClick={() => { if (repository) onRefreshState(repository.id); }}
                disabled={isNewRepo}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Refresh
            </button>
            <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Save
            </button>
            </div>
        </div>
        <nav className="mt-4 flex space-x-1 border-b-2 border-transparent">
          {['general', 'tasks', 'links', 'launch', 'releases', 'intelligence'].map(tab => (
            <button
              key={tab}
              disabled={isNewRepo && tab !== 'general'}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors focus:outline-none disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-600 ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </header>
      
      {/* ... Content Panels ... */}
      
    </div>
  );
};
// FIX START: Add default export to resolve import error in App.tsx
export default RepoEditView;
// FIX END
