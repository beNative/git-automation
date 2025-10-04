import React from 'react';
import type { Repository, LaunchConfig } from '../../types';
import { CubeIcon } from '../icons/CubeIcon';
import { XIcon } from '../icons/XIcon';
import { LightningBoltIcon } from '../icons/LightningBoltIcon';

interface ExecutableSelectionModalProps {
  isOpen: boolean;
  repository: Repository | null;
  launchConfig: LaunchConfig | null;
  executables: string[];
  onSelect: (executablePath: string) => void;
  onClose: () => void;
}

const ExecutableSelectionModal: React.FC<ExecutableSelectionModalProps> = ({ isOpen, repository, launchConfig, executables, onSelect, onClose }) => {
  if (!isOpen || !repository || !launchConfig) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
      data-automation-id="executable-selection-modal"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 transform transition-all"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <LightningBoltIcon className="h-6 w-6 text-blue-500 mr-3" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100" id="modal-title">
                {launchConfig.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Select an executable to run from '{repository.name}'</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            data-automation-id="executable-selection-close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto">
            <ul className="space-y-2">
                {executables.map((path, index) => (
                    <li key={index}>
                        <button
                            onClick={() => onSelect(path)}
                            className="w-full flex items-center text-left p-3 rounded-md bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 hover:ring-2 ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            data-automation-id={`executable-selection-item-${index}`}
                        >
                            <CubeIcon className="h-6 w-6 text-gray-500 dark:text-gray-400 mr-4 flex-shrink-0" />
                            <div className="flex-grow overflow-hidden">
                                <p className="font-mono text-sm text-gray-800 dark:text-gray-200 truncate" title={path}>{path}</p>
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

export default ExecutableSelectionModal;
