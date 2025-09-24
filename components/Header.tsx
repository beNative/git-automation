import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { AppView, Repository } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { CogIcon } from './icons/CogIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { HomeIcon } from './icons/HomeIcon';
import { useTooltip } from '../hooks/useTooltip';
import { CloudArrowDownIcon } from './icons/CloudArrowDownIcon';
import { ArrowsPointingInIcon } from './icons/ArrowsPointingInIcon';
import { ArrowsPointingOutIcon } from './icons/ArrowsPointingOutIcon';
import { useSettings } from '../contexts/SettingsContext';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import CommandPalette from './CommandPalette';
import { KeyboardIcon } from './icons/KeyboardIcon';

// --- Window Control Icons ---
const MinimizeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 10 1" {...props}><path d="M0, .5 L10, .5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>
);
const MaximizeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 10 10" {...props}><path d="M0, 0 L10, 0 L10, 10 L0, 10 z" stroke="currentColor" strokeWidth="1" fill="none" /></svg>
);
const RestoreIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 10 10" {...props}><path d="M2, 0 L8, 0 L8, 6 L2, 6 z M0, 2 L6, 2 L6, 8 L0, 8 z" stroke="currentColor" strokeWidth="1" fill="none" /></svg>
);
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 10 10" {...props}><path d="M0, 0 L10, 10 M10, 0 L0, 10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg>
);


const WindowControls: React.FC = () => {
    const [isMaximized, setIsMaximized] = useState(false);
    const [platform, setPlatform] = useState('');

    useEffect(() => {
        // Platform detection can be done once
// FIX: Property 'userAgentData' does not exist on type 'Navigator'. Cast to any to fix.
        if ((navigator as any).userAgentData?.platform) {
            setPlatform((navigator as any).userAgentData.platform);
        } else if (navigator.platform) {
            setPlatform(navigator.platform);
        }

        // FIX: Add a defensive check to ensure window.electronAPI exists before using it.
        if (window.electronAPI?.onWindowStateChange) {
            const handleStateChange = (_event: any, state: boolean) => {
                setIsMaximized(state);
            };
            
            window.electronAPI.onWindowStateChange(handleStateChange);
            
            return () => {
                window.electronAPI.removeWindowStateChangeListener(handleStateChange);
            };
        }
    }, []);

    const isMac = platform.toLowerCase().startsWith('mac');

    const handleMinimize = () => window.electronAPI?.minimizeWindow();
    const handleMaximize = () => isMaximized ? window.electronAPI?.unmaximizeWindow() : window.electronAPI?.maximizeWindow();
    const handleClose = () => window.electronAPI?.closeWindow();

    if (isMac) {
        return (
            <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button onClick={handleClose} className="w-3 h-3 bg-[#ff5f57] rounded-full hover:bg-[#e0443e]"></button>
                <button onClick={handleMinimize} className="w-3 h-3 bg-[#febc2e] rounded-full hover:bg-[#dea123]"></button>
                <button onClick={handleMaximize} className="w-3 h-3 bg-[#28c840] rounded-full hover:bg-[#22a734]"></button>
            </div>
        );
    }

    return (
        <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button onClick={handleMinimize} className="p-3 hover:bg-gray-400/30"><MinimizeIcon className="w-2.5 h-2.5" /></button>
            <button onClick={handleMaximize} className="p-3 hover:bg-gray-400/30">{isMaximized ? <RestoreIcon className="w-2.5 h-2.5" /> : <MaximizeIcon className="w-2.5 h-2.5" />}</button>
            <button onClick={handleClose} className="p-3 hover:bg-red-600 hover:text-white"><CloseIcon className="w-2.5 h-2.5" /></button>
        </div>
    );
};


interface TitleBarProps {
  onNewRepo: () => void;
  activeView: AppView;
  onSetView: (view: AppView) => void;
  onCheckAllForUpdates: () => void;
  isCheckingAll: boolean;
  onToggleAllCategories: () => void;
  canCollapseAll: boolean;
  // Command Palette Props
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  repositories: Repository[];
  onRunTask: (repoId: string, taskId: string) => void;
}

