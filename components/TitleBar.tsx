import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Repository, AppView } from '../types';
import { useTooltip } from '../hooks/useTooltip';
import { useSettings } from '../contexts/SettingsContext';
import CommandPalette from './CommandPalette';

import { PlusIcon } from './icons/PlusIcon';
import { CogIcon } from './icons/CogIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { HomeIcon } from './icons/HomeIcon';
import { CloudArrowDownIcon } from './icons/CloudArrowDownIcon';
import { ArrowsPointingInIcon } from './icons/ArrowsPointingInIcon';
import { ArrowsPointingOutIcon } from './icons/ArrowsPointingOutIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { WindowMinimizeIcon } from './icons/WindowMinimizeIcon';
import { WindowMaximizeIcon } from './icons/WindowMaximizeIcon';
import { WindowRestoreIcon } from './icons/WindowRestoreIcon';
import { WindowCloseIcon } from './icons/WindowCloseIcon';

interface TitleBarProps {
  onNewRepo: () => void;
  activeView: AppView;
  onSetView: (view: AppView) => void;
  onCheckAllForUpdates: () => void;
  isCheckingAll: boolean;
  onToggleAllCategories: () => void;
  canCollapseAll: boolean;
  repositories: Repository[];
  onRunTask: (repoId: string, taskId: string) => void;
}

