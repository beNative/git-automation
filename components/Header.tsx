import React from 'react';
import WindowControls from './titlebar/WindowControls';
import { GitBranchIcon } from './icons/GitBranchIcon';
import { HomeIcon } from './icons/HomeIcon';
import { CogIcon } from './icons/CogIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { useSettings } from '../contexts/SettingsContext';
import type { AppView } from '../types';
import { useTooltip } from '../hooks/useTooltip';

interface TitleBarProps {
  activeView: AppView;
  onSetView: (view: AppView) => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ activeView, onSetView }) => {
  const { settings, saveSettings } = useSettings();
  const isEditing = activeView === 'edit-repository';

  const handleToggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings({ ...settings, theme: newTheme });
  };

  const navButtonStyle = "p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300/70 dark:hover:bg-gray-700/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-200 dark:focus:ring-offset-gray-700 focus:ring-blue-500 transition-colors";
  const disabledNavButtonStyle = "p-1.5 rounded-md text-gray-400 dark:text-gray-600 cursor-not-allowed";
  const activeDashboardStyle = "p-1.5 rounded-md bg-red-600 dark:bg-red-700 text-white";
  const activeSettingsStyle = "p-1.5 rounded-md bg-green-600 dark:bg-green-700 text-white";
  const activeInfoStyle = "p-1.5 rounded-md bg-blue-600 dark:bg-blue-700 text-white";

  const dashboardTooltip = useTooltip('Dashboard');
  const settingsTooltip = useTooltip('Settings');
  const infoTooltip = useTooltip('Information');
  const themeTooltip = useTooltip(`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`);

  return (
    <header
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="bg-gray-200 dark:bg-gray-800/90 h-[var(--title-bar-height)] flex items-center justify-between pl-2 pr-0 flex-shrink-0"
    >
      <div
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <GitBranchIcon className="h-5 w-5 text-blue-600 dark:text-blue-500" />
        <span>Git Automation Dashboard</span>
      </div>
      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex items-center gap-1 pr-1 border-r border-gray-300/60 dark:border-gray-700/60 mr-1">
          <button
            {...dashboardTooltip}
            onClick={() => onSetView('dashboard')}
            disabled={isEditing}
            className={isEditing ? disabledNavButtonStyle : (activeView === 'dashboard' ? activeDashboardStyle : navButtonStyle)}
            aria-label="Dashboard"
          >
            <HomeIcon className="h-5 w-5" />
          </button>
          <button
            {...settingsTooltip}
            onClick={() => onSetView('settings')}
            disabled={isEditing}
            className={isEditing ? disabledNavButtonStyle : (activeView === 'settings' ? activeSettingsStyle : navButtonStyle)}
            aria-label="Settings"
          >
            <CogIcon className="h-5 w-5" />
          </button>
          <button
            {...infoTooltip}
            onClick={() => onSetView('info')}
            disabled={isEditing}
            className={isEditing ? disabledNavButtonStyle : (activeView === 'info' ? activeInfoStyle : navButtonStyle)}
            aria-label="Information"
          >
            <InformationCircleIcon className="h-5 w-5" />
          </button>
          <button
            {...themeTooltip}
            onClick={handleToggleTheme}
            disabled={isEditing}
            className={isEditing ? disabledNavButtonStyle : navButtonStyle}
            aria-label="Toggle theme"
          >
            {settings.theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
        </div>
        <WindowControls />
      </div>
    </header>
  );
};

export default TitleBar;
