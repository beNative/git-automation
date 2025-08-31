import React from 'react';
import { PlusIcon } from './icons/PlusIcon';
import { CogIcon } from './icons/CogIcon';

interface HeaderProps {
  onNewRepo: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewRepo, onOpenSettings }) => {
  return (
    <header className="bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-cyan-400">Git Automation Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onNewRepo}
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Repository
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white transition-colors"
              aria-label="Settings"
            >
              <CogIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
