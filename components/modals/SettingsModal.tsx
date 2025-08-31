import React, { useState, useEffect } from 'react';
import type { GlobalSettings, Task } from '../../types';
import { XIcon } from '../icons/XIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: GlobalSettings) => void;
  currentSettings: GlobalSettings;
  tasks: Task[];
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddNewTask: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentSettings,
  tasks,
  onEditTask,
  onDeleteTask,
  onAddNewTask,
}) => {
  const [settings, setSettings] = useState<GlobalSettings>(currentSettings);
  const [activeTab, setActiveTab] = useState<'general' | 'tasks'>('general');

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-100">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="border-b border-gray-700 flex-shrink-0">
          <nav className="flex space-x-4 px-6">
            <button onClick={() => setActiveTab('general')} className={`py-3 px-1 text-sm font-medium ${activeTab === 'general' ? 'border-b-2 border-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}>General</button>
            <button onClick={() => setActiveTab('tasks')} className={`py-3 px-1 text-sm font-medium ${activeTab === 'tasks' ? 'border-b-2 border-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}>Tasks</button>
          </nav>
        </div>

        {activeTab === 'general' && (
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <main className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="defaultPackageManager" className="block text-sm font-medium text-gray-300">Default Package Manager</label>
                <select name="defaultPackageManager" id="defaultPackageManager" value={settings.defaultPackageManager} onChange={handleChange} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500">
                  <option value="npm">npm</option>
                  <option value="yarn">yarn</option>
                </select>
              </div>
              <div>
                <label htmlFor="defaultBuildCommand" className="block text-sm font-medium text-gray-300">Default Build Command</label>
                <input type="text" name="defaultBuildCommand" id="defaultBuildCommand" value={settings.defaultBuildCommand} onChange={handleChange} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5"><input id="notifications" name="notifications" type="checkbox" checked={settings.notifications} onChange={handleChange} className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-600 rounded bg-gray-900"/></div>
                <div className="ml-3 text-sm">
                  <label htmlFor="notifications" className="font-medium text-gray-300">Enable Notifications</label>
                  <p className="text-gray-500">Show toast notifications for critical events.</p>
                </div>
              </div>
            </main>
            <footer className="flex justify-end p-4 bg-gray-800/50 border-t border-gray-700 space-x-3 flex-shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors">Save Settings</button>
            </footer>
          </form>
        )}

        {activeTab === 'tasks' && (
          <div className="flex flex-col overflow-hidden">
            <main className="p-6 space-y-4 overflow-y-auto">
                <div className="flex justify-between items-center">
                    <p className="text-gray-400 text-sm">Create and manage custom automation task scripts.</p>
                    <button onClick={onAddNewTask} className="flex items-center px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 rounded-md">
                        <PlusIcon className="h-4 w-4 mr-1"/>
                        New Task
                    </button>
                </div>
                <div className="mt-4 border border-gray-700 rounded-lg">
                    <ul className="divide-y divide-gray-700">
                        {tasks.length === 0 && <li className="px-4 py-4 text-center text-gray-500">No tasks created yet.</li>}
                        {tasks.map(task => (
                            <li key={task.id} className="px-4 py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-200">{task.name}</p>
                                    <p className="text-xs text-gray-400">{task.steps.length} step(s)</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => onEditTask(task.id)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full" title="Edit Task">
                                        <PencilIcon className="h-5 w-5"/>
                                    </button>
                                    <button onClick={() => onDeleteTask(task.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-full" title="Delete Task">
                                        <TrashIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </main>
             <footer className="flex justify-end p-4 bg-gray-800/50 border-t border-gray-700 space-x-3 flex-shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Close</button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
