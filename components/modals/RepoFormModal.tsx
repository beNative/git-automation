import React, { useState, useEffect } from 'react';
import type { Repository, Task, TaskStep } from '../../types';
import { RepoStatus, BuildHealth, TaskStepType } from '../../types';
import { XIcon } from '../icons/XIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ArrowUpIcon } from '../icons/ArrowUpIcon';
import { ArrowDownIcon } from '../icons/ArrowDownIcon';

interface RepoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (repository: Repository) => void;
  repository: Repository | null;
}

const NEW_REPO_TEMPLATE: Omit<Repository, 'id'> = {
  name: '',
  remoteUrl: '',
  localPath: '',
  branch: 'main',
  authType: 'none',
  authToken: '',
  sshKeyPath: '',
  status: RepoStatus.Idle,
  lastUpdated: null,
  buildHealth: BuildHealth.Unknown,
  tasks: [],
};

const STEP_TYPE_LABELS: Record<TaskStepType, string> = {
  [TaskStepType.GitPull]: 'Git Pull',
  [TaskStepType.InstallDeps]: 'Install Dependencies',
  [TaskStepType.RunCommand]: 'Run Command',
};

const PREDEFINED_COMMAND_GROUPS = [
    {
        label: "NPM Scripts",
        commands: { 'npm run build': 'Build', 'npm run start': 'Start', 'npm run test': 'Test' }
    },
    {
        label: "Yarn Scripts",
        commands: { 'yarn build': 'Build', 'yarn start': 'Start', 'yarn test': 'Test' }
    },
    {
        label: "Application",
        commands: { 'electron-builder': 'Package with electron-builder', 'electron .': 'Run unpacked with electron' }
    }
];
const PREDEFINED_VALUES = PREDEFINED_COMMAND_GROUPS.flatMap(group => Object.keys(group.commands));
const CUSTOM_COMMAND_VALUE = 'custom_command';

