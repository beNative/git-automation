import React from 'react';
import type { DetailedStatus } from '../types';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { useTooltip } from '../hooks/useTooltip';
import { CloudArrowDownIcon } from './icons/CloudArrowDownIcon';

interface StatusIndicatorProps {
  status: DetailedStatus;
}

// A memoized sub-component to correctly use the useTooltip hook within a loop.
const FileChangeItem: React.FC<{ count: number; color: string; label: string; symbol: string }> = React.memo(({ count, color, label, symbol }) => {
  const tooltip = useTooltip(`${count} ${label}`);
  return (
    <span
      // @ts-ignore
      {...tooltip}
      className={color}
    >
      {symbol}{count}
    </span>
  );
});


export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { files, branchInfo, isDirty, updatesAvailable } = status;
  
  const hasUpdates = (branchInfo && branchInfo.behind > 0) || updatesAvailable;

  const fileChanges = [
    { count: files.added, color: 'text-green-600 dark:text-green-500', label: 'added', symbol: '+' },
    { count: files.modified, color: 'text-yellow-600 dark:text-yellow-500', label: 'modified', symbol: '~' },
    { count: files.deleted, color: 'text-red-600 dark:text-red-500', label: 'deleted', symbol: '-' },
    { count: files.renamed, color: 'text-blue-600 dark:text-blue-500', label: 'renamed', symbol: 'R' },
    { count: files.untracked, color: 'text-gray-500 dark:text-gray-400', label: 'untracked', symbol: '?' },
    { count: files.conflicted, color: 'text-purple-600 dark:text-purple-500', label: 'conflicted', symbol: '!' }
  ].filter(item => item.count > 0);

  // Using hooks at the top level of the component is correct.
  const aheadTooltip = useTooltip(`${branchInfo?.ahead} commits ahead`);
  const behindTooltip = useTooltip(`${branchInfo?.behind} commits behind`);
  const trackingTooltip = useTooltip(`Tracking: ${branchInfo?.tracking}`);
  const updatesTooltip = useTooltip('Updates available to pull/update');

  return (
    <div className="flex items-center justify-end flex-wrap gap-x-3 gap-y-1 text-xs">
       {hasUpdates && (
        <span
          // @ts-ignore
          {...updatesTooltip}
          className="flex items-center text-cyan-600 dark:text-cyan-400 font-semibold"
        >
          <CloudArrowDownIcon className="h-4 w-4 mr-1" />
          <span>Updates Available</span>
        </span>
      )}
      {branchInfo && (branchInfo.ahead > 0 || branchInfo.behind > 0) && (
        <div
          // @ts-ignore
          {...trackingTooltip}
          className="flex items-center space-x-2"
        >
          {branchInfo.ahead > 0 && (
            <span
              // @ts-ignore
              {...aheadTooltip}
              className="flex items-center text-gray-500 dark:text-gray-400"
            >
              <ArrowUpIcon className="h-3.5 w-3.5 mr-0.5" /> {branchInfo.ahead}
            </span>
          )}
          {branchInfo.behind > 0 && (
            <span
              // @ts-ignore
              {...behindTooltip}
              className="flex items-center text-gray-500 dark:text-gray-400"
            >
              <ArrowDownIcon className="h-3.5 w-3.5 mr-0.5" /> {branchInfo.behind}
            </span>
          )}
        </div>
      )}
      
      {isDirty && (
        <div className="flex items-center space-x-2 font-mono">
          {fileChanges.map(change => (
            <FileChangeItem
              key={change.label}
              count={change.count}
              color={change.color}
              label={change.label}
              symbol={change.symbol}
            />
          ))}
        </div>
      )}
    </div>
  );
};