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
import { KeyboardIcon } from './icons/KeyboardIcon';
import KeyboardShortcutEditor from './settings/KeyboardShortcutEditor';
import { createDefaultKeyboardShortcutSettings } from '../keyboardShortcuts';

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

type SettingsCategory = 'appearance' | 'behavior' | 'shortcuts' | 'jsonConfig';

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
      window.electronAPI?.getTaskLogPath().then(path => path && setTaskLogDisplayPath(path));
    }
  }, [activeCategory, settings.taskLogPath]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    // FIX: Destructure from the uncasted e.target first to avoid unsafe assertions.
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

  const handleIntervalChange = (value: string) => {
      const parsed = parseInt(value, 10);
      setSettings(prev => ({
          ...prev,
          autoCheckIntervalSeconds: Number.isNaN(parsed) ? prev.autoCheckIntervalSeconds : Math.max(parsed, 30),
      }));
  };
  
  const handleBrowse = async (vcsType: 'git' | 'svn') => {
    const result = await window.electronAPI?.showFilePicker();
    if (result && !result.canceled && result.filePaths.length > 0) {
        const path = result.filePaths[0];
        setSettings(prev => ({
            ...prev,
            [vcsType === 'git' ? 'gitExecutablePath' : 'svnExecutablePath']: path,
        }));
    }
  };

  const handleAutodetect = async (vcsType: 'git' | 'svn') => {
      const path = await window.electronAPI?.autodetectExecutablePath(vcsType);
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
      setToast({ message: `Path for ${vcsType.toUpperCase()} is not set.`, type: 'info' });
      return;
    }
    const result = await window.electronAPI?.testExecutablePath({ path, vcsType });
    if (result?.success) {
      setToast({ message: `Success! Version: ${result.version}`, type: 'success' });
    } else {
      setToast({ message: `Test failed: ${result?.error || 'Execution failed.'}`, type: 'error' });
    }
  };
  
  const handleSelectTaskLogPath = async () => {
      const result = await window.electronAPI?.selectTaskLogPath();
      if (result && !result.canceled && result.path) {
          setSettings(prev => ({ ...prev, taskLogPath: result.path! }));
      }
  };
  
  const patTooltip = useTooltip('Create a fine-grained token with Contents: Read & write permissions.');
  const copyPatTooltip = useTooltip('Copy PAT to clipboard');
  
  const renderContent = () => {
    switch (activeCategory) {
      case 'appearance':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Appearance</h3>
            {/* Theme setting */}
            <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                    <button onClick={() => handleThemeChange('light')} className={`p-4 rounded-lg border-2 ${settings.theme === 'light' ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                        <div className="flex items-center gap-3">
                            <SunIcon className="h-6 w-6 text-yellow-500" />
                            <div>
                                <p className="font-semibold text-left">Light</p>
                                <p className="text-xs text-gray-500 text-left">Default light theme.</p>
                            </div>
                        </div>
                    </button>
                    <button onClick={() => handleThemeChange('dark')} className={`p-4 rounded-lg border-2 ${settings.theme === 'dark' ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                        <div className="flex items-center gap-3">
                            <MoonIcon className="h-6 w-6 text-indigo-400" />
                            <div>
                                <p className="font-semibold text-left">Dark</p>
                                <p className="text-xs text-gray-500 text-left">Default dark theme.</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
            {/* Icon Set */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Icon Set</label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(['feather', 'lucide', 'tabler', 'remix'] as IconSet[]).map(iconSet => (
                      <button key={iconSet} onClick={() => handleIconSetChange(iconSet)} className={`p-3 rounded-lg border-2 text-center capitalize ${settings.iconSet === iconSet ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                          {iconSet}
                      </button>
                  ))}
              </div>
            </div>
            {/* GUI Scale */}
            <div>
                <label htmlFor="zoomFactor" className="text-sm font-medium text-gray-700 dark:text-gray-300">GUI Scale: <span className="font-bold">{Math.round(settings.zoomFactor * 100)}%</span></label>
                <input
                    type="range"
                    id="zoomFactor"
                    name="zoomFactor"
                    min="0.5"
                    max="2"
                    step="0.05"
                    value={settings.zoomFactor}
                    onChange={handleChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
            </div>
          </div>
        );
      case 'behavior':
        return (
          <div className="space-y-6">
             <h3 className="text-xl font-bold">Behavior</h3>
             {/* GitHub PAT */}
              <div>
                  <label htmlFor="githubPat" className="text-sm font-medium text-gray-700 dark:text-gray-300">GitHub Personal Access Token</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                          type="password"
                          id="githubPat"
                          name="githubPat"
                          value={settings.githubPat}
                          onChange={handleChange}
                          className="block w-full pr-10 border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-900"
                          placeholder="ghp_..."
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <button
                            type="button"
                            {...copyPatTooltip}
                            onClick={() => {
                                navigator.clipboard.writeText(settings.githubPat);
                                setToast({ message: 'PAT copied to clipboard!', type: 'success' });
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <ClipboardDocumentIcon className="h-5 w-5"/>
                          </button>
                      </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Required for fetching release info. <a {...patTooltip} href="#" onClick={(e) => { e.preventDefault(); window.electronAPI?.openWeblink('https://github.com/settings/tokens?type=beta'); }} className="text-blue-600 dark:text-blue-400 hover:underline">Create one here</a>.</p>
              </div>

             {/* Executable Paths */}
              <div className="space-y-4">
                  <div>
                      <label htmlFor="gitExecutablePath" className="text-sm font-medium text-gray-700 dark:text-gray-300">Git Executable Path</label>
                      <div className="mt-1 flex gap-2">
                          <input type="text" id="gitExecutablePath" name="gitExecutablePath" value={settings.gitExecutablePath} onChange={handleChange} placeholder="e.g., C:\Program Files\Git\bin\git.exe" className="flex-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-900"/>
                          <button type="button" onClick={() => handleBrowse('git')} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"><FolderOpenIcon className="h-5 w-5"/></button>
                          <button type="button" onClick={() => handleAutodetect('git')} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"><SparklesIcon className="h-5 w-5"/></button>
                          <button type="button" onClick={() => handleTest('git')} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"><BeakerIcon className="h-5 w-5"/></button>
                      </div>
                  </div>
                   <div>
                      <label htmlFor="svnExecutablePath" className="text-sm font-medium text-gray-700 dark:text-gray-300">SVN Executable Path</label>
                       <div className="mt-1 flex gap-2">
                          <input type="text" id="svnExecutablePath" name="svnExecutablePath" value={settings.svnExecutablePath} onChange={handleChange} placeholder="e.g., C:\Program Files\TortoiseSVN\bin\svn.exe" className="flex-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-900"/>
                          <button type="button" onClick={() => handleBrowse('svn')} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"><FolderOpenIcon className="h-5 w-5"/></button>
                          <button type="button" onClick={() => handleAutodetect('svn')} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"><SparklesIcon className="h-5 w-5"/></button>
                          <button type="button" onClick={() => handleTest('svn')} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"><BeakerIcon className="h-5 w-5"/></button>
                      </div>
                  </div>
              </div>

             {/* Other Behavior Settings */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Open Web Links In</label>
                  <div className="mt-2 space-y-2">
                      {(['default', 'chrome', 'firefox'] as const).map(browser => (
                        <label key={browser} className="flex items-center gap-2">
                            <input type="radio" checked={settings.openLinksIn === browser} onChange={() => handleBrowserChange(browser)} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600"/>
                            <span className="capitalize">{browser}</span>
                        </label>
                      ))}
                  </div>
                </div>
                <div className="space-y-4">
                    <label className="flex items-start gap-3"><input type="checkbox" name="notifications" checked={settings.notifications} onChange={handleChange} className="mt-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"/><div>Enable Notifications<p className="text-xs text-gray-500">Show success/error toasts.</p></div></label>
                    <label className="flex items-start gap-3"><input type="checkbox" name="simulationMode" checked={settings.simulationMode} onChange={handleChange} className="mt-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"/><div>Enable Simulation Mode<p className="text-xs text-gray-500">If enabled, no real commands are run.</p></div></label>
                    <label className="flex items-start gap-3"><input type="checkbox" name="allowPrerelease" checked={settings.allowPrerelease} onChange={handleChange} className="mt-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"/><div>Check for Pre-Releases<p className="text-xs text-gray-500">Include beta versions in auto-updates.</p></div></label>
                    <label className="flex items-start gap-3"><input type="checkbox" name="debugLogging" checked={settings.debugLogging} onChange={handleChange} className="mt-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"/><div>Enable Debug Logging<p className="text-xs text-gray-500">Verbose logging for troubleshooting.</p></div></label>
                </div>
             </div>

             <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Application Updates</span>
                  <h4 className="text-lg font-semibold">Keep Git Automation Dashboard current</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Control how the app checks for new releases and whether updates install themselves once downloaded.</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white/60 p-4 shadow-sm transition dark:border-gray-700 dark:bg-gray-900/50">
                    <input
                      type="checkbox"
                      name="autoUpdateChecksEnabled"
                      checked={settings.autoUpdateChecksEnabled}
                      onChange={handleChange}
                      className="mt-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"
                      data-automation-id="settings-auto-update-checks"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Enable automatic update checks</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">When enabled, Git Automation Dashboard looks for the latest release whenever it starts.</p>
                    </div>
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-white/60 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-300" data-automation-id="settings-install-label">Installation preference</p>
                    <fieldset className="mt-3 space-y-3" data-automation-id="settings-auto-install-options">
                      <label className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="autoInstallUpdates"
                          value="auto"
                          checked={settings.autoInstallUpdates === 'auto'}
                          onChange={handleChange}
                          className="mt-1 focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 dark:border-gray-600"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">Install automatically after download</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">The app restarts itself to finish installing as soon as an update is ready.</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="autoInstallUpdates"
                          value="manual"
                          checked={settings.autoInstallUpdates === 'manual'}
                          onChange={handleChange}
                          className="mt-1 focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 dark:border-gray-600"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">I'll install updates manually</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Keep working and choose when to restart. You'll still see reminders when an update is ready.</p>
                        </div>
                      </label>
                    </fieldset>
                  </div>
                </div>
             </div>

             <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-semibold">Automatic Update Checks</h4>
                <label className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        name="autoCheckForUpdates"
                        checked={settings.autoCheckForUpdates}
                        onChange={handleChange}
                        className="mt-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <div>
                        Enable Automatic Checks
                        <p className="text-xs text-gray-500">Periodically refresh repositories to look for remote updates.</p>
                    </div>
                </label>
                <div className="grid sm:grid-cols-[220px_1fr] gap-3 items-center">
                    <label htmlFor="autoCheckIntervalSeconds" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Check Interval (seconds)
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            id="autoCheckIntervalSeconds"
                            name="autoCheckIntervalSeconds"
                            min={30}
                            step={15}
                            value={settings.autoCheckIntervalSeconds}
                            onChange={(e) => handleIntervalChange(e.target.value)}
                            disabled={!settings.autoCheckForUpdates}
                            className="w-32 border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-900 disabled:opacity-50"
                        />
                        <span className="text-xs text-gray-500">Minimum 30 seconds.</span>
                    </div>
                </div>
             </div>

             {/* Logging Settings */}
             <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-semibold">Logging</h4>
                <label className="flex items-start gap-3"><input type="checkbox" name="saveTaskLogs" checked={settings.saveTaskLogs} onChange={handleChange} className="mt-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"/><div>Save Task Output Logs<p className="text-xs text-gray-500">Automatically save the console output of every task to a file.</p></div></label>
                <div>
                  <label htmlFor="taskLogPath" className="text-sm font-medium text-gray-700 dark:text-gray-300">Task Log Path</label>
                   <div className="mt-1 flex gap-2">
                      <input type="text" id="taskLogPath" name="taskLogPath" value={settings.taskLogPath} onChange={handleChange} placeholder="Leave blank for default" className="flex-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-900"/>
                      <button type="button" onClick={handleSelectTaskLogPath} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"><FolderOpenIcon className="h-5 w-5"/></button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Current path: <code className="bg-gray-100 dark:bg-gray-900/50 p-1 rounded">{taskLogDisplayPath}</code></p>
              </div>
             </div>
          </div>
        );
      case 'jsonConfig':
        return <JsonConfigView setToast={setToast} confirmAction={confirmAction} />;
      case 'shortcuts':
        return (
          <KeyboardShortcutEditor
            value={settings.keyboardShortcuts}
            onChange={next =>
              setSettings(prev => ({
                ...prev,
                keyboardShortcuts: next,
              }))
            }
            onResetToDefaults={() =>
              setSettings(prev => ({
                ...prev,
                keyboardShortcuts: createDefaultKeyboardShortcutSettings(),
              }))
            }
            confirmAction={confirmAction}
            showToast={setToast}
          />
        );
      default:
        return null;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800"
      data-automation-id="settings-view"
    >
        <div className="flex-1 flex overflow-hidden">
            <aside className="w-1/4 xl:w-1/5 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50 p-4">
                <nav className="space-y-2">
                    <button type="button" onClick={() => setActiveCategory('appearance')} className={`w-full text-left px-3 py-2 rounded-md font-medium text-sm flex items-center gap-3 ${activeCategory === 'appearance' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} data-automation-id="settings-tab-appearance">
                        <SparklesIcon className="h-5 w-5" /> Appearance
                    </button>
                    <button type="button" onClick={() => setActiveCategory('behavior')} className={`w-full text-left px-3 py-2 rounded-md font-medium text-sm flex items-center gap-3 ${activeCategory === 'behavior' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} data-automation-id="settings-tab-behavior">
                        <BeakerIcon className="h-5 w-5" /> Behavior
                    </button>
                    <button type="button" onClick={() => setActiveCategory('shortcuts')} className={`w-full text-left px-3 py-2 rounded-md font-medium text-sm flex items-center gap-3 ${activeCategory === 'shortcuts' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} data-automation-id="settings-tab-shortcuts">
                        <KeyboardIcon className="h-5 w-5" /> Shortcuts
                    </button>
                    <button type="button" onClick={() => setActiveCategory('jsonConfig')} className={`w-full text-left px-3 py-2 rounded-md font-medium text-sm flex items-center gap-3 ${activeCategory === 'jsonConfig' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} data-automation-id="settings-tab-json">
                        <CodeBracketIcon className="h-5 w-5" /> JSON Config
                    </button>
                </nav>
            </aside>
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
        
        {isDirty && (
            <footer className="flex justify-end items-center p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 gap-3 animate-fade-in">
                <span className="text-sm text-yellow-600 dark:text-yellow-500">You have unsaved changes.</span>
                <button type="button" onClick={handleCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors" data-automation-id="settings-reset">
                    Reset
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors" data-automation-id="settings-save">
                    Save Changes
                </button>
            </footer>
        )}
    </form>
  );
};

export default SettingsView;