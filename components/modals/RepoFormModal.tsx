import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Repository, Task, TaskStep, ProjectSuggestion, GitRepository, SvnRepository, LaunchConfig, Commit, BranchInfo } from '../../types';
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
import { SparklesIcon } from '../icons/SparklesIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { GitBranchIcon } from '../icons/GitBranchIcon';
import { ExclamationCircleIcon } from '../icons/ExclamationCircleIcon';
import { useTooltip } from '../../hooks/useTooltip';
import { useLogger } from '../../hooks/useLogger';


interface RepoEditViewProps {
  onSave: (repository: Repository) => void;
  onCancel: () => void;
  repository: Repository | null;
  onRefreshState: (repoId: string) => Promise<void>;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const NEW_REPO_TEMPLATE: Omit<GitRepository, 'id'> = {
  name: '',
  remoteUrl: '',
  localPath: '',
  branch: 'main',
  status: RepoStatus.Idle,
  lastUpdated: null,
  buildHealth: BuildHealth.Unknown,
  tasks: [],
  vcs: VcsType.Git,
  launchConfigs: [],
};

const STEP_DEFINITIONS: Record<TaskStepType, { label: string; icon: React.ComponentType<{className: string}>; description: string }> = {
  [TaskStepType.GitPull]: { label: 'Git Pull', icon: ArrowDownTrayIcon, description: 'Pull latest changes from remote.' },
  [TaskStepType.GitFetch]: { label: 'Git Fetch', icon: CloudArrowDownIcon, description: 'Fetch updates from remote.' },
  [TaskStepType.GitCheckout]: { label: 'Git Checkout', icon: ArrowRightOnRectangleIcon, description: 'Switch to a specific branch.' },
  [TaskStepType.GitStash]: { label: 'Git Stash', icon: ArchiveBoxIcon, description: 'Stash uncommitted local changes.' },
  [TaskStepType.SvnUpdate]: { label: 'SVN Update', icon: ArrowDownTrayIcon, description: 'Update working copy to latest revision.' },
  [TaskStepType.RunCommand]: { label: 'Run Command', icon: CodeBracketIcon, description: 'Execute a custom shell command.' },
};

// Component for a single step in the TaskStepsEditor
const TaskStepItem: React.FC<{
  step: TaskStep;
  index: number;
  totalSteps: number;
  onStepChange: (id: string, updates: Partial<TaskStep>) => void;
  onMoveStep: (index: number, direction: 'up' | 'down') => void;
  onRemoveStep: (id: string) => void;
  suggestions: ProjectSuggestion[];
}> = ({ step, index, totalSteps, onStepChange, onMoveStep, onRemoveStep, suggestions }) => {
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
          <label
// @ts-ignore
 {...toggleTooltip} className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isEnabled} onChange={(e) => onStepChange(step.id, {enabled: e.target.checked})} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
          <button type="button" onClick={() => onMoveStep(index, 'up')} disabled={index === 0} className="p-1.5 disabled:opacity-30 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><ArrowUpIcon className="h-4 w-4" /></button>
          <button type="button" onClick={() => onMoveStep(index, 'down')} disabled={index === totalSteps - 1} className="p-1.5 disabled:opacity-30 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><ArrowDownIcon className="h-4 w-4" /></button>
          <button type="button" onClick={() => onRemoveStep(step.id)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4" /></button>
        </div>
      </div>
      {step.type === TaskStepType.GitCheckout && (
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Branch Name</label>
          <input type="text" placeholder="e.g., main" value={step.branch || ''} onChange={(e) => onStepChange(step.id, { branch: e.target.value })} required className={formInputStyle} />
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
          <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Task Variables</h3>
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


// Component for editing the steps of a single task
const TaskStepsEditor: React.FC<{
  task: Task;
  setTask: (task: Task) => void;
  repository: Partial<Repository> | null;
}> = ({ task, setTask, repository }) => {
  const logger = useLogger();
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const showOnDashboardTooltip = useTooltip('Show this task as a button on the repository card');
  
  useEffect(() => {
      if (repository?.localPath && repository.name) {
        logger.debug("Fetching project suggestions", { path: repository.localPath });
        window.electronAPI.getProjectSuggestions({ repoPath: repository.localPath, repoName: repository.name })
          .then(s => {
            setSuggestions(s || []);
            logger.info("Project suggestions loaded", { count: s?.length || 0 });
            })
          .catch(error => logger.warn("Could not load project suggestions:", { error }));
      } else {
        setSuggestions([]);
      }
  }, [repository?.localPath, repository?.name, logger]);
  
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
  
  const handleVariablesChange = (vars: Task['variables']) => {
    setTask({ ...task, variables: vars });
  };

  const handleSuggestSteps = async () => {
    if (!repository?.localPath || !repository.name) {
        logger.warn("Cannot suggest steps without a repository path and name.");
        return;
    }
    setIsSuggesting(true);
    try {
        const suggestedStepTemplates = await window.electronAPI.getProjectStepSuggestions({
            repoPath: repository.localPath,
            repoName: repository.name,
        });
        
        if (suggestedStepTemplates && suggestedStepTemplates.length > 0) {
            const newSteps: TaskStep[] = suggestedStepTemplates.map((s, i) => ({
                ...(s as Omit<TaskStep, 'id'>),
                id: `step_${Date.now()}_${i}`,
            }));
            setTask({ ...task, steps: [...task.steps, ...newSteps] });
        }
    } catch (error) {
        logger.error("Failed to get project step suggestions:", { error });
    } finally {
        setIsSuggesting(false);
    }
  };
  
  const availableSteps = useMemo(() => {
    return (Object.keys(STEP_DEFINITIONS) as TaskStepType[]).filter(type => {
        if (repository?.vcs === VcsType.Git) {
            return !type.startsWith('SVN_');
        }
        if (repository?.vcs === VcsType.Svn) {
            return !type.startsWith('GIT_');
        }
        return true; // Should not happen
    });
  }, [repository?.vcs]);

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
          <label
// @ts-ignore
 {...showOnDashboardTooltip} className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={task.showOnDashboard ?? false} onChange={(e) => setTask({...task, showOnDashboard: e.target.checked})} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
      
      <TaskVariablesEditor variables={task.variables} onVariablesChange={handleVariablesChange} />
      
      {task.steps.length === 0 && (
          <div className="text-center py-6 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
              <CubeTransparentIcon className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-800 dark:text-gray-200">This task has no steps.</h3>
              <p className="mt-1 text-xs text-gray-500">Add steps manually or let us suggest a workflow.</p>
              <div className="mt-4">
                  <button
                      type="button"
                      onClick={handleSuggestSteps}
                      disabled={isSuggesting}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50"
                  >
                      <SparklesIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                      {isSuggesting ? 'Analyzing...' : 'Suggest Steps'}
                  </button>
              </div>
          </div>
      )}

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
            suggestions={suggestions}
          />
        ))}
      </div>

      {isAddingStep && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableSteps.map(type => {
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
      )}
      
      <button type="button" onClick={() => setIsAddingStep(p => !p)} className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
        <PlusIcon className="h-4 w-4 mr-1"/> {isAddingStep ? 'Cancel' : 'Add Step'}
      </button>
    </div>
  );
};


const RepoEditView: React.FC<RepoEditViewProps> = ({ onSave, onCancel, repository, onRefreshState, setToast }) => {
  const logger = useLogger();
  
  const [formData, setFormData] = useState<Repository | Omit<Repository, 'id'>>(NEW_REPO_TEMPLATE);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'branches'>('tasks');
  
  // State for History Tab
  const [commits, setCommits] = useState<Commit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isMoreHistoryLoading, setIsMoreHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // State for Branches Tab
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [branchToMerge, setBranchToMerge] = useState('');


  const formInputStyle = "mt-1 block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";
  const formLabelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300";

  const isGitRepo = formData.vcs === VcsType.Git;

  const fetchHistory = useCallback(async (loadMore = false) => {
    if (!repository || !isGitRepo) return;
    
    if (loadMore) {
        setIsMoreHistoryLoading(true);
    } else {
        setHistoryLoading(true);
        setCommits([]); // Clear for initial load/refresh
    }

    const skipCount = loadMore ? commits.length : 0;
    
    try {
        const newCommits = await window.electronAPI.getCommitHistory(repository.localPath, skipCount);
        if(loadMore) {
            setCommits(prev => [...prev, ...newCommits]);
        } else {
            setCommits(newCommits);
        }
        setHasMoreHistory(newCommits.length === 30);
    } catch (e: any) {
        setToast({ message: `Failed to load history: ${e.message}`, type: 'error' });
    } finally {
        setHistoryLoading(false);
        setIsMoreHistoryLoading(false);
    }
  }, [repository, isGitRepo, setToast, commits.length]);

  const fetchBranches = useCallback(async () => {
    if (!repository || !isGitRepo) return;
    setBranchesLoading(true);
    try {
        const branches = await window.electronAPI.listBranches(repository.localPath);
        setBranchInfo(branches);
        if (branches.current) {
            setBranchToMerge(branches.current);
        }
    } catch (e: any) {
        setToast({ message: `Failed to load branches: ${e.message}`, type: 'error' });
    } finally {
        setBranchesLoading(false);
    }
  }, [repository, isGitRepo, setToast]);
  
  useEffect(() => {
    if (repository) {
      setFormData(repository);
      if (repository.tasks && repository.tasks.length > 0) {
        setSelectedTaskId(repository.tasks[0].id);
      } else {
        setSelectedTaskId(null);
      }
    } else {
      setFormData(NEW_REPO_TEMPLATE);
      setSelectedTaskId(null);
    }
    // Reset state when repo changes
    setCommits([]);
    setBranchInfo(null);
    setActiveTab('tasks');
  }, [repository]);
  
  // Fetch data when a tab becomes active
  useEffect(() => {
    if (activeTab === 'history') {
        // Fetch only if it's the first time viewing the tab for this repo
        if (commits.length === 0) {
            fetchHistory(false);
        }
    }
    if (activeTab === 'branches') {
        if (!branchInfo) {
            fetchBranches();
        }
    }
  }, [activeTab, fetchHistory, fetchBranches, commits.length, branchInfo]);


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
    onSave(dataToSave as Repository);
  };