const TaskEditor: React.FC<{
  task: Task;
  onSave: (task: Task) => void;
  onCancel: () => void;
  repository: Partial<Repository> | null;
}> = ({ task, onSave, onCancel, repository }) => {
    const [editedTask, setEditedTask] = useState<Task>(task);
    const [detectedScripts, setDetectedScripts] = useState<string[]>([]);
    const [isLoadingScripts, setIsLoadingScripts] = useState(false);

    useEffect(() => {
        setEditedTask(task);
    }, [task]);

    useEffect(() => {
        if (repository?.localPath) {
          setIsLoadingScripts(true);
          setDetectedScripts([]);
          window.electronAPI.getPackageScripts(repository.localPath)
            .then(scripts => setDetectedScripts(scripts || []))
            .catch(error => console.warn("Could not load package.json scripts:", error))
            .finally(() => setIsLoadingScripts(false));
        } else {
          setDetectedScripts([]);
        }
    }, [repository?.localPath]);

    const handleStepChange = (id: string, newType?: TaskStepType, newCommand?: string) => {
        setEditedTask(prev => ({
            ...prev,
            steps: prev.steps.map(step => {
                if (step.id === id) {
                    const updatedStep = { ...step };
                    if (newType !== undefined) {
                        updatedStep.type = newType;
                        if (newType !== TaskStepType.RunCommand) delete updatedStep.command;
                        else {
                             const defaultCommand = detectedScripts.includes('build') ? 'npm run build' : detectedScripts.length > 0 ? `npm run ${detectedScripts[0]}` : 'npm run build';
                             updatedStep.command = defaultCommand;
                        }
                    }
                    if (newCommand !== undefined) updatedStep.command = newCommand;
                    return updatedStep;
                }
                return step;
            })
        }));
    };

    const handleAddStep = () => {
        const newStep: TaskStep = { id: `step_${Date.now()}`, type: TaskStepType.GitPull };
        setEditedTask(prev => ({...prev, steps: [...prev.steps, newStep]}));
    };

    const handleRemoveStep = (id: string) => {
        setEditedTask(prev => ({...prev, steps: prev.steps.filter(s => s.id !== id)}));
    };

    const handleMoveStep = (index: number, direction: 'up' | 'down') => {
        const newSteps = [...editedTask.steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newSteps.length) return;
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        setEditedTask(prev => ({ ...prev, steps: newSteps }));
    };

    const handleSubmit = () => {
        if (!editedTask.name) {
            alert("Task name cannot be empty.");
            return;
        }
        onSave(editedTask);
    };
    
    const formSelectStyle = "block w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500";
    const formInputStyle = "block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500";

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Name</label>
                <input type="text" value={editedTask.name} onChange={(e) => setEditedTask(prev => ({ ...prev, name: e.target.value }))} required className={`mt-1 ${formInputStyle}`} />
            </div>
            <div>
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Steps</h3>
                <div className="space-y-3">
                    {editedTask.steps.map((step, index) => (
                        <div key={step.id} className="bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">STEP {index + 1}</p>
                                <div className="flex items-center space-x-1">
                                    <button type="button" onClick={() => handleMoveStep(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><ArrowUpIcon className="h-4 w-4" /></button>
                                    <button type="button" onClick={() => handleMoveStep(index, 'down')} disabled={index === editedTask.steps.length - 1} className="p-1 disabled:opacity-30 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><ArrowDownIcon className="h-4 w-4" /></button>
                                    <button type="button" onClick={() => handleRemoveStep(step.id)} className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <select value={step.type} onChange={(e) => handleStepChange(step.id, e.target.value as TaskStepType)} className={formSelectStyle}>
                                {(Object.keys(TaskStepType) as Array<keyof typeof TaskStepType>).map(key => (
                                    <option key={key} value={TaskStepType[key]}>{STEP_TYPE_LABELS[TaskStepType[key]]}</option>
                                ))}
                            </select>
                            {step.type === TaskStepType.RunCommand && (() => {
                                const allPredefined = [...PREDEFINED_VALUES, ...detectedScripts.flatMap(s => [`npm run ${s}`, `yarn ${s}`])];
                                const isCustom = !allPredefined.includes(step.command || '');
                                const selectValue = isCustom ? CUSTOM_COMMAND_VALUE : step.command;
                                return (
                                    <div className="space-y-2">
                                        <select value={selectValue} onChange={(e) => handleStepChange(step.id, undefined, e.target.value === CUSTOM_COMMAND_VALUE ? '' : e.target.value)} className={formSelectStyle}>
                                            {(isLoadingScripts || detectedScripts.length > 0) && (
                                                <optgroup label="Detected Scripts">
                                                    {isLoadingScripts && <option disabled>Loading...</option>}
                                                    {detectedScripts.map(script => <option key={`npm-${script}`} value={`npm run ${script}`}>{`npm run ${script}`}</option>)}
                                                    {detectedScripts.map(script => <option key={`yarn-${script}`} value={`yarn ${script}`}>{`yarn ${script}`}</option>)}
                                                </optgroup>
                                            )}
                                            {PREDEFINED_COMMAND_GROUPS.map(group => (
                                                <optgroup key={group.label} label={group.label}>
                                                    {Object.entries(group.commands).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                                </optgroup>
                                            ))}
                                            <option value={CUSTOM_COMMAND_VALUE}>Custom Command...</option>
                                        </select>
                                        {isCustom && <input type="text" placeholder="e.g., npm run build:win" value={step.command || ''} onChange={(e) => handleStepChange(step.id, undefined, e.target.value)} required className={`${formSelectStyle}`} />}
                                    </div>
                                );
                            })()}
                        </div>
                    ))}
                    {editedTask.steps.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No steps added yet.</p>}
                </div>
                <button type="button" onClick={handleAddStep} className="mt-2 flex items-center text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300">
                    <PlusIcon className="h-4 w-4 mr-1" /> Add Step
                </button>
            </div>
            <div className="flex justify-end space-x-2 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Cancel</button>
                <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save Task</button>
            </div>
        </div>
    );
};


const RepoFormModal: React.FC<RepoFormModalProps> = ({ isOpen, onClose, onSave, repository }) => {
  const [formData, setFormData] = useState<Repository | Omit<Repository, 'id'>>(NEW_REPO_TEMPLATE);
  const [activeTab, setActiveTab] = useState<'general' | 'tasks'>('general');
  const [selectedTaskId, setSelectedTaskId] = useState<string | 'new' | null>(null);

  useEffect(() => {
    if (isOpen) {
        if (repository) setFormData(repository);
        else setFormData(NEW_REPO_TEMPLATE);
        setActiveTab('general');
        setSelectedTaskId(null);
    }
  }, [repository, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ('id' in formData) onSave(formData);
    else onSave({ ...formData, id: `repo_${Date.now()}` });
  };

  const handleSaveTask = (task: Task) => {
    setFormData(prev => {
        const currentTasks = 'tasks' in prev ? prev.tasks : [];
        const isExisting = currentTasks.some(t => t.id === task.id);
        const newTasks = isExisting 
            ? currentTasks.map(t => (t.id === task.id ? task : t))
            : [...currentTasks, task];
        return { ...prev, tasks: newTasks };
    });
    setSelectedTaskId(null);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
        setFormData(prev => {
            const currentTasks = 'tasks' in prev ? prev.tasks : [];
            return { ...prev, tasks: currentTasks.filter(t => t.id !== taskId) };
        });
        if (selectedTaskId === taskId) setSelectedTaskId(null);
    }
  };
  
  if (!isOpen) return null;

  const formInputStyle = "mt-1 block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500";
  const formLabelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300";

  const getTaskToEdit = (): Task | null => {
      if (selectedTaskId === 'new') return { id: `task_${Date.now()}`, name: 'New Task', steps: [] };
      if (selectedTaskId) return formData.tasks?.find(t => t.id === selectedTaskId) || null;
      return null;
  };
  const taskToEdit = getTaskToEdit();

  return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{repository ? 'Edit Repository' : 'Add New Repository'}</h2>
              <button type="button" onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"><XIcon className="h-6 w-6" /></button>
            </header>
            
            <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <nav className="flex space-x-4 px-6">
                    <button type="button" onClick={() => setActiveTab('general')} className={`py-3 px-1 text-sm font-medium ${activeTab === 'general' ? 'border-b-2 border-cyan-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>General</button>
                    <button type="button" onClick={() => setActiveTab('tasks')} className={`py-3 px-1 text-sm font-medium ${activeTab === 'tasks' ? 'border-b-2 border-cyan-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>Tasks</button>
                </nav>
            </div>

            {activeTab === 'general' && (
              <main className="p-6 space-y-4 overflow-y-auto">
                <p className="text-sm text-yellow-800 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-md"><strong>Security Warning:</strong> Credentials are stored in plaintext. Use with caution.</p>
                <div><label htmlFor="name" className={formLabelStyle}>Repository Name</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={formInputStyle}/></div>
                <div><label htmlFor="remoteUrl" className={formLabelStyle}>Remote URL</label><input type="url" name="remoteUrl" id="remoteUrl" value={formData.remoteUrl} onChange={handleChange} required className={formInputStyle}/></div>
                <div><label htmlFor="localPath" className={formLabelStyle}>Local Clone Path</label><input type="text" name="localPath" id="localPath" value={formData.localPath} onChange={handleChange} required className={formInputStyle}/></div>
                <div><label htmlFor="branch" className={formLabelStyle}>Branch</label><input type="text" name="branch" id="branch" value={formData.branch} onChange={handleChange} required className={formInputStyle}/></div>
                <div><label htmlFor="authType" className={formLabelStyle}>Authentication</label><select name="authType" id="authType" value={formData.authType} onChange={handleChange} className={formInputStyle}><option value="none">None</option><option value="ssh">SSH Key Path</option><option value="token">HTTPS Token</option></select></div>
                {formData.authType === 'ssh' && (<div><label htmlFor="sshKeyPath" className={formLabelStyle}>SSH Key Path</label><input type="text" name="sshKeyPath" id="sshKeyPath" value={formData.sshKeyPath || ''} onChange={handleChange} placeholder="e.g., ~/.ssh/id_rsa" className={formInputStyle}/></div>)}
                {formData.authType === 'token' && (<div><label htmlFor="authToken" className={formLabelStyle}>HTTPS Token</label><input type="password" name="authToken" id="authToken" value={formData.authToken || ''} onChange={handleChange} placeholder="Enter your personal access token" className={formInputStyle}/></div>)}
              </main>
            )}

            {activeTab === 'tasks' && (
               <main className="flex-1 flex overflow-hidden">
                    <aside className="w-1/3 xl:w-1/4 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                        <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Tasks</h3>
                            <button type="button" onClick={() => setSelectedTaskId('new')} className="flex items-center px-3 py-1 text-sm text-white bg-cyan-600 hover:bg-cyan-700 rounded-md"><PlusIcon className="h-4 w-4 mr-1"/>New</button>
                        </div>
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto">
                            {(!formData.tasks || formData.tasks.length === 0) && <li className="px-4 py-4 text-center text-gray-500 text-sm">No tasks created.</li>}
                            {formData.tasks?.map(task => (
                                <li key={task.id} className={`${selectedTaskId === task.id ? 'bg-cyan-500/10' : ''}`}>
                                    <button type="button" onClick={() => setSelectedTaskId(task.id)} className="w-full text-left px-4 py-3 group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className={`font-medium group-hover:text-cyan-600 dark:group-hover:text-cyan-400 ${selectedTaskId === task.id ? 'text-cyan-700 dark:text-cyan-400' : 'text-gray-800 dark:text-gray-200'}`}>{task.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{task.steps.length} step(s)</p>
                                            </div>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" title="Delete Task"><TrashIcon className="h-4 w-4"/></button>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </aside>
                    <div className="flex-1 p-6 overflow-y-auto">
                        {taskToEdit ? (
                            <TaskEditor task={taskToEdit} onSave={handleSaveTask} onCancel={() => setSelectedTaskId(null)} repository={formData as Repository}/>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                <p>Select a task to edit, or create a new one.</p>
                            </div>
                        )}
                    </div>
                </main>
            )}

            <footer className="flex justify-end p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 space-x-3 flex-shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors">Save Repository</button>
            </footer>
          </form>
        </div>
      </div>
  );
};

export default RepoFormModal;
