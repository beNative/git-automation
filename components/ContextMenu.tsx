import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Repository, Launchable, LaunchConfig } from '../types';
import { PlayIcon } from './icons/PlayIcon';
import { LightningBoltIcon } from './icons/LightningBoltIcon';
import { CloudArrowDownIcon } from './icons/CloudArrowDownIcon';
import { FolderIcon } from './icons/FolderIcon';
import { TerminalIcon } from './icons/TerminalIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { ClockIcon } from './icons/ClockIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface ContextMenuProps {
  context: {
    isOpen: boolean;
    x: number;
    y: number;
    repo: Repository | null;
  };
  onClose: () => void;
  onRunTask: (repoId: string, taskId: string) => void;
  onRunLaunchable: (repo: Repository, launchable: Launchable) => void;
  onRefreshRepoState: (repoId: string) => void;
  onOpenLocalPath: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onViewLogs: (repoId: string) => void;
  onViewHistory: (repoId: string) => void;
  onEditRepo: (repoId: string) => void;
  onDeleteRepo: (repoId: string) => void;
  detectedExecutables: Record<string, string[]>;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ context, onClose, ...actions }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [submenu, setSubmenu] = useState<string | null>(null);

  const { repo } = context;

  // Hooks must be called unconditionally at the top level.
  const launchables: Launchable[] = useMemo(() => {
    if (!repo) {
        return [];
    }
    return [
        ...(repo.launchConfigs || []).map(config => ({ type: 'manual' as const, config })),
        ...(actions.detectedExecutables[repo.id] || []).map(path => ({ type: 'detected' as const, path }))
    ];
  }, [repo, actions.detectedExecutables]);

  useEffect(() => {
    if (context.isOpen && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      let x = context.x;
      let y = context.y;

      if (x + menuRect.width > window.innerWidth) {
        x = window.innerWidth - menuRect.width - 10;
      }
      if (y + menuRect.height > window.innerHeight) {
        y = window.innerHeight - menuRect.height - 10;
      }
      setPosition({ x, y });
    }
  }, [context.isOpen, context.x, context.y]);

  if (!context.isOpen || !repo) {
    return null;
  }

  const MenuItem: React.FC<{ icon: React.ReactNode; text: string; onClick?: () => void; disabled?: boolean }> = ({ icon, text, onClick, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="w-5 mr-3 text-gray-400">{icon}</span>
      <span>{text}</span>
    </button>
  );

  const SubMenuItem: React.FC<{ icon: React.ReactNode; text: string; children: React.ReactNode; name: string }> = ({ icon, text, children, name }) => (
    <div className="relative" onMouseEnter={() => setSubmenu(name)} onMouseLeave={() => setSubmenu(null)}>
      <div className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-md transition-colors">
        <div className="flex items-center">
          <span className="w-5 mr-3 text-gray-400">{icon}</span>
          <span>{text}</span>
        </div>
        <ChevronRightIcon className="h-4 w-4" />
      </div>
      {submenu === name && (
        <div className="absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 p-1 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 w-56 z-10">
          {children}
        </div>
      )}
    </div>
  );

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: position.y, left: position.x }}
      className="fixed z-50 w-64 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 animate-fade-in-fast"
    >
      <div className="space-y-1">
        <MenuItem icon={<CloudArrowDownIcon className="h-5 w-5"/>} text="Check for Updates" onClick={() => actions.onRefreshRepoState(repo.id)} />
        {repo.tasks.length > 0 && (
          <SubMenuItem icon={<PlayIcon className="h-5 w-5"/>} text="Run Task" name="tasks">
            {repo.tasks.map(task => (
              <MenuItem key={task.id} icon={<PlayIcon className="h-5 w-5"/>} text={task.name} onClick={() => actions.onRunTask(repo.id, task.id)} />
            ))}
          </SubMenuItem>
        )}
        {launchables.length > 0 && (
          <SubMenuItem icon={<LightningBoltIcon className="h-5 w-5"/>} text="Launch..." name="launch">
             {launchables.map((launchable, idx) => (
                <MenuItem 
                    key={idx}
                    icon={<LightningBoltIcon className="h-5 w-5"/>} 
                    text={launchable.type === 'manual' ? launchable.config.name : launchable.path}
                    onClick={() => actions.onRunLaunchable(repo, launchable)} 
                />
            ))}
          </SubMenuItem>
        )}
        <hr className="my-1 border-gray-200 dark:border-gray-700" />
        <MenuItem icon={<FolderIcon className="h-5 w-5"/>} text="Open Folder" onClick={() => actions.onOpenLocalPath(repo.localPath)} />
        <MenuItem icon={<TerminalIcon className="h-5 w-5"/>} text="Open in Terminal" onClick={() => actions.onOpenTerminal(repo.localPath)} />
        <hr className="my-1 border-gray-200 dark:border-gray-700" />
        <MenuItem icon={<DocumentTextIcon className="h-5 w-5"/>} text="View Logs" onClick={() => actions.onViewLogs(repo.id)} />
        <MenuItem icon={<ClockIcon className="h-5 w-5"/>} text="View History" onClick={() => actions.onViewHistory(repo.id)} />
        <hr className="my-1 border-gray-200 dark:border-gray-700" />
        <MenuItem icon={<PencilIcon className="h-5 w-5"/>} text="Configure..." onClick={() => actions.onEditRepo(repo.id)} />
        <MenuItem icon={<TrashIcon className="h-5 w-5"/>} text="Delete..." onClick={() => actions.onDeleteRepo(repo.id)} />
      </div>
    </div>,
    document.body
  );
};

export default ContextMenu;
