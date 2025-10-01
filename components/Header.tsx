import React from 'react';
import WindowControls from './titlebar/WindowControls';
import { GitBranchIcon } from './icons/GitBranchIcon';

const TitleBar: React.FC = () => {
  return (
    <header 
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="bg-gray-200 dark:bg-gray-800/90 h-[var(--title-bar-height)] flex items-center justify-between pl-2 flex-shrink-0"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <GitBranchIcon className="h-5 w-5 text-blue-600 dark:text-blue-500" />
          <span>Git Automation Dashboard</span>
      </div>
      <WindowControls />
    </header>
  );
};

export default TitleBar;
