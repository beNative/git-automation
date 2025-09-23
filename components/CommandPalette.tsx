import React, { useEffect, useRef } from 'react';
import type { Repository, AppView } from '../types';
import { HomeIcon } from './icons/HomeIcon';
import { CogIcon } from './icons/CogIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { PlusIcon } from './icons/PlusIcon';
import { PlayIcon } from './icons/PlayIcon';

// Export for use in TitleBar
export interface Command {
  id: string;
  type: 'navigation' | 'repo' | 'task';
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  filteredCommands: Command[];
  activeIndex: number;
  onCommandClick: (command: Command) => void;
  setActiveIndex: (index: number) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  filteredCommands,
  activeIndex,
  onCommandClick,
  setActiveIndex,
}) => {
  const commandListRef = useRef<HTMLUListElement>(null);

  // Effect to scroll the active item into view
  useEffect(() => {
    const activeElement = commandListRef.current?.querySelector(`#cmd-${activeIndex}`);
    if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div 
      className="absolute top-full mt-2 left-0 right-0 mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-[70vh] ring-1 ring-black/5"
    >
      <ul ref={commandListRef} className="overflow-y-auto p-2" role="listbox">
          {filteredCommands.length === 0 && (
              <li className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">No results found.</li>
          )}
          {filteredCommands.map((cmd, index) => (
              <li 
                key={cmd.id} 
                id={`cmd-${index}`} 
                role="option" 
                aria-selected={activeIndex === index}
                onMouseEnter={() => setActiveIndex(index)}
              >
                  <button
                      onClick={() => onCommandClick(cmd)}
                      className={`w-full text-left flex items-center px-3 py-2 rounded-md transition-colors ${activeIndex === index ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                  >
                      <span className="mr-4 text-gray-400 dark:text-gray-500">{cmd.icon}</span>
                      <div>
                          <p className="font-medium">{cmd.title}</p>
                          {cmd.description && <p className="text-xs text-gray-500 dark:text-gray-400">{cmd.description}</p>}
                      </div>
                  </button>
              </li>
          ))}
      </ul>
    </div>
  );
};

export default CommandPalette;
