import React from 'react';
import type { AppView } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { useTooltip } from '../hooks/useTooltip';
import { CloudArrowDownIcon } from './icons/CloudArrowDownIcon';
import { ArrowsPointingInIcon } from './icons/ArrowsPointingInIcon';
import { ArrowsPointingOutIcon } from './icons/ArrowsPointingOutIcon';

interface MenuBarProps {
  onNewRepo: () => void;
  activeView: AppView;
  onCheckAllForUpdates: () => void;
  isCheckingAll: boolean;
  onToggleAllCategories: () => void;
  canCollapseAll: boolean;
}

const MenuBar: React.FC<MenuBarProps> = ({ onNewRepo, activeView, onCheckAllForUpdates, isCheckingAll, onToggleAllCategories, canCollapseAll }) => {
  const isEditing = activeView === 'edit-repository';

  const checkUpdatesTooltip = useTooltip('Check all repositories for updates');
  const expandCollapseTooltip = useTooltip(canCollapseAll ? 'Collapse all categories' : 'Expand all categories');

  return (
    <div className="bg-gray-100 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm flex-shrink-0 z-20">
      <div className="px-2 sm:px-3 lg:px-4">
        <div className="flex items-center justify-between h-12">
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
                <button
                  {...checkUpdatesTooltip}
                  onClick={onCheckAllForUpdates}
                  disabled={isEditing}
                  aria-disabled={isCheckingAll}
                  className={`flex items-center justify-center px-3 py-1.5 sm:px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isCheckingAll ? 'opacity-70 cursor-progress' : ''}`}
                >
                  <CloudArrowDownIcon className={`h-5 w-5 mr-0 sm:mr-2 ${isCheckingAll ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">{isCheckingAll ? 'Checking...' : 'Check Updates'}</span>
                </button>
                <button
                  {...expandCollapseTooltip}
                  onClick={onToggleAllCategories}
                  disabled={isEditing}
                  className="flex items-center justify-center px-3 py-1.5 sm:px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {canCollapseAll ? <ArrowsPointingInIcon className="h-5 w-5 mr-0 sm:mr-2" /> : <ArrowsPointingOutIcon className="h-5 w-5 mr-0 sm:mr-2" />}
                  <span className="hidden sm:inline">{canCollapseAll ? 'Collapse' : 'Expand'} All</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuBar;
