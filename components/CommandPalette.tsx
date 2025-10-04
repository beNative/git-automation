import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Repository, AppView } from '../types';
import { HomeIcon } from './icons/HomeIcon';
import { CogIcon } from './icons/CogIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { PlusIcon } from './icons/PlusIcon';
import { PlayIcon } from './icons/PlayIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  repositories: Repository[];
  onSetView: (view: AppView) => void;
  onNewRepo: () => void;
  onRunTask: (repoId: string, taskId: string) => void;
}

interface Command {
  id: string;
  type: 'navigation' | 'repo' | 'task';
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  repositories,
  onSetView,
  onNewRepo,
  onRunTask,
}) => {
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const commandListRef = useRef<HTMLUListElement>(null);

  const allCommands = useMemo<Command[]>(() => {
    const navCommands: Command[] = [
      { id: 'nav-dashboard', type: 'navigation', title: 'Go to Dashboard', icon: <HomeIcon className="h-5 w-5" />, action: () => onSetView('dashboard') },
      { id: 'nav-settings', type: 'navigation', title: 'Go to Settings', icon: <CogIcon className="h-5 w-5" />, action: () => onSetView('settings') },
      { id: 'nav-info', type: 'navigation', title: 'Go to Info', icon: <InformationCircleIcon className="h-5 w-5" />, action: () => onSetView('info') },
      { id: 'repo-new', type: 'navigation', title: 'Add New Repository', icon: <PlusIcon className="h-5 w-5" />, action: onNewRepo },
    ];

    const taskCommands: Command[] = repositories.flatMap(repo => 
        repo.tasks.map(task => ({
            id: `task-${repo.id}-${task.id}`,
            type: 'task' as const,
            title: `Run '${task.name}'`,
            description: `on repository '${repo.name}'`,
            icon: <PlayIcon className="h-5 w-5" />,
            action: () => onRunTask(repo.id, task.id),
        }))
    );

    return [...navCommands, ...taskCommands];
  }, [repositories, onSetView, onNewRepo, onRunTask]);


  const filteredCommands = useMemo(() => {
    if (!search) {
      return allCommands;
    }
    const lowerCaseSearch = search.toLowerCase();
    return allCommands.filter(cmd => 
        cmd.title.toLowerCase().includes(lowerCaseSearch) ||
        cmd.description?.toLowerCase().includes(lowerCaseSearch)
    );
  }, [search, allCommands]);
  
  // Reset active index when search changes or when opening
  useEffect(() => {
    setActiveIndex(0);
  }, [search, isOpen]);


  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + (filteredCommands.length || 1)) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const command = filteredCommands[activeIndex];
      if (command) {
        command.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
    }
  }, [filteredCommands, activeIndex, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);
  
  // Effect to scroll the active item into view
  useEffect(() => {
    if (isOpen && commandListRef.current) {
        const activeElement = commandListRef.current.querySelector(`#cmd-${activeIndex}`);
        if (activeElement) {
            activeElement.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [activeIndex, isOpen]);
  
  // Reset search when palette is closed
  useEffect(() => {
    if (!isOpen) {
        setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      data-automation-id="command-palette"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[70vh] ring-1 ring-black/5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center p-3 border-b border-gray-200 dark:border-gray-700">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3"/>
            <input
                type="text"
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Find a repository, task or action..."
                className="w-full bg-transparent border-none focus:ring-0 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                aria-label="Search commands"
                data-automation-id="command-palette-search"
            />
        </div>
        <ul ref={commandListRef} className="overflow-y-auto" role="listbox">
            {filteredCommands.length === 0 && (
                <li className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">No results found.</li>
            )}
            {filteredCommands.map((cmd, index) => (
                <li key={cmd.id} id={`cmd-${index}`} role="option" aria-selected={activeIndex === index}>
                    <button
                        onClick={() => {
                            cmd.action();
                            onClose();
                        }}
                        className={`w-full text-left flex items-center px-3 py-2 transition-colors ${activeIndex === index ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                        data-automation-id={`command-${cmd.id}`}
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
    </div>
  );
};

export default CommandPalette;