const TitleBar: React.FC<TitleBarProps> = (props) => {
  const { 
    onNewRepo, activeView, onSetView, onCheckAllForUpdates, 
    isCheckingAll, onToggleAllCategories, canCollapseAll,
    isCommandPaletteOpen, setCommandPaletteOpen, repositories, onRunTask
  } = props;
  
  const { settings, saveSettings } = useSettings();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleToggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings({ ...settings, theme: newTheme });
  };
  
  const closePalette = useCallback(() => setCommandPaletteOpen(false), [setCommandPaletteOpen]);
  
  // Close palette if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isCommandPaletteOpen && searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        closePalette();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCommandPaletteOpen, closePalette]);

  const navButtonStyle = "p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors";
  const activeDashboardStyle = "p-2 rounded-full bg-red-600 dark:bg-red-700 text-white";
  const activeSettingsStyle = "p-2 rounded-full bg-green-600 dark:bg-green-700 text-white";
  const activeInfoStyle = "p-2 rounded-full bg-blue-600 dark:bg-blue-700 text-white";
  const disabledNavButtonStyle = "p-2 rounded-full text-gray-400 dark:text-gray-600 cursor-not-allowed";

  const isEditing = activeView === 'edit-repository';

  const dashboardTooltip = useTooltip('Dashboard');
  const settingsTooltip = useTooltip('Settings');
  const infoTooltip = useTooltip('Information');
  const themeTooltip = useTooltip(`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`);
  const newRepoTooltip = useTooltip('Add New Repository');
  const checkUpdatesTooltip = useTooltip('Check all repositories for updates');
  const expandCollapseTooltip = useTooltip(canCollapseAll ? 'Collapse all categories' : 'Expand all categories');

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-20 h-[var(--title-bar-height)] bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md flex items-center justify-between text-gray-800 dark:text-gray-100"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left-side Actions */}
      <div className="flex items-center space-x-2 pl-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {activeView === 'dashboard' && (
          <>
            <button
              {...newRepoTooltip}
              onClick={onNewRepo}
              disabled={isEditing}
              className="flex items-center justify-center h-9 w-9 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
            <button
              {...checkUpdatesTooltip}
              onClick={onCheckAllForUpdates}
              disabled={isCheckingAll || isEditing}
              className="flex items-center justify-center h-9 w-9 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CloudArrowDownIcon className={`h-5 w-5 ${isCheckingAll ? 'animate-pulse' : ''}`} />
            </button>
             <button
              {...expandCollapseTooltip}
              onClick={onToggleAllCategories}
              disabled={isEditing}
              className="flex items-center justify-center h-9 w-9 border border-transparent rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canCollapseAll ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
            </button>
          </>
        )}
      </div>

      {/* Center Command Palette */}
      <div ref={searchContainerRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
         <div 
            className="relative" 
            onFocus={() => setCommandPaletteOpen(true)}
        >
             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <KeyboardIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div
                onClick={() => setCommandPaletteOpen(true)}
                className="h-10 w-full rounded-lg bg-gray-100 dark:bg-gray-900/50 border border-transparent focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 text-gray-500 dark:text-gray-400 pl-11 pr-11 text-sm flex items-center cursor-text"
             >
                Search...
             </div>
            
            {isCommandPaletteOpen && (
                <CommandPalette
                  isOpen={isCommandPaletteOpen}
                  onClose={closePalette}
                  repositories={repositories}
                  onSetView={onSetView}
                  onNewRepo={onNewRepo}
                  onRunTask={onRunTask}
                />
            )}
        </div>
      </div>
      
      {/* Right-side Navigation */}
      <div className="flex items-center space-x-1 sm:space-x-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          {...dashboardTooltip}
          onClick={() => onSetView('dashboard')}
          disabled={isEditing}
          className={isEditing ? disabledNavButtonStyle : (activeView === 'dashboard' ? activeDashboardStyle : navButtonStyle)}
          aria-label="Dashboard"
        >
          <HomeIcon className="h-6 w-6" />
        </button>
        <button
          {...settingsTooltip}
          onClick={() => onSetView('settings')}
          disabled={isEditing}
          className={isEditing ? disabledNavButtonStyle : (activeView === 'settings' ? activeSettingsStyle : navButtonStyle)}
          aria-label="Settings"
        >
          <CogIcon className="h-6 w-6" />
        </button>
        <button
          {...infoTooltip}
          onClick={() => onSetView('info')}
          disabled={isEditing}
          className={isEditing ? disabledNavButtonStyle : (activeView === 'info' ? activeInfoStyle : navButtonStyle)}
          aria-label="Information"
        >
          <InformationCircleIcon className="h-6 w-6" />
        </button>
        <button
          {...themeTooltip}
          onClick={handleToggleTheme}
          disabled={isEditing}
          className={isEditing ? disabledNavButtonStyle : navButtonStyle}
          aria-label="Toggle theme"
        >
          {settings.theme === 'dark' ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
        </button>
      </div>
      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <WindowControls />
      </div>
    </header>
  );
};

export default TitleBar;