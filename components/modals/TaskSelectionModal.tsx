import React from 'react';
import type { Repository } from '../../types';
import { CubeTransparentIcon } from '../icons/CubeTransparentIcon';
import { PlayIcon } from '../icons/PlayIcon';
import { XIcon } from '../icons/XIcon';

interface TaskSelectionModalProps {
  isOpen: boolean;
  repository: Repository | null;
  onSelect: (taskId: string) => void;
  onClose: () => void;
}

const TaskSelectionModal: React.FC<TaskSelectionModalProps> = ({ isOpen, repository, onSelect, onClose }) => {
  if (!isOpen || !repository) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
      data-automation-id="task-selection-modal"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-all"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <CubeTransparentIcon className="h-6 w-6 text-blue-500 mr-3" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100" id="modal-title">
                Run Task on '{repository.name}'
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Select a task to execute.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            data-automation-id="task-selection-close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto">
            <ul className="space-y-2">
                {repository.tasks.map(task => (
                    <li key={task.id}>
                        <button
                            onClick={() => onSelect(task.id)}
                            className="w-full flex items-center text-left p-3 rounded-md bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 hover:ring-2 ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            data-automation-id={`task-selection-item-${task.id}`}
                        >
                            <PlayIcon className="h-5 w-5 text-green-500 mr-4 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{task.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{task.steps.length} step(s)</p>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  );
};

export default TaskSelectionModal;