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
          
          <div className="text-sm">
            <p>Design and concept by Tim Sinaeve</p>
            <p>Implementation by Gemini 2.5 Pro</p>
          </div>
          
          <p className="text-xs text-gray-400 dark:text-gray-500 pt-4">
            © 2025 Tim Sinaeve
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6 flex justify-end rounded-b-lg">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 sm:w-auto sm:text-sm"
            onClick={onClose}
            data-automation-id="about-modal-dismiss"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;