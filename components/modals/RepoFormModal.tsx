import React, { useState, useEffect, useMemo } from 'react';
import type { Repository, Task, TaskStep, ProjectSuggestion, GitRepository, SvnRepository, LaunchConfig } from '../../types';
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


interface RepoEditViewProps {
  onSave: (repository: Repository) => void;
  onCancel: () => void;
  repository: Repository | null;
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
  [TaskStepType.InstallDeps]: { label: 'Install Dependencies', icon: CubeTransparentIcon, description: 'Run npm/yarn install.' },
  [TaskStepType.RunTests]: { label: 'Run Tests', icon: BeakerIcon, description: 'Run npm/yarn test.' },
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
  const { label, icon: Icon } = STEP_DEFINITIONS[step.type];
  const formInputStyle = "mt-1 block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";
  const CUSTOM_COMMAND_VALUE = 'custom_command';
  const isEnabled = step.enabled ?? true;

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
          <label className="relative inline-flex items-center cursor-pointer" title={isEnabled ? 'Disable Step' : 'Enable Step'}>
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
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
      if (repository?.localPath && repository.name) {
        window.electronAPI.getProjectSuggestions({ repoPath: repository.localPath, repoName: repository.name })
          .then(s => setSuggestions(s || []))
          .catch(error => console.warn("Could not load project suggestions:", error));
      } else {
        setSuggestions([]);
      }
  }, [repository?.localPath, repository?.name]);
  
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
        console.warn("Cannot suggest steps without a repository path and name.");
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
        console.error("Failed to get project step suggestions:", error);
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
          <label className="relative inline-flex items-center cursor-pointer" title="Show this task as a button on the repository card">
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


const RepoEditView: React.FC<RepoEditViewProps> = ({ onSave, onCancel, repository }) => {
  const [formData, setFormData] = useState<Repository | Omit<Repository, 'id'>>(NEW_REPO_TEMPLATE);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (repository) {
      setFormData(repository);
      // When the repository prop changes, always reset the selected task.
      if (repository.tasks && repository.tasks.length > 0) {
        setSelectedTaskId(repository.tasks[0].id);
      } else {
        setSelectedTaskId(null);
      }
    } else {
      // This is for creating a new repository.
      setFormData(NEW_REPO_TEMPLATE);
      setSelectedTaskId(null);
    }
  }, [repository]);

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
    setFormData(prev => ({ ...prev, tasks: (prev.tasks || []).filter(t => t.id !== taskId) }));
    if (selectedTaskId === taskId) {
      const remainingTasks = (formData.tasks || []).filter(t => t.id !== taskId);
      setSelectedTaskId(remainingTasks.length > 0 ? remainingTasks[0].id : null);
    }
  };

  const handleAddLaunchConfig = () => {
    const newConfig: LaunchConfig = { id: `lc_${Date.now()}`, name: 'New Launch', command: '', showOnDashboard: false };
    setFormData(prev => ({...prev, launchConfigs: [...(prev.launchConfigs || []), newConfig]}));
  };

  const handleUpdateLaunchConfig = (id: string, field: keyof LaunchConfig, value: string | boolean) => {
    setFormData(prev => ({
        ...prev,
        launchConfigs: (prev.launchConfigs || []).map(lc => lc.id === id ? {...lc, [field]: value} : lc)
    }));
  };

  const handleRemoveLaunchConfig = (id: string) => {
    setFormData(prev => ({
        ...prev,
        launchConfigs: (prev.launchConfigs || []).filter(lc => lc.id !== id)
    }));
  };

  const formInputStyle = "mt-1 block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";
  const formLabelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300";
  
  const selectedTask = useMemo(() => {
    return formData.tasks?.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, formData.tasks]);

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 animate-fade-in">
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
                <div><label htmlFor="branch" className={formLabelStyle}>Branch</label><input type="text" name="branch" id="branch" value={(formData as GitRepository).branch} onChange={handleChange} required className={formInputStyle}/></div>
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
                    <input type="text" placeholder="e.g., code . or npm start" value={config.command} onChange={e => handleUpdateLaunchConfig(config.id, 'command', e.target.value)} className={`${formInputStyle} font-mono mt-0`} />
                    <div className="flex items-center">
                      <input id={`show-${config.id}`} type="checkbox" checked={config.showOnDashboard} onChange={e => handleUpdateLaunchConfig(config.id, 'showOnDashboard', e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      <label htmlFor={`show-${config.id}`} className="ml-2 text-sm text-gray-600 dark:text-gray-400">Show on card</label>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddLaunchConfig} className="mt-3 flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                <PlusIcon className="h-4 w-4 mr-1"/> Add Launch Config
              </button>
            </div>
            
        </aside>

        {/* Right: Task Editor */}
        <main className="flex-1 flex overflow-hidden">
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
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" title="Delete Task"><TrashIcon className="h-4 w-4"/></button>
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
        </main>
      </div>
    </div>
  );
};

export default RepoEditView;
