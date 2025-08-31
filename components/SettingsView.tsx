import React, { useState, useEffect } from 'react';
import type { GlobalSettings } from '../types';

interface SettingsViewProps {
  onSave: (settings: GlobalSettings) => void;
  currentSettings: GlobalSettings;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onSave, currentSettings }) => {
  const [settings, setSettings] = useState<GlobalSettings>(currentSettings);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setSettings(currentSettings);
    setIsDirty(false);
  }, [currentSettings]);
  
  useEffect(() => {
     setIsDirty(JSON.stringify(settings) !== JSON.stringify(currentSettings));
  }, [settings, currentSettings]);


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
  
  const handleCancel = () => {
      setSettings(currentSettings);
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-xl animate-fade-in">
        <div className="p-6 border-b border-gray-700">
            <h1 className="text-2xl font-bold text-white">Global Settings</h1>
            <p className="mt-1 text-gray-400">These settings apply to the entire application.</p>
        </div>
        <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
                <div>
                    <label htmlFor="defaultPackageManager" className="block text-sm font-medium text-gray-300">Default Package Manager</label>
                    <select name="defaultPackageManager" id="defaultPackageManager" value={settings.defaultPackageManager} onChange={handleChange} className="mt-1 block w-full max-w-xs bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500">
                    <option value="npm">npm</option>
                    <option value="yarn">yarn</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">Used by the "Install Dependencies" step in your repository tasks.</p>
                </div>
                
                <div className="flex items-start">
                    <div className="flex items-center h-5"><input id="notifications" name="notifications" type="checkbox" checked={settings.notifications} onChange={handleChange} className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-600 rounded bg-gray-900"/></div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="notifications" className="font-medium text-gray-300">Enable Notifications</label>
                        <p className="text-gray-500">Show toast notifications for events like task completion or failure.</p>
                    </div>
                </div>

                <div className="flex items-start">
                    <div className="flex items-center h-5"><input id="simulationMode" name="simulationMode" type="checkbox" checked={settings.simulationMode} onChange={handleChange} className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-600 rounded bg-gray-900"/></div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="simulationMode" className="font-medium text-gray-300">Enable Simulation Mode</label>
                        <p className="text-gray-500">If enabled, tasks will be simulated and will not affect your local file system. Disable to run real commands.</p>
                    </div>
                </div>
            </div>
            <footer className="flex justify-end p-4 bg-gray-800/50 border-t border-gray-700 space-x-3 rounded-b-lg">
                <button type="button" onClick={handleCancel} disabled={!isDirty} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Reset
                </button>
                <button type="submit" disabled={!isDirty} className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {isDirty ? 'Save Settings' : 'Saved'}
                </button>
            </footer>
        </form>
    </div>
  );
};

export default SettingsView;