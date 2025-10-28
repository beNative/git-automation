import React from 'react';
import type { LogEntry } from '../types';
import { GitBranchIcon } from './icons/GitBranchIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { KeyboardIcon } from './icons/KeyboardIcon';
import { BugAntIcon } from './icons/BugAntIcon';
import { useTooltip } from '../hooks/useTooltip';

interface StatusBarProps {
    repoCount: number;
    processingCount: number;
    isSimulationMode: boolean;
    latestLog: LogEntry | null;
    appVersion: string;
    onToggleDebugPanel: () => void;
    onOpenAboutModal: () => void;
    commandPaletteShortcut: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ repoCount, processingCount, isSimulationMode, latestLog, appVersion, onToggleDebugPanel, onOpenAboutModal, commandPaletteShortcut }) => {
    const LOG_LEVEL_COLOR_CLASSES: Record<string, string> = {
        info: 'text-gray-500 dark:text-gray-400',
        command: 'text-blue-500 dark:text-blue-400',
        success: 'text-green-600 dark:text-green-500',
        error: 'text-red-500 dark:text-red-500',
        warn: 'text-yellow-500 dark:text-yellow-400',
    };

    const repoCountTooltip = useTooltip('Total Repositories');
    const processingTooltip = useTooltip(`${processingCount} tasks running`);
    const simModeTooltip = useTooltip('Simulation mode is active. No real commands will be run.');
    const commandPaletteTooltip = useTooltip(`Command Palette (${commandPaletteShortcut || 'Ctrl+K'})`);
    const debugPanelTooltip = useTooltip('Toggle Debug Panel (Ctrl+D)');
    const latestLogTooltip = useTooltip(latestLog?.message || '');
    const aboutTooltip = useTooltip('About this application');

    return (
        <footer className="h-[var(--status-bar-height)] bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 flex items-center justify-between px-3 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0 z-10">
            {/* Left Section */}
            <div className="flex items-center space-x-3">
                <div
 {...repoCountTooltip} className="flex items-center">
                    <GitBranchIcon className="h-4 w-4 mr-1.5" />
                    <span>{repoCount} Repositories</span>
                </div>
                {processingCount > 0 && (
                    <>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                        <div
 {...processingTooltip} className="flex items-center text-blue-500 dark:text-blue-400">
                            <ArrowPathIcon className="h-4 w-4 mr-1.5 animate-spin" />
                            <span>{processingCount} Running</span>
                        </div>
                    </>
                )}
            </div>
            
            {/* Center Section */}
            <div className="flex items-center flex-1 justify-center px-3">
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-3" />
                <div
                    {...latestLogTooltip}
                    className="flex-1 text-center truncate"
                >
                    {latestLog && (
                        <span className={LOG_LEVEL_COLOR_CLASSES[latestLog.level] || 'text-gray-400'}>
                            [{new Date(latestLog.timestamp).toLocaleTimeString()}] {latestLog.message}
                        </span>
                    )}
                </div>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-3" />
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-3">
                {isSimulationMode && (
                    <div
                        {...simModeTooltip}
                        className="flex items-center text-yellow-600 dark:text-yellow-500"
                    >
                        <BeakerIcon className="h-4 w-4 mr-1.5" />
                        <span>Sim Mode</span>
                    </div>
                )}
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                <button
                    {...debugPanelTooltip}
                    onClick={onToggleDebugPanel}
                    className="flex items-center"
                >
                    <BugAntIcon className="h-4 w-4 mr-1.5" />
                    <span>Debug</span>
                </button>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                <div
                    {...commandPaletteTooltip}
                    className="flex items-center"
                >
                    <KeyboardIcon className="h-4 w-4 mr-1.5" />
                    <span>{commandPaletteShortcut || 'Ctrl+K'}</span>
                </div>

                {appVersion && (
                    <>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                        <button
                            {...aboutTooltip}
                            onClick={onOpenAboutModal}
                            className="hover:text-blue-500 transition-colors"
                        >
                            v{appVersion}
                        </button>
                    </>
                )}
            </div>
        </footer>
    );
};

export default StatusBar;
