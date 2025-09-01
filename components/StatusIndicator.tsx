import React from 'react';
import type { DetailedStatus } from '../types';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';

interface StatusIndicatorProps {
  status: DetailedStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { files, branchInfo, isDirty } = status;
  
  const fileChanges = [
    { count: files.added, color: 'text-green-600 dark:text-green-500', label: 'added', symbol: '+' },
    { count: files.modified, color: 'text-yellow-600 dark:text-yellow-500', label: 'modified', symbol: '~' },
    { count: files.deleted, color: 'text-red-600 dark:text-red-500', label: 'deleted', symbol: '-' },
    { count: files.renamed, color: 'text-blue-600 dark:text-blue-500', label: 'renamed', symbol: 'R' },
    { count: files.untracked, color: 'text-gray-500 dark:text-gray-400', label: 'untracked', symbol: '?' },
    { count: files.conflicted, color: 'text-purple-600 dark:text-purple-500', label: 'conflicted', symbol: '!' }
  ].filter(item => item.count > 0);

  return (
    <div className="flex items-center space-x-3 text-xs mt-1.5">
      {branchInfo && (branchInfo.ahead > 0 || branchInfo.behind > 0) && (
        <div className="flex items-center space-x-2" title={`Tracking: ${branchInfo.tracking}`}>
          {branchInfo.ahead > 0 && (
            <span className="flex items-center text-gray-500 dark:text-gray-400" title={`${branchInfo.ahead} commits ahead`}>
              <ArrowUpIcon className="h-3.5 w-3.5 mr-0.5" /> {branchInfo.ahead}
            </span>
          )}
          {branchInfo.behind > 0 && (
            <span className="flex items-center text-gray-500 dark:text-gray-400" title={`${branchInfo.behind} commits behind`}>
              <ArrowDownIcon className="h-3.5 w-3.5 mr-0.5" /> {branchInfo.behind}
            </span>
          )}
        </div>
      )}
      
      {isDirty && (
        <div className="flex items-center space-x-2 font-mono">
            {fileChanges.map(change => (
                <span key={change.label} className={change.color} title={`${change.count} ${change.label}`}>
                    {change.symbol}{change.count}
                </span>
            ))}
        </div>
      )}
    </div>
  );
};
