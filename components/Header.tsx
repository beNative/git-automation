import React from 'react';
import type { AppView } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { CogIcon } from './icons/CogIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { HomeIcon } from './icons/HomeIcon';
import { useTooltip } from '../hooks/useTooltip';

interface HeaderProps {
  onNewRepo: () => void;
  activeView: AppView;
  onSetView: (view: AppView) => void;
}

const Header: React.FC<HeaderProps> = ({ onNewRepo, activeView, onSetView }) => {
  const navButtonStyle = "p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors";
  
  const activeDashboardStyle = "p-2 rounded-full bg-red-600 dark:bg-red-700 text-white";
  const activeSettingsStyle = "p-2 rounded-full bg-green-600 dark:bg-green-700 text-white";
  const activeInfoStyle = "p-2 rounded-full bg-blue-600 dark:bg-blue-700 text-white";
  
  const disabledNavButtonStyle = "p-2 rounded-full text-gray-400 dark:text-gray-600 cursor-not-allowed";

  const isEditing = activeView === 'edit-repository';

  const dashboardTooltip = useTooltip('Dashboard');
  const settingsTooltip = useTooltip('Settings');
  const infoTooltip = useTooltip('Information');

  return (
    <header className="bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-20 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Repository Automation Dashboard</h1>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            {activeView === 'dashboard' && (
              <>
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