const TitleBar: React.FC<TitleBarProps> = (props) => {
  const { settings, saveSettings } = useSettings();
  const [platform, setPlatform] = useState<'win32' | 'darwin' | 'linux' | ''>('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    window.electronAPI?.getPlatform().then(setPlatform);
    const listener = (_: any, maximized: boolean) => {
        setIsMaximized(maximized);
    };
    window.electronAPI?.onWindowMaximizedStatusChanged(listener);
    
    return () => { 
        if (window.electronAPI?.removeWindowMaximizedStatusChangedListener) {
            window.electronAPI.removeWindowMaximizedStatusChangedListener(listener);
        }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setCommandPaletteOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings({ ...settings, theme: newTheme });
  };
  
  const handleMinimize = () => window.electronAPI.windowMinimize();
  const handleMaximize = () => window.electronAPI.windowMaximize();
  const handleClose = () => window.electronAPI.windowClose();

  const titleConfig = useMemo(() => {
    switch(props.activeView) {
        case 'dashboard': return { text: 'Dashboard', color: 'text-red-600 dark:text-red-500' };
        case 'settings': return { text: 'Settings', color: 'text-green-600 dark:text-green-500' };
        case 'info': return { text: 'Info', color: 'text-blue-600 dark:text-blue-400' };
        case 'edit-repository': return { text: 'Editing Repository', color: 'text-gray-700 dark:text-gray-300' };
        default: return { text: '', color: '' };
    }
  }, [props.activeView]);

  const dashboardTooltip = useTooltip('Dashboard');
  const settingsTooltip = useTooltip('Settings');
  const infoTooltip = useTooltip('Information');
  const checkUpdatesTooltip = useTooltip('Check all repositories for updates');
  const expandCollapseTooltip = useTooltip(props.canCollapseAll ? 'Collapse all categories' : 'Expand all categories');
  const themeTooltip = useTooltip(`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`);

  const isMac = platform === 'darwin';
  const isEditing = props.activeView === 'edit-repository';

  const navButtonStyle = "p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors";
  const activeDashboardStyle = "p-2 rounded-full bg-red-600 dark:bg-red-700 text-white";
  const activeSettingsStyle = "p-2 rounded-full bg-green-600 dark:bg-green-700 text-white";
  const activeInfoStyle = "p-2 rounded-full bg-blue-600 dark:bg-blue-700 text-white";
  const disabledNavButtonStyle = "p-2 rounded-full text-gray-400 dark:text-gray-600 cursor-not-allowed";

  return (
    <header 
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="h-[var(--title-bar-height)] bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-between px-2 flex-shrink-0 z-20"
    >
      {/* Left side: Mac traffic lights spacing and App Title */}
      <div className="flex items-center h-full">
        {isMac && <div className="w-20 h-full flex-shrink-0"></div>}
        <h1 className={`text-xl font-bold ${titleConfig.color} ml-2`}>{titleConfig.text}</h1>
      </div>

      {/* Center: Command Palette */}
      <div className="flex-1 flex justify-center items-center h-full">
        <div className="relative" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-80 h-8 px-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20 rounded-md border border-gray-300/50 dark:border-gray-700/50 hover:border-blue-500 hover:bg-white/80 dark:hover:bg-black/30 transition-all"
          >
              <div className="flex items-center">
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2"/>
                  <span>Search...</span>
              </div>
              <kbd className="font-sans text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">Ctrl+K</kbd>
          </button>
          
          <CommandPalette 
              isOpen={isCommandPaletteOpen}
              onClose={() => setCommandPaletteOpen(false)}
              repositories={props.repositories}
              onSetView={props.onSetView}
              onNewRepo={props.onNewRepo}
              onRunTask={props.onRunTask}
          />
        </div>
      </div>

      {/* Right side: App controls */}
      <div className="flex items-center space-x-1 sm:space-x-2 h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {props.activeView === 'dashboard' && (
          <>
            <button
              {...expandCollapseTooltip}
              onClick={props.onToggleAllCategories}
              disabled={isEditing}
              className="flex items-center justify-center h-8 px-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {props.canCollapseAll ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
            </button>
            <button
              {...checkUpdatesTooltip}
              onClick={props.onCheckAllForUpdates}
              disabled={props.isCheckingAll || isEditing}
              className="flex items-center justify-center h-8 px-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CloudArrowDownIcon className={`h-5 w-5 ${props.isCheckingAll ? 'animate-pulse' : ''}`} />
            </button>
            <button
              onClick={props.onNewRepo}
              disabled={isEditing}
              className="flex items-center justify-center h-8 px-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
          </>
        )}

        <button {...dashboardTooltip} onClick={() => props.onSetView('dashboard')} disabled={isEditing} className={isEditing ? disabledNavButtonStyle : (props.activeView === 'dashboard' ? activeDashboardStyle : navButtonStyle)} aria-label="Dashboard"><HomeIcon className="h-6 w-6" /></button>
        <button {...settingsTooltip} onClick={() => props.onSetView('settings')} disabled={isEditing} className={isEditing ? disabledNavButtonStyle : (props.activeView === 'settings' ? activeSettingsStyle : navButtonStyle)} aria-label="Settings"><CogIcon className="h-6 w-6" /></button>
        <button {...infoTooltip} onClick={() => props.onSetView('info')} disabled={isEditing} className={isEditing ? disabledNavButtonStyle : (props.activeView === 'info' ? activeInfoStyle : navButtonStyle)} aria-label="Information"><InformationCircleIcon className="h-6 w-6" /></button>
        <button {...themeTooltip} onClick={handleToggleTheme} disabled={isEditing} className={isEditing ? disabledNavButtonStyle : navButtonStyle} aria-label="Toggle theme">{settings.theme === 'dark' ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}</button>

        {!isMac && (
            <div className="flex items-center h-full ml-2">
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
                <button onClick={handleMinimize} className="h-full px-3 text-gray-800 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"><WindowMinimizeIcon className="h-3 w-3"/></button>
                <button onClick={handleMaximize} className="h-full px-3 text-gray-800 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">{isMaximized ? <WindowRestoreIcon className="h-3 w-3"/> : <WindowMaximizeIcon className="h-3 w-3"/>}</button>
                <button onClick={handleClose} className="h-full px-3 text-gray-800 dark:text-gray-200 hover:bg-red-500 hover:text-white transition-colors"><WindowCloseIcon className="h-3 w-3"/></button>
            </div>
        )}
      </div>
    </header>
  );
};

export default TitleBar;