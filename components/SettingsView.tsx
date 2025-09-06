import React, { useState, useEffect } from 'react';
import type { GlobalSettings } from '../types';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import type { IconSet } from '../contexts/IconContext';
import { CodeBracketIcon } from './icons/CodeBracketIcon';
import JsonConfigView from './JsonConfigView';

interface SettingsViewProps {
  onSave: (settings: GlobalSettings) => void;
  currentSettings: GlobalSettings;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

type SettingsCategory = 'appearance' | 'behavior' | 'jsonConfig';

const SettingsView: React.FC<SettingsViewProps> = ({ onSave, currentSettings, setToast }) => {
  const [settings, setSettings] = useState<GlobalSettings>(currentSettings);
  const [isDirty, setIsDirty] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');

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
  
  const handleThemeChange = (theme: 'light' | 'dark') => {
    setSettings(prev => ({...prev, theme}));
  };
  
  const handleIconSetChange = (iconSet: IconSet) => {
    setSettings(prev => ({...prev, iconSet}));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };
  
  const handleCancel = () => {
      setSettings(currentSettings);
  };

  const iconSetButtonBase = "flex-1 flex items-center justify-center px-3 py-1.5 text-sm rounded-md transition-colors";
  const iconSetButtonActive = "bg-white dark:bg-gray-700 shadow text-blue-700 dark:text-blue-400";
  const iconSetButtonInactive = "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-900/50";
  
  const navLinkBase = "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
  const navLinkActive = "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white";
  const navLinkInactive = "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50";


  return (
    <div className="flex h-full animate-fade-in">
      {/* Left Navigation Sidebar */}
      <aside className="w-1/4 xl:w-1/5 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
        <h2 className="px-3 text-lg font-semibold text-gray-900 dark:text-white mb-4">Settings</h2>
        <nav className="space-y-1">
            <button onClick={() => setActiveCategory('appearance')} className={`${navLinkBase} ${activeCategory === 'appearance' ? navLinkActive : navLinkInactive}`}>
              Appearance
            </button>
            <button onClick={() => setActiveCategory('behavior')} className={`${navLinkBase} ${activeCategory === 'behavior' ? navLinkActive : navLinkInactive}`}>
              Behavior
            </button>
            <button onClick={() => setActiveCategory('jsonConfig')} className={`${navLinkBase} ${activeCategory === 'jsonConfig' ? navLinkActive : navLinkInactive} flex items-center gap-2`}>
              <CodeBracketIcon className="h-5 w-5" />
              JSON Config
            </button>
        </nav>
      </aside>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeCategory === 'jsonConfig' ? (
          <JsonConfigView setToast={setToast} />
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
              {activeCategory === 'appearance' && (
                  <section>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appearance</h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Customize the look and feel of the application.</p>
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
                              <div className="mt-2 flex rounded-md bg-gray-200 dark:bg-gray-900 p-1 max-w-xs">
                                  <button
                                      type="button"
                                      onClick={() => handleThemeChange('light')}
                                      className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm rounded-md ${settings.theme === 'light' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:bg-white/50'}`}
                                  >
                                      <SunIcon className="h-5 w-5 mr-2"/> Light
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => handleThemeChange('dark')}
                                      className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm rounded-md ${settings.theme === 'dark' ? 'bg-gray-700 shadow text-blue-400' : 'text-gray-400 hover:bg-gray-900/50'}`}
                                  >
                                      <MoonIcon className="h-5 w-5 mr-2"/> Dark
                                  </button>
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Icon Set</label>
                              <div className="mt-2 grid grid-cols-3 gap-2 rounded-md bg-gray-200 dark:bg-gray-900 p-2 max-w-md">
                                  <button
                                      type="button"
                                      onClick={() => handleIconSetChange('heroicons')}
                                      className={`${iconSetButtonBase} ${settings.iconSet === 'heroicons' ? iconSetButtonActive : iconSetButtonInactive}`}
                                  >
                                      Heroicons
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => handleIconSetChange('lucide')}
                                      className={`${iconSetButtonBase} ${settings.iconSet === 'lucide' ? iconSetButtonActive : iconSetButtonInactive}`}
                                  >
                                      Lucide
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => handleIconSetChange('tabler')}
                                      className={`${iconSetButtonBase} ${settings.iconSet === 'tabler' ? iconSetButtonActive : iconSetButtonInactive}`}
                                  >
                                      Tabler
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => handleIconSetChange('feather')}
                                      className={`${iconSetButtonBase} ${settings.iconSet === 'feather' ? iconSetButtonActive : iconSetButtonInactive}`}
                                  >
                                      Feather
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => handleIconSetChange('remix')}
                                      className={`${iconSetButtonBase} ${settings.iconSet === 'remix' ? iconSetButtonActive : iconSetButtonInactive}`}
                                  >
                                      Remix
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => handleIconSetChange('phosphor')}
                                      className={`${iconSetButtonBase} ${settings.iconSet === 'phosphor' ? iconSetButtonActive : iconSetButtonInactive}`}
                                  >
                                      Phosphor
                                  </button>
                              </div>
                          </div>
                      </div>
                  </section>
              )}
              {activeCategory === 'behavior' && (
                  <section>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Behavior</h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure how the application functions.</p>
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                          <div className="flex items-start">
                              <div className="flex items-center h-5"><input id="notifications" name="notifications" type="checkbox" checked={settings.notifications} onChange={handleChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded bg-gray-200 dark:bg-gray-900"/></div>
                              <div className="ml-3 text-sm">
                                  <label htmlFor="notifications" className="font-medium text-gray-700 dark:text-gray-300">Enable Notifications</label>
                                  <p className="text-gray-500">Show toast notifications for events like task completion or failure.</p>
                              </div>
                          </div>

                          <div className="flex items-start">
                              <div className="flex items-center h-5"><input id="simulationMode" name="simulationMode" type="checkbox" checked={settings.simulationMode} onChange={handleChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded bg-gray-200 dark:bg-gray-900"/></div>
                              <div className="ml-3 text-sm">
                                  <label htmlFor="simulationMode" className="font-medium text-gray-700 dark:text-gray-300">Enable Simulation Mode</label>
                                  <p className="text-gray-500">If enabled, tasks will be simulated and will not affect your local file system. Disable to run real commands.</p>
                              </div>
                          </div>

                          <div className="flex items-start">
                              <div className="flex items-center h-5"><input id="debugLogging" name="debugLogging" type="checkbox" checked={settings.debugLogging} onChange={handleChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded bg-gray-200 dark:bg-gray-900"/></div>
                              <div className="ml-3 text-sm">
                                  <label htmlFor="debugLogging" className="font-medium text-gray-700 dark:text-gray-300">Enable Debug Logging</label>
                                  <p className="text-gray-500">Enable verbose application logging. Disabling this may improve performance and resolve render loops.</p>
                              </div>
                          </div>
                      </div>
                  </section>
              )}
            </main>
            <footer className="flex justify-end p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 space-x-3 flex-shrink-0">
                <button type="button" onClick={handleCancel} disabled={!isDirty} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Reset
                </button>
                <button type="submit" disabled={!isDirty} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {isDirty ? 'Save Changes' : 'Saved'}
                </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
