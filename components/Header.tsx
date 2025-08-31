import React from 'react';
import type { AppView } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { CogIcon } from './icons/CogIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon'; // A better icon for dashboard
import { HomeIcon } from './icons/HomeIcon';

interface HeaderProps {
  onNewRepo: () => void;
  activeView: AppView;
  onSetView: (view: AppView) => void;
}

const Header: React.FC<HeaderProps> = ({ onNewRepo, activeView, onSetView }) => {
  const navButtonStyle = "p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors";
  const activeNavButtonStyle = "p-2 rounded-full bg-cyan-500 dark:bg-cyan-600 text-white";

  return (
    <header className="bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-20 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">Git Automation</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={onNewRepo}
              className="flex items-center justify-center px-3 py-2 sm:px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">New Repo</span>
            </button>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />

            <button
              onClick={() => onSetView('dashboard')}
              className={activeView === 'dashboard' ? activeNavButtonStyle : navButtonStyle}
              aria-label="Dashboard"
              title="Dashboard"
            >
              <HomeIcon className="h-6 w-6" />
            </button>
            <button
              onClick={() => onSetView('settings')}
              className={activeView === 'settings' ? activeNavButtonStyle : navButtonStyle}
              aria-label="Settings"
              title="Settings"
            >
              <CogIcon className="h-6 w-6" />
            </button>
            <button
              onClick={() => onSetView('info')}
              className={activeView === 'info' ? activeNavButtonStyle : navButtonStyle}
              aria-label="Information"
              title="Information"
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