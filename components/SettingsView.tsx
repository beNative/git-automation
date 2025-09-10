import React, { useState, useEffect } from 'react';
import type { GlobalSettings } from '../types';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import type { IconSet } from '../types';
import { CodeBracketIcon } from './icons/CodeBracketIcon';
import JsonConfigView from './JsonConfigView';
import { FolderOpenIcon } from './icons/FolderOpenIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { useTooltip } from '../hooks/useTooltip';
import { ClipboardDocumentIcon } from './icons/ClipboardDocumentIcon';

interface SettingsViewProps {
  onSave: (settings: GlobalSettings) => void;
  currentSettings: GlobalSettings;
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
}

type SettingsCategory = 'appearance' | 'behavior' | 'jsonConfig';

const SettingsView: React.FC<SettingsViewProps> = ({ onSave, currentSettings, setToast, confirmAction }) => {
  const [settings, setSettings] = useState<GlobalSettings>(currentSettings);
  const [isDirty, setIsDirty] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const [taskLogDisplayPath, setTaskLogDisplayPath] = useState('Loading...');

  useEffect(() => {
    setSettings(currentSettings);
    setIsDirty(false);
  }, [currentSettings]);
  
  useEffect(() => {
     setIsDirty(JSON.stringify(settings) !== JSON.stringify(currentSettings));
  }, [settings, currentSettings]);

  useEffect(() => {
    if (activeCategory === 'behavior') {
      window.electronAPI.getTaskLogPath().then(setTaskLogDisplayPath);
    }
  }, [activeCategory, settings.taskLogPath]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    // FIX: Destructure from the uncasted e.target first.
    const { name, value, type } = e.target;
    let finalValue: string | number | boolean = value;

    if (type === 'checkbox') {
        // Cast to HTMLInputElement here where we know it's a checkbox.
        finalValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'range' || type === 'number') {
        finalValue = parseFloat(value);
    }
    
    setSettings(prev => ({
      ...prev,
      [name]: finalValue,
    }));
  };
  
  const handleThemeChange = (theme: 'light' | 'dark') => {
    setSettings(prev => ({...prev, theme}));
  };
  
  const handleIconSetChange = (iconSet: IconSet) => {
    setSettings(prev => ({...prev, iconSet}));
  };

  const handleBrowserChange = (browser: GlobalSettings['openLinksIn']) => {
    setSettings(prev => ({...prev, openLinksIn: browser}));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };
  
  const handleCancel = () => {
      setSettings(currentSettings);
  };
  
  const handleBrowse = async (vcsType: 'git' | 'svn') => {
    const result = await window.electronAPI.showFilePicker();
    if (!result.canceled && result.filePaths.length > 0) {
        const path = result.filePaths[0];
        setSettings(prev => ({
            ...prev,
            [vcsType === 'git' ? 'gitExecutablePath' : 'svnExecutablePath']: path,
        }));
    }
  };

  const handleAutodetect = async (vcsType: 'git' | 'svn') => {
      const path = await window.electronAPI.autodetectExecutablePath(vcsType);
      if (path) {
          setSettings(prev => ({
              ...prev,
              [vcsType === 'git' ? 'gitExecutablePath' : 'svnExecutablePath']: path,
          }));
          setToast({ message: `${vcsType.toUpperCase()} executable found at: ${path}`, type: 'success' });
      } else {
          setToast({ message: `Could not automatically find ${vcsType.toUpperCase()} executable in system PATH.`, type: 'info' });
      }
  };

  const handleTest = async (vcsType: 'git' | 'svn') => {
      const path = vcsType === 'git' ? settings.gitExecutablePath : settings.svnExecutablePath;
      if (!path) {
          const result = await window.electronAPI.testExecutablePath({ path: vcsType, vcsType });
          if (result.success) {
            setToast({ message: `Success! Found in PATH. Version: ${result.version}`, type: 'success' });
          } else {
            setToast({ message: `Executable not found in PATH and no custom path is set.`, type: 'error' });
          }
          return;
      }
      const result = await window.electronAPI.testExecutablePath({ path, vcsType });
      if (result.success) {
          setToast({ message: `Success! Version: ${result.version}`, type: 'success' });
      } else {
          setToast({ message: `Test failed: ${result.error}`, type: 'error' });
      }
  };
  
  const handleCopyPat = () => {
    if (settings.githubPat) {
        navigator.clipboard.writeText(settings.githubPat).then(() => {
            setToast({ message: 'GitHub PAT copied to clipboard!', type: 'success' });
        }).catch(err => {
            setToast({ message: `Failed to copy: ${err}`, type: 'error' });
        });
    }
  };

  const handleChangeTaskLogPath = async () => {
    const result = await window.electronAPI.selectTaskLogPath();
    if (!result.canceled && result.path) {
      setSettings(prev => ({ ...prev, taskLogPath: result.path! }));
    }
  };


  const iconSetButtonBase = "flex-1 flex items-center justify-center px-3 py-1.5 text-sm rounded-md transition-colors";
  const iconSetButtonActive = "bg-white dark:bg-gray-700 shadow text-blue-700 dark:text-blue-400";
  const iconSetButtonInactive = "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-900/50";
  
  const navLinkBase = "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
  const navLinkActive = "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white";
  const navLinkInactive = "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50";
  
  const formInputStyle = "block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";
  const actionButtonStyle = "p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 text-gray-600 dark:text-gray-300";


  return (
    <div className="flex h-full animate-fade-in">
      {/* Left Navigation Sidebar */}
      <aside className="w-1/4 xl:w-1/5 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
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
          <JsonConfigView setToast={setToast} confirmAction={confirmAction} />
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
                               <label htmlFor="zoomFactor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">GUI Scale ({Math.round(settings.zoomFactor * 100)}%)</label>
                               <input
                                   type="range"
                                   id="zoomFactor"
                                   name="zoomFactor"
                                   min="0.5"
                                   max="2"
                                   step="0.05"
                                   value={settings.zoomFactor}
                                   onChange={handleChange}
                                   className="mt-2 w-full max-w-xs h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                               />
                           </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Icon Set</label>
                              <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-gray-200 dark:bg-gray-900 p-2 max-w-xs">
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
                              </div>
                          </div>
                      </div>
                  </section>
              )}
              {activeCategory === 'behavior' && (
                  <section>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Behavior</h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure how the application functions.</p>
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-6">
                          <div>
                              <label htmlFor="githubPat" className="block text-sm font-medium text-gray-700 dark:text-gray-300">GitHub Personal Access Token</label>
                              <div className="mt-1 flex items-center gap-2 max-w-md">
                                <input
                                    type="password"
                                    id="githubPat"
                                    name="githubPat"
                                    value={settings.githubPat || ''}
                                    onChange={handleChange}
                                    className="block w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button type="button" onClick={handleCopyPat} className={actionButtonStyle} title="Copy PAT">
                                    <ClipboardDocumentIcon className="h-5 w-5"/>
                                </button>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">Required to view drafts and manage releases. <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Create a fine-grained token</a> with `Read &amp; write` access to `Contents`.</p>
                          </div>

                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Open Web Links In</label>
                              <div className="mt-2 flex rounded-md bg-gray-200 dark:bg-gray-900 p-1 max-w-md">
                                  <button type="button" onClick={() => handleBrowserChange('default')} className={`${iconSetButtonBase} ${settings.openLinksIn === 'default' ? iconSetButtonActive : iconSetButtonInactive}`}>System Default</button>
                                  <button type="button" onClick={() => handleBrowserChange('chrome')} className={`${iconSetButtonBase} ${settings.openLinksIn === 'chrome' ? iconSetButtonActive : iconSetButtonInactive}`}>Chrome</button>
                                  <button type="button" onClick={() => handleBrowserChange('firefox')} className={`${iconSetButtonBase} ${settings.openLinksIn === 'firefox' ? iconSetButtonActive : iconSetButtonInactive}`}>Firefox</button>
                              </div>
                          </div>

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
                              <div className="flex items-center h-5"><input id="allowPrerelease" name="allowPrerelease" type="checkbox" checked={settings.allowPrerelease} onChange={handleChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded bg-gray-200 dark:bg-gray-900"/></div>
                              <div className="ml-3 text-sm">
                                  <label htmlFor="allowPrerelease" className="font-medium text-gray-700 dark:text-gray-300">Check for Pre-Releases</label>
                                  <p className="text-gray-500">If enabled, the auto-updater will include beta versions when checking for updates.</p>
                              </div>
                          </div>

                          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Logging</h3>
                            <div className="mt-4 space-y-4 max-w-2xl">
                                <div className="flex items-start">
                                    <div className="flex items-center h-5"><input id="saveTaskLogs" name="saveTaskLogs" type="checkbox" checked={settings.saveTaskLogs} onChange={handleChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded bg-gray-200 dark:bg-gray-900"/></div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor="saveTaskLogs" className="font-medium text-gray-700 dark:text-gray-300">Save Task Output Logs</label>
                                        <p className="text-gray-500">Automatically save the console output of every task to a `.log` file.</p>
                                    </div>
                                </div>
                                <div className={!settings.saveTaskLogs ? 'opacity-50' : ''}>
                                    <label htmlFor="taskLogPath" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Log Path</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <input type="text" id="taskLogPath" name="taskLogPath" value={taskLogDisplayPath} disabled className={`${formInputStyle} bg-gray-100 dark:bg-gray-800 cursor-not-allowed`} />
                                        <button type="button" onClick={handleChangeTaskLogPath} disabled={!settings.saveTaskLogs} className={actionButtonStyle}>Change...</button>
                                        <button type="button" onClick={() => window.electronAPI.openTaskLogPath()} disabled={!settings.saveTaskLogs} className={actionButtonStyle}>Open...</button>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Leave blank to use the default logs directory.</p>
                                </div>
                            </div>
                        </div>

                          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Executable Paths</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Specify the full path to your version control executables if they are not in your system's PATH.
                            </p>
                            <div className="mt-4 space-y-4 max-w-2xl">
                                <div>
                                    <label htmlFor="gitExecutablePath" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Git Executable Path</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <input type="text" id="gitExecutablePath" name="gitExecutablePath" value={settings.gitExecutablePath || ''} onChange={handleChange} placeholder="e.g., C:\Program Files\Git\bin\git.exe" className={formInputStyle}/>
                                        <button type="button" onClick={() => handleBrowse('git')} className={actionButtonStyle} title="Browse..."><FolderOpenIcon className="h-5 w-5"/></button>
                                        <button type="button" onClick={() => handleAutodetect('git')} className={actionButtonStyle} title="Auto-detect"><SparklesIcon className="h-5 w-5"/></button>
                                        <button type="button" onClick={() => handleTest('git')} className={actionButtonStyle} title="Test Path"><BeakerIcon className="h-5 w-5"/></button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="svnExecutablePath" className="block text-sm font-medium text-gray-700 dark:text-gray-300">SVN Executable Path</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <input type="text" id="svnExecutablePath" name="svnExecutablePath" value={settings.svnExecutablePath || ''} onChange={handleChange} placeholder="e.g., C:\Program Files\TortoiseSVN\bin\svn.exe" className={formInputStyle}/>
                                        <button type="button" onClick={() => handleBrowse('svn')} className={actionButtonStyle} title="Browse..."><FolderOpenIcon className="h-5 w-5"/></button>
                                        <button type="button" onClick={() => handleAutodetect('svn')} className={actionButtonStyle} title="Auto-detect"><SparklesIcon className="h-5 w-5"/></button>
                                        <button type="button" onClick={() => handleTest('svn')} className={actionButtonStyle} title="Test Path"><BeakerIcon className="h-5 w-5"/></button>
                                    </div>
                                </div>
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
