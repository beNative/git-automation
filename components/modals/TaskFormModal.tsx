import React, { useState, useEffect } from 'react';
import type { Task, TaskStep } from '../../types';
import { TaskStepType } from '../../types';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ArrowUpIcon } from '../icons/ArrowUpIcon';
import { ArrowDownIcon } from '../icons/ArrowDownIcon';


interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  task: Task | null;
}

const STEP_TYPE_LABELS: Record<TaskStepType, string> = {
  [TaskStepType.GitPull]: 'Git Pull',
  [TaskStepType.InstallDeps]: 'Install Dependencies',
  [TaskStepType.RunCommand]: 'Run Custom Command',
};

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSave, task }) => {
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<TaskStep[]>([]);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setSteps(task.steps);
    } else {
      setName('');
      setSteps([]);
    }
  }, [task, isOpen]);

  const handleAddStep = () => {
    const newStep: TaskStep = {
      id: `step_${Date.now()}`,
      type: TaskStepType.GitPull,
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter(step => step.id !== id));
  };
  
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };
  
  const handleStepChange = (id: string, newType?: TaskStepType, newCommand?: string) => {
    setSteps(steps.map(step => {
      if (step.id === id) {
        const updatedStep = { ...step };
        if (newType !== undefined) {
          updatedStep.type = newType;
          if (newType !== TaskStepType.RunCommand) {
            delete updatedStep.command;
          }
        }
        if (newCommand !== undefined) {
          updatedStep.command = newCommand;
        }
        return updatedStep;
      }
      return step;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
        alert("Task name cannot be empty.");
        return;
    }
    const taskToSave: Task = {
      id: task?.id || `task_${Date.now()}`,
      name,
      steps,
    };
    onSave(taskToSave);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-100">{task ? 'Edit Task' : 'Create New Task'}</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"><XIcon className="h-6 w-6" /></button>
          </header>

          <main className="p-6 space-y-4 overflow-y-auto">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Task Name</label>
              <input type="text" name="name" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
            </div>
            <div>
              <h3 className="text-md font-medium text-gray-300 mb-2">Steps</h3>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-400">STEP {index + 1}</p>
                        <div className="flex items-center space-x-1">
                            <button type="button" onClick={() => handleMoveStep(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30 text-gray-400 hover:text-white"><ArrowUpIcon className="h-4 w-4"/></button>
                            <button type="button" onClick={() => handleMoveStep(index, 'down')} disabled={index === steps.length - 1} className="p-1 disabled:opacity-30 text-gray-400 hover:text-white"><ArrowDownIcon className="h-4 w-4"/></button>
                            <button type="button" onClick={() => handleRemoveStep(step.id)} className="p-1 text-red-400 hover:text-red-300"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                    </div>
                    <select value={step.type} onChange={(e) => handleStepChange(step.id, e.target.value as TaskStepType)} className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500">
                      {(Object.keys(TaskStepType) as Array<keyof typeof TaskStepType>).map(key => (
                        <option key={key} value={TaskStepType[key]}>{STEP_TYPE_LABELS[TaskStepType[key]]}</option>
                      ))}
                    </select>
                    {step.type === TaskStepType.RunCommand && (
                      <input type="text" placeholder="e.g., npm run build:win" value={step.command || ''} onChange={(e) => handleStepChange(step.id, undefined, e.target.value)} required className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
                    )}
                  </div>
                ))}
                {steps.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No steps added yet.</p>}
              </div>
              <button type="button" onClick={handleAddStep} className="mt-4 flex items-center text-sm text-cyan-400 hover:text-cyan-300">
                <PlusIcon className="h-4 w-4 mr-1"/> Add Step
              </button>
            </div>
          </main>

          <footer className="flex justify-end p-4 bg-gray-800/50 border-t border-gray-700 space-x-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">Save Task</button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default TaskFormModal;
