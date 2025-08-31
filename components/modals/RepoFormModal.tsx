import React, { useState, useEffect } from 'react';
import type { Repository, Task } from '../../types';
import { RepoStatus, BuildHealth } from '../../types';
import { XIcon } from '../icons/XIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';
import TaskFormModal from './TaskFormModal';

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

const RepoFormModal: React.FC<RepoFormModalProps> = ({ isOpen, onClose, onSave, repository }) => {
  const [formData, setFormData] = useState<Repository | Omit<Repository, 'id'>>(NEW_REPO_TEMPLATE);
  const [activeTab, setActiveTab] = useState<'general' | 'tasks'>('general');
  const [isTaskFormOpen, setTaskFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  useEffect(() => {
    if (isOpen) {
        if (repository) {
            setFormData(repository);
        } else {
            setFormData(NEW_REPO_TEMPLATE);
        }
        setActiveTab('general'); // Reset to general tab on open
    }
  }, [repository, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // FIX: The original `handleSubmit` function caused a TypeScript error due to an incorrect type assertion.
  // `repoToSave` was cast to `Repository`, which implies `id` always exists. The subsequent check `!('id' in repoToSave)`
  // created a contradiction, causing TypeScript to infer the type within the `if` block as `never`.
  // The function is refactored to use a type guard (`'id' in formData`) to safely handle new vs. existing repositories.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ('id' in formData) {
      // It's an existing repository we are updating.
      onSave(formData);
    } else {
      // It's a new repository, we need to add an ID.
      const repoToSave: Repository = {
        ...formData,
        id: `repo_${Date.now()}`,
      };
      onSave(repoToSave);
    }
  };

  const handleOpenTaskForm = (task?: Task) => {
    setTaskToEdit(task || null);
    setTaskFormOpen(true);
  };
  
  const handleSaveTask = (task: Task) => {
    setFormData(prev => {
        const currentTasks = 'tasks' in prev ? prev.tasks : [];
        const existing = currentTasks.find(t => t.id === task.id);
        const newTasks = existing 
            ? currentTasks.map(t => t.id === task.id ? task : t)
            : [...currentTasks, task];
        return { ...prev, tasks: newTasks };
    });
    setTaskFormOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
        setFormData(prev => {
            const currentTasks = 'tasks' in prev ? prev.tasks : [];
            return { ...prev, tasks: currentTasks.filter(t => t.id !== taskId) };
        });
    }
  };
  
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-100">
                {repository ? 'Edit Repository' : 'Add New Repository'}
              </h2>
              <button type="button" onClick={onClose} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"><XIcon className="h-6 w-6" /></button>
            </header>
            
            <div className="border-b border-gray-700 flex-shrink-0">
                <nav className="flex space-x-4 px-6">
                    <button type="button" onClick={() => setActiveTab('general')} className={`py-3 px-1 text-sm font-medium ${activeTab === 'general' ? 'border-b-2 border-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}>General</button>
                    <button type="button" onClick={() => setActiveTab('tasks')} className={`py-3 px-1 text-sm font-medium ${activeTab === 'tasks' ? 'border-b-2 border-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}>Tasks</button>
                </nav>
            </div>

            {activeTab === 'general' && (
              <main className="p-6 space-y-4 overflow-y-auto">
                <p className="text-sm text-yellow-400 bg-yellow-900/50 p-3 rounded-md">
                  <strong>Security Warning:</strong> Credentials are stored in plaintext. Use with caution.
                </p>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300">Repository Name</label>
                  <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                <div>
                  <label htmlFor="remoteUrl" className="block text-sm font-medium text-gray-300">Remote URL</label>
                  <input type="url" name="remoteUrl" id="remoteUrl" value={formData.remoteUrl} onChange={handleChange} required className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                <div>
                  <label htmlFor="localPath" className="block text-sm font-medium text-gray-300">Local Clone Path (Conceptual)</label>
                  <input type="text" name="localPath" id="localPath" value={formData.localPath} onChange={handleChange} required className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                <div>
                  <label htmlFor="branch" className="block text-sm font-medium text-gray-300">Branch</label>
                  <input type="text" name="branch" id="branch" value={formData.branch} onChange={handleChange} required className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                <div>
                  <label htmlFor="authType" className="block text-sm font-medium text-gray-300">Authentication</label>
                  <select name="authType" id="authType" value={formData.authType} onChange={handleChange} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500">
                    <option value="none">None</option>
                    <option value="ssh">SSH Key Path</option>
                    <option value="token">HTTPS Token</option>
                  </select>
                </div>
                {formData.authType === 'ssh' && (
                  <div>
                    <label htmlFor="sshKeyPath" className="block text-sm font-medium text-gray-300">SSH Key Path</label>
                    <input type="text" name="sshKeyPath" id="sshKeyPath" value={formData.sshKeyPath} onChange={handleChange} placeholder="e.g., ~/.ssh/id_rsa" className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
                  </div>
                )}
                {formData.authType === 'token' && (
                  <div>
                    <label htmlFor="authToken" className="block text-sm font-medium text-gray-300">HTTPS Token</label>
                    <input type="password" name="authToken" id="authToken" value={formData.authToken} onChange={handleChange} placeholder="Enter your personal access token" className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
                  </div>
                )}
              </main>
            )}

            {activeTab === 'tasks' && (
               <main className="p-6 space-y-4 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <p className="text-gray-400 text-sm">Create automation scripts specific to this repository.</p>
                        <button type="button" onClick={() => handleOpenTaskForm()} className="flex items-center px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 rounded-md">
                            <PlusIcon className="h-4 w-4 mr-1"/>
                            New Task
                        </button>
                    </div>
                    <div className="mt-4 border border-gray-700 rounded-lg">
                        <ul className="divide-y divide-gray-700">
                            {(!formData.tasks || formData.tasks.length === 0) && <li className="px-4 py-4 text-center text-gray-500">No tasks created for this repository.</li>}
                            {formData.tasks?.map(task => (
                                <li key={task.id} className="px-4 py-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-200">{task.name}</p>
                                        <p className="text-xs text-gray-400">{task.steps.length} step(s)</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button type="button" onClick={() => handleOpenTaskForm(task)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full" title="Edit Task">
                                            <PencilIcon className="h-5 w-5"/>
                                        </button>
                                        <button type="button" onClick={() => handleDeleteTask(task.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-full" title="Delete Task">
                                            <TrashIcon className="h-5 w-5"/>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </main>
            )}

            <footer className="flex justify-end p-4 bg-gray-800/50 border-t border-gray-700 space-x-3 flex-shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors">Save Repository</button>
            </footer>
          </form>
        </div>
      </div>
      
      {isTaskFormOpen && (
        <TaskFormModal
            isOpen={isTaskFormOpen}
            onClose={() => setTaskFormOpen(false)}
            onSave={handleSaveTask}
            task={taskToEdit}
        />
      )}
    </>
  );
};

export default RepoFormModal;
