import React, { useState, useEffect } from 'react';
import type { LogEntry, UpdateStatus } from '../types';
import { GitBranchIcon } from './icons/GitBranchIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { KeyboardIcon } from './icons/KeyboardIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { CloudArrowDownIcon } from './icons/CloudArrowDownIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';

interface StatusBarProps {
    repoCount: number;
    processingCount: number;
    isSimulationMode: boolean;
    latestLog: LogEntry | null;
    appVersion: string;
    updateStatus: UpdateStatus;
}

const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    return <>{time.toLocaleTimeString()}</>;
};

const UpdateStatusIndicator: React.FC<{ status: UpdateStatus }> = ({ status }) => {
    switch (status) {
        case 'checking':
            return <div className="flex items-center" title="Checking for updates..."><ArrowPathIcon className="h-4 w-4 mr-1.5 animate-spin" /> Checking...</div>;
        case 'up-to-date':
            return <div className="flex items-center text-green-600 dark:text-green-500" title="Application is up-to-date"><CheckCircleIcon className="h-4 w-4 mr-1.5" /> Up to date</div>;
        case 'available':
            return <div className="flex items-center text-blue-600 dark:text-blue-400" title="A new version is available!"><CloudArrowDownIcon className="h-4 w-4 mr-1.5" /> Update available</div>;
        case 'error':
            return <div className="flex items-center text-red-600 dark:text-red-500" title="Could not check for updates."><ExclamationCircleIcon className="h-4 w-4 mr-1.5" /> Update failed</div>;
        default:
            return null;
    }
};

const StatusBar: React.FC<StatusBarProps> = ({ repoCount, processingCount, isSimulationMode, latestLog, appVersion, updateStatus }) => {
    const LOG_LEVEL_COLOR_CLASSES: Record<string, string> = {
        info: 'text-gray-500 dark:text-gray-400',
        command: 'text-blue-500 dark:text-blue-400',
        success: 'text-green-600 dark:text-green-500',
        error: 'text-red-500 dark:text-red-500',
        warn: 'text-yellow-500 dark:text-yellow-400',
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
                        <div className="flex items-center text-blue-500 dark:text-blue-400" title={`${processingCount} tasks running`}>
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
                        [{new Date(latestLog.timestamp).toLocaleTimeString()}] {latestLog.message}
                    </span>
                )}
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-3">
                {isSimulationMode && (
                    <div className="flex items-center text-yellow-600 dark:text-yellow-500" title="Simulation mode is active. No real commands will be run.">
                        <BeakerIcon className="h-4 w-4 mr-1.5" />
                        <span>Sim Mode</span>
                    </div>
                )}
                 <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                 <div className="flex items-center" title="Command Palette">
                    <KeyboardIcon className="h-4 w-4 mr-1.5" />
                    <span>Ctrl+K</span>
                </div>

                {appVersion && (
                    <>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                        <UpdateStatusIndicator status={updateStatus} />
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                        <span>v{appVersion}</span>
                    </>
                )}
                
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                <div className="flex items-center" title="Current Time">
                    <ClockIcon className="h-4 w-4 mr-1.5" />
                    <Clock />
                </div>
            </div>
        </footer>
    );
};

export default StatusBar;