  const handleTaskChange = (updatedTask: Task) => {
    setFormData(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t => t.id === updatedTask.id ? updatedTask : t)
    }));
  };
  
  const handleNewTask = () => {
    const newTask: Task = { id: `task_${Date.now()}`, name: 'New Task', steps: [], variables: [], showOnDashboard: false };
    const newTasks = [...(formData.tasks || []), newTask];
    setFormData(prev => ({ ...prev, tasks: newTasks }));
    setSelectedTaskId(newTask.id);
  };
  
  const handleDeleteTask = (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    const newTasks = (formData.tasks || []).filter(t => t.id !== taskId);
    setFormData(prev => ({ ...prev, tasks: newTasks }));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(newTasks.length > 0 ? newTasks[0].id : null);
    }
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
                if (value === 'command') delete updated.command;
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
    const result = await window.electronAPI.createBranch(repository.localPath, newBranchName.trim());
    if (result.success) {
        setToast({ message: `Branch '${newBranchName.trim()}' created`, type: 'success' });
        setNewBranchName('');
        fetchBranches();
        onRefreshState(repository.id);
    } else {
        setToast({ message: `Error: ${result.error}`, type: 'error' });
    }
  };
  
  const handleDeleteBranch = async (branchName: string, isRemote: boolean) => {
    if (!repository || !window.confirm(`Are you sure you want to delete ${isRemote ? 'remote' : 'local'} branch '${branchName}'?`)) return;
    const result = await window.electronAPI.deleteBranch(repository.localPath, branchName, isRemote);
    if (result.success) {
        setToast({ message: `Branch '${branchName}' deleted`, type: 'success' });
        fetchBranches();
        onRefreshState(repository.id);
    } else {
        setToast({ message: `Error: ${result.error}`, type: 'error' });
    }
  };

  const handleMergeBranch = async () => {
      if (!repository || !branchToMerge) return;
      const currentBranch = branchInfo?.current;
      if (!currentBranch || branchToMerge === currentBranch) {
        setToast({ message: 'Cannot merge a branch into itself.', type: 'info' });
        return;
      }
      if (!window.confirm(`Are you sure you want to merge '${branchToMerge}' into '${currentBranch}'?`)) return;
      
      const result = await window.electronAPI.mergeBranch(repository.localPath, branchToMerge);
      if (result.success) {
          setToast({ message: `Successfully merged '${branchToMerge}' into '${currentBranch}'`, type: 'success' });
          fetchBranches();
          onRefreshState(repository.id);
      } else {
          setToast({ message: `Merge failed: ${result.error}`, type: 'error' });
      }
  };


  const selectedTask = useMemo(() => {
    return formData.tasks?.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, formData.tasks]);
  
  useEffect(() => {
    if (selectedTaskId) {
        const task = formData.tasks?.find(t => t.id === selectedTaskId);
        if (task) { // Ensure task exists before logging
            logger.debug("Selected task changed", { selectedTaskId, taskName: task.name });
        }
    }
  }, [selectedTaskId, JSON.stringify(formData.tasks)]);
  

  const renderTabContent = () => {
    // FIX: Check for 'id' in the formData state to determine if the repo is saved,
    // instead of relying on the initial `repository` prop.
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
                            <button type="button" onClick={handleNewTask} className="flex items-center px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"><PlusIcon className="h-4 w-4 mr-1"/>New</button>
                        </div>
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto">
                            {(!formData.tasks || formData.tasks.length === 0) && <li className="px-4 py-4 text-center text-gray-500 text-sm">No tasks created.</li>}
                            {formData.tasks?.map(task => (
                                <li key={task.id} className={`${selectedTaskId === task.id ? 'bg-blue-500/10' : ''}`}>
                                    <button type="button" onClick={() => setSelectedTaskId(task.id)} className="w-full text-left px-3 py-2 group">
                                        <div className="flex justify-between items-start">
                                            <p className={`font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 ${selectedTaskId === task.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>{task.name}</p>
                                            <button
// @ts-ignore
 {...useTooltip('Delete Task')} type="button" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><TrashIcon className="h-4 w-4"/></button>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{task.steps.length} step(s)</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </aside>
                    <div className="flex-1 p-4 overflow-y-auto">
                        {selectedTask ? (
                            <TaskStepsEditor task={selectedTask} setTask={handleTaskChange} repository={formData as Repository} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                                <CubeTransparentIcon className="h-12 w-12 text-gray-400"/>
                                <h3 className="mt-2 text-lg font-medium">No Task Selected</h3>
                                <p className="mt-1 text-sm">Select a task from the list, or create a new one to begin.</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        case 'history':
            return (
                <div className="flex-1 p-4 overflow-y-auto">
                    {historyLoading ? (<p className="text-center text-gray-500">Loading history...</p>) : commits.length === 0 ? (
                        <p className="text-center text-gray-500">No commits found.</p>
                    ) : (
                        <>
                            <ul className="space-y-3">
                                {commits.map(commit => (
                                    <li key={commit.hash} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <pre className="font-sans whitespace-pre-wrap text-gray-900 dark:text-gray-100">{commit.message}</pre>
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <span>{commit.author}</span>
                                            <span
    // @ts-ignore
     {...useTooltip(commit.hash)} className="font-mono">{commit.shortHash} &bull; {commit.date}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            {hasMoreHistory && (
                                <div className="mt-4 text-center">
                                    <button
                                    type="button"
                                    onClick={() => fetchHistory(true)}
                                    disabled={isMoreHistoryLoading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
                                    >
                                    {isMoreHistoryLoading ? 'Loading...' : 'Load More'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            );
        case 'branches':
            return (
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                     {branchesLoading ? (<p>Loading branches...</p>) : branchInfo && (
                         <>
                            {/* Create Branch */}
                            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold">Create New Branch</h3>
                                <div className="flex items-center space-x-2 mt-2">
                                    <input type="text" value={newBranchName} onChange={e => setNewBranchName(e.target.value)} placeholder="new-feature-branch" className={`${formInputStyle} mt-0`} />
                                    <button type="button" onClick={handleCreateBranch} className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md">Create</button>
                                </div>
                            </div>
                            {/* Merge Branch */}
                            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold">Merge Branch</h3>
                                <p className="text-xs text-gray-500">Merge a branch into the current branch ({branchInfo.current})</p>
                                <div className="flex items-center space-x-2 mt-2">
                                    <select value={branchToMerge} onChange={e => setBranchToMerge(e.target.value)} className={`${formInputStyle} mt-0`}>
                                        {branchInfo.local.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                    <button type="button" onClick={handleMergeBranch} className="px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md">Merge</button>
                                </div>
                            </div>
                             {/* Branch Lists */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Local Branches</h3>
                                    <ul className="space-y-1">
                                        {branchInfo.local.map(b => (
                                            <li key={b} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md">
                                                <span className={`${b === branchInfo.current ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}>{b}</span>
                                                {b !== branchInfo.current && <button onClick={() => handleDeleteBranch(b, false)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4"/></button>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Remote Branches</h3>
                                    <ul className="space-y-1">
                                        {branchInfo.remote.map(b => (
                                            <li key={b} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md">
                                                <span>{b}</span>
                                                <button onClick={() => handleDeleteBranch(b, true)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4"/></button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                         </>
                     )}
                </div>
            );
        default: return null;
    }
  }
  

  return (
    <div className="flex flex-col bg-gray-100 dark:bg-gray-900 animate-fade-in h-full">
      <header className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeftIcon className="h-5 w-5 mr-1"/> Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {repository ? 'Edit Repository' : 'Add New Repository'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Save Repository</button>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left: General Settings */}
        <aside className="w-1/3 xl:w-1/4 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto space-y-3 bg-white dark:bg-gray-800">
            <h2 className="text-lg font-semibold">General Settings</h2>
            
            <div><label htmlFor="vcs" className={formLabelStyle}>Version Control System</label><select name="vcs" id="vcs" value={formData.vcs} onChange={handleVcsChange} className={formInputStyle}><option value="git">Git</option><option value="svn">SVN (Subversion)</option></select></div>
            
            <div><label htmlFor="name" className={formLabelStyle}>Repository Name</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={formInputStyle}/></div>
            <div><label htmlFor="remoteUrl" className={formLabelStyle}>Remote URL</label><input type="url" name="remoteUrl" id="remoteUrl" value={formData.remoteUrl} onChange={handleChange} required className={formInputStyle}/></div>
            <div><label htmlFor="localPath" className={formLabelStyle}>Local Path</label><input type="text" name="localPath" id="localPath" value={formData.localPath} onChange={handleChange} required className={formInputStyle}/></div>
            
            {formData.vcs === 'git' && (
              <>
                <div><label htmlFor="branch" className={formLabelStyle}>Default Branch</label><input type="text" name="branch" id="branch" value={(formData as GitRepository).branch} onChange={handleChange} required className={formInputStyle}/></div>
              </>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <h2 className="text-lg font-semibold">Launch Configurations</h2>
              <div className="space-y-2 mt-2">
                {(formData.launchConfigs || []).map(config => (
                  <div key={config.id} className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border dark:border-gray-700 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder="Name" value={config.name} onChange={e => handleUpdateLaunchConfig(config.id, 'name', e.target.value)} className={`${formInputStyle} flex-grow mt-0`} />
                      <button type="button" onClick={() => handleRemoveLaunchConfig(config.id)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full flex-shrink-0"><TrashIcon className="h-4 w-4"/></button>
                    </div>
                    
                    <select value={config.type} onChange={e => handleUpdateLaunchConfig(config.id, 'type', e.target.value)} className={`${formInputStyle} mt-0`}>
                      <option value="command">Run a Command</option>
                      <option value="select-executable">Select an Executable</option>
                    </select>

                    {config.type === 'command' && (
                      <input type="text" placeholder="e.g., code . or npm start" value={config.command || ''} onChange={e => handleUpdateLaunchConfig(config.id, 'command', e.target.value)} className={`${formInputStyle} font-mono mt-0`} />
                    )}

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Show on card</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={config.showOnDashboard ?? false} 
                                onChange={e => handleUpdateLaunchConfig(config.id, 'showOnDashboard', e.target.checked)} 
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddLaunchConfig} className="mt-3 flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                <PlusIcon className="h-4 w-4 mr-1"/> Add Launch Config
              </button>
            </div>
            
        </aside>

        {/* Right: Tabbed View */}
        <div className="flex-1 flex flex-col overflow-hidden">
             <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${activeTab === 'tasks' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}><CubeTransparentIcon className="h-5 w-5"/>Tasks</button>
                {isGitRepo && (
                    <>
                        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}><DocumentTextIcon className="h-5 w-5"/>History</button>
                        <button onClick={() => setActiveTab('branches')} className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${activeTab === 'branches' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}><GitBranchIcon className="h-5 w-5"/>Branches</button>
                    </>
                )}
            </div>
            {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default RepoEditView;