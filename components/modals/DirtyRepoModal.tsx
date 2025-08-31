import React from 'react';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';

interface DirtyRepoModalProps {
  isOpen: boolean;
  statusOutput: string;
  onChoose: (choice: 'stash' | 'force' | 'cancel') => void;
}

const DirtyRepoModal: React.FC<DirtyRepoModalProps> = ({ isOpen, statusOutput, onChoose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" 
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
      onMouseDown={() => onChoose('cancel')} // clicking backdrop cancels
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 transform transition-all"
        onMouseDown={(e) => e.stopPropagation()} // prevent clicks inside from closing
      >
        <div className="p-6">
          <div className="flex items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/50 sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-4 text-left flex-1">
              <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-gray-100" id="modal-title">
                Uncommitted Changes Detected
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  The repository has local changes that are not committed. Proceeding with a 'git pull' might cause conflicts or data loss.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-gray-100 dark:bg-gray-900/50 rounded-md p-3 max-h-48 overflow-y-auto">
            <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
              <code>{statusOutput}</code>
            </pre>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            onClick={() => onChoose('stash')}
          >
            Stash & Continue
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            onClick={() => onChoose('force')}
          >
            Pull Anyway
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
            onClick={() => onChoose('cancel')}
          >
            Cancel Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirtyRepoModal;