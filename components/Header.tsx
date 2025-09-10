import React, { useMemo } from 'react';
import type { AppView } from '../types';
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

interface HeaderProps {
  onNewRepo: () => void;
  activeView: AppView;
  onSetView: (view: AppView) => void;
  onCheckAllForUpdates: () => void;
  isCheckingAll: boolean;
  onToggleAllCategories: () => void;
  canCollapseAll: boolean;
}

const Header: React.FC<HeaderProps> = ({ onNewRepo, activeView, onSetView, onCheckAllForUpdates, isCheckingAll, onToggleAllCategories, canCollapseAll }) => {
  const { settings, saveSettings } = useSettings();

  const handleToggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings({ ...settings, theme: newTheme });
  };

  const navButtonStyle = "p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors";
  
  const activeDashboardStyle = "p-2 rounded-full bg-red-600 dark:bg-red-700 text-white";
  const activeSettingsStyle = "p-2 rounded-full bg-green-600 dark:bg-green-700 text-white";
  const activeInfoStyle = "p-2 rounded-full bg-blue-600 dark:bg-blue-700 text-white";
  
  const disabledNavButtonStyle = "p-2 rounded-full text-gray-400 dark:text-gray-600 cursor-not-allowed";

  const isEditing = activeView === 'edit-repository';

  const titleConfig = useMemo(() => {
    switch(activeView) {
        case 'dashboard': return { text: 'Dashboard', color: 'text-red-600 dark:text-red-500' };
        case 'settings': return { text: 'Settings', color: 'text-green-600 dark:text-green-500' };
        case 'info': return { text: 'Info', color: 'text-blue-600 dark:text-blue-400' };
        case 'edit-repository': return { text: 'Editing Repository', color: 'text-gray-700 dark:text-gray-300' };
        default: return { text: '', color: '' };
    }
  }, [activeView]);

  const dashboardTooltip = useTooltip('Dashboard');
  const settingsTooltip = useTooltip('Settings');
  const infoTooltip = useTooltip('Information');
  const checkUpdatesTooltip = useTooltip('Check all repositories for updates');
  const expandCollapseTooltip = useTooltip(canCollapseAll ? 'Collapse all categories' : 'Expand all categories');
  const themeTooltip = useTooltip(`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`);

  return (
    <header className="bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-20 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center">
            <h1 className={`text-xl font-bold ${titleConfig.color}`}>{titleConfig.text}</h1>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            {activeView === 'dashboard' && (
              <>
                <button
                  {...expandCollapseTooltip}
                  onClick={onToggleAllCategories}
                  disabled={isEditing}
                  className="flex items-center justify-center px-3 py-1.5 sm:px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {canCollapseAll ? <ArrowsPointingInIcon className="h-5 w-5 mr-0 sm:mr-2" /> : <ArrowsPointingOutIcon className="h-5 w-5 mr-0 sm:mr-2" />}
                  <span className="hidden sm:inline">{canCollapseAll ? 'Collapse' : 'Expand'} All</span>
                </button>
                <button
                  {...checkUpdatesTooltip}
                  onClick={onCheckAllForUpdates}
                  disabled={isCheckingAll || isEditing}
                  className="flex items-center justify-center px-3 py-1.5 sm:px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CloudArrowDownIcon className={`h-5 w-5 mr-0 sm:mr-2 ${isCheckingAll ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">{isCheckingAll ? 'Checking...' : 'Check Updates'}</span>
                </button>
                <button
                  onClick={onNewRepo}
                  disabled={isEditing}
                  className="flex items-center justify-center px-3 py-1.5 sm:px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-5 w-5 mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">New Repo</span>
                </button>
                
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
              </>
            )}

            <button
              {...themeTooltip}
              onClick={handleToggleTheme}
              disabled={isEditing}
              className={isEditing ? disabledNavButtonStyle : navButtonStyle}
              aria-label="Toggle theme"
            >
              {settings.theme === 'dark' ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
            </button>
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
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
