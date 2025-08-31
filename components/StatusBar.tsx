import React from 'react';
import type { LogEntry } from '../types';
import { GitBranchIcon } from './icons/GitBranchIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { BeakerIcon } from './icons/BeakerIcon';

interface StatusBarProps {
    repoCount: number;
    processingCount: number;
    isSimulationMode: boolean;
    latestLog: LogEntry | null;
}

const StatusBar: React.FC<StatusBarProps> = ({ repoCount, processingCount, isSimulationMode, latestLog }) => {
    const LOG_LEVEL_COLOR_CLASSES: Record<string, string> = {
        info: 'text-gray-400',
        command: 'text-cyan-400',
        success: 'text-green-400',
        error: 'text-red-400',
        warn: 'text-yellow-400',
    };

    return (
        <footer className="h-7 bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 flex items-center justify-between px-3 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0 z-10">
            {/* Left Section */}
            <div className="flex items-center space-x-3">
                <div className="flex items-center" title="Total Repositories">
                    <GitBranchIcon className="h-4 w-4 mr-1.5" />
                    <span>{repoCount} Repositories</span>
                </div>
                {processingCount > 0 && (
                    <>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                        <div className="flex items-center text-cyan-600 dark:text-cyan-400" title={`${processingCount} tasks running`}>
                            <ArrowPathIcon className="h-4 w-4 mr-1.5 animate-spin" />
                            <span>{processingCount} Running</span>
                        </div>
                    </>
                )}
            </div>
            
            {/* Center Section */}
            <div className="flex-1 text-center truncate px-4" title={latestLog?.message}>
                {latestLog && (
                    <span className={LOG_LEVEL_COLOR_CLASSES[latestLog.level] || 'text-gray-400'}>
                        {latestLog.message}
                    </span>
                )}
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-3">
                {isSimulationMode && (
                    <div className="flex items-center text-yellow-600 dark:text-yellow-400" title="Simulation mode is active. No real commands will be run.">
                        <BeakerIcon className="h-4 w-4 mr-1.5" />
                        <span>Sim Mode</span>
                    </div>
                )}
            </div>
        </footer>
    );
};

export default StatusBar;
