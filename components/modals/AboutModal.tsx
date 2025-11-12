import React from 'react';
import { InformationCircleIcon } from '../icons/InformationCircleIcon';
import { XIcon } from '../icons/XIcon';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  appVersion: string;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, appVersion }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
      data-automation-id="about-modal"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-all"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <InformationCircleIcon className="h-6 w-6 text-blue-500 mr-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100" id="modal-title">
              About
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            data-automation-id="about-modal-close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 text-center text-gray-700 dark:text-gray-300 space-y-4">
          <p className="font-bold text-xl">Git Automation Dashboard</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Version {appVersion}</p>

          <p className="text-sm">© 2025 Tim Sinaeve. All rights reserved.</p>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              className="flex-1 inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 px-4 py-1.5 bg-white dark:bg-gray-700 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
              onClick={() => window.electronAPI?.openWeblink('https://github.com/beNative/git-automation')}
              data-automation-id="about-modal-open-github"
            >
              View on GitHub
            </button>
            <button
              type="button"
              className="flex-1 inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 px-4 py-1.5 bg-white dark:bg-gray-700 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
              onClick={() => window.electronAPI?.openInstallationFolder?.()}
              data-automation-id="about-modal-open-installation-folder"
            >
              Open Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
