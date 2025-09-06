import React from 'react';
import { IconContext } from '../../contexts/IconContext';

const PhosporPythonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M240,128a8,8,0,0,1-8,8H176v16h24a8,8,0,0,1,0,16H176v16h48a8,8,0,0,1,0,16H168a24,24,0,0,1-24-24V168a24,24,0,0,1,24-24h56A24,24,0,0,1,240,128Zm-88,56a8,8,0,0,0,8,8h48v16a8,8,0,0,1-16,0V200H160a24,24,0,0,1-24-24V64a24,24,0,0,1,24-24h56a24,24,0,0,1,24,24v8a8,8,0,0,1-16,0V64a8,8,0,0,0-8-8H160a8,8,0,0,0-8,8v88a8,8,0,0,0,8,8h32a8,8,0,0,1,0,16H160A8,8,0,0,0,152,184ZM88,88a8,8,0,0,0-8-8H32V64a8,8,0,0,1,16,0v8H80a24,24,0,0,1,24,24v88a24,24,0,0,1-24,24H24a24,24,0,0,1-24-24v-8a8,8,0,0,1,16,0v8a8,8,0,0,0,8,8H80a8,8,0,0,0,8-8V96A8,8,0,0,0,88,88Z" />
    </svg>
);


export const PythonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    // This is a custom icon, so it doesn't need to participate in the context switching for now.
    return <PhosporPythonIcon {...props} />;
};
