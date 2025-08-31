import React, { useState, useEffect } from 'react';
import type { GlobalSettings } from '../../types';
import { XIcon } from '../icons/XIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: GlobalSettings) => void;
  currentSettings: GlobalSettings;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentSettings }) => {
  const [settings, setSettings] = useState<GlobalSettings>(currentSettings);

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
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <form onSubmit={handleSubmit}>
          <header className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100">Global Settings</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </header>

          <main className="p-6 space-y-4">
            <div>
              <label htmlFor="defaultPackageManager" className="block text-sm font-medium text-gray-300">Default Package Manager</label>
              <select
                name="defaultPackageManager"
                id="defaultPackageManager"
                value={settings.defaultPackageManager}
                onChange={handleChange}
                className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="npm">npm</option>
                <option value="yarn">yarn</option>
              </select>
            </div>
            <div>
              <label htmlFor="defaultBuildCommand" className="block text-sm font-medium text-gray-300">Default Build Command</label>
              <input
                type="text"
                name="defaultBuildCommand"
                id="defaultBuildCommand"
                value={settings.defaultBuildCommand}
                onChange={handleChange}
                className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="notifications"
                  name="notifications"
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={handleChange}
                  className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-600 rounded bg-gray-900"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="notifications" className="font-medium text-gray-300">Enable Notifications</label>
                <p className="text-gray-500">Show toast notifications for critical events.</p>
              </div>
            </div>
          </main>

          <footer className="flex justify-end p-4 bg-gray-800/50 border-t border-gray-700 space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors">Save Settings</button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
