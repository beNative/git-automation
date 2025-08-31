import React, { useEffect, useRef } from 'react';
import type { LogEntry, Repository } from '../../types';
import { LogLevel } from '../../types';
import { XIcon } from '../icons/XIcon';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  repository: Repository | undefined;
}

const LOG_LEVEL_STYLES: Record<LogLevel, string> = {
  [LogLevel.Info]: 'text-gray-400',
  [LogLevel.Command]: 'text-cyan-400',
  [LogLevel.Success]: 'text-green-400',
  [LogLevel.Error]: 'text-red-400',
  [LogLevel.Warn]: 'text-yellow-400',
};

const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, logs, repository }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col mx-4">
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-gray-100">
            Logs for <span className="text-cyan-400">{repository?.name || '...'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </header>

        <main
          ref={logContainerRef}
          className="flex-grow p-4 bg-gray-900 overflow-y-auto font-mono text-sm"
        >
          {logs.map((log, index) => (
            <div key={index} className={`flex ${LOG_LEVEL_STYLES[log.level]}`}>
              <span className="flex-shrink-0 mr-4 text-gray-600">{log.timestamp}</span>
              <p className="whitespace-pre-wrap break-words">
                {log.level === LogLevel.Command && '$ '}{log.message}
              </p>
            </div>
          ))}
          {logs.length === 0 && <p className="text-gray-500">Waiting for logs...</p>}
        </main>
        
        <footer className="p-3 bg-gray-800 border-t border-gray-700">
            <button 
              onClick={onClose}
              className="w-full sm:w-auto float-right px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
            >
              Close
            </button>
        </footer>
      </div>
    </div>
  );
};

export default LogModal;
