import React, { useState, useEffect } from 'react';
import { MinimizeIcon } from '../icons/MinimizeIcon';
import { MaximizeIcon } from '../icons/MaximizeIcon';
import { RestoreIcon } from '../icons/RestoreIcon';
import { XIcon } from '../icons/XIcon';

const WindowControls: React.FC = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const handleStatusChange = (_event: any, status: boolean) => {
            setIsMaximized(status);
        };
        window.electronAPI?.onWindowMaximizedStatus(handleStatusChange);
        
        return () => {
            window.electronAPI?.removeWindowMaximizedStatusListener(handleStatusChange);
        };
    }, []);

    const handleMinimize = () => window.electronAPI?.windowMinimize();
    const handleMaximize = () => window.electronAPI?.windowMaximize();
    const handleClose = () => window.electronAPI?.windowClose();
    
    const buttonStyle = "p-2 h-full w-12 flex items-center justify-center rounded-none text-gray-700 dark:text-gray-200 hover:bg-gray-300/70 dark:hover:bg-gray-700/70 focus:outline-none transition-colors";
    const closeButtonStyle = "p-2 h-full w-12 flex items-center justify-center rounded-none text-gray-700 dark:text-gray-200 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white focus:outline-none transition-colors";

    return (
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="flex items-center h-full">
            <button onClick={handleMinimize} className={buttonStyle} aria-label="Minimize">
                <MinimizeIcon className="h-4 w-4" />
            </button>
            <button onClick={handleMaximize} className={buttonStyle} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
                {isMaximized ? <RestoreIcon className="h-4 w-4" /> : <MaximizeIcon className="h-4 w-4" />}
            </button>
            <button onClick={handleClose} className={closeButtonStyle} aria-label="Close">
                <XIcon className="h-4 w-4" />
            </button>
        </div>
    );
};

export default WindowControls;
