import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const LucideCubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <line x1="3.27" x2="12" y1="6.96" y2="12.5"/>
    <line x1="12" x2="20.73" y1="12.5" y2="6.96"/>
    <line x1="12" x2="12" y1="22.08" y2="12.5"/>
  </svg>
);

const TablerCubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M21 16v-8a2 2 0 0 0 -1 -1.73l-7 -4a2 2 0 0 0 -2 0l-7 4a2 2 0 0 0 -1 1.73v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7 -4a2 2 0 0 0 1 -1.73" />
        <path d="M12 22v-10" />
        <path d="M3.27 6.96l8.73 5.04l8.73 -5.04" />
        <path d="M3.27 17.04l8.73 -5.04l8.73 5.04" />
    </svg>
);

const FeatherCubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <line x1="3.27" y1="6.96" x2="12" y2="12.5"></line>
        <line x1="12" y1="22.08" x2="12" y2="12.5"></line>
        <line x1="20.73" y1="6.96" x2="12" y2="12.5"></line>
    </svg>
);

const RemixCubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.0001 22.0001L3.93756 16.8126V7.18756L12.0001 12.3751L20.0626 7.18756V16.8126L12.0001 22.0001ZM12.0001 1.00006L21.0001 6.50006V17.5001L12.0001 23.0001L3.00006 17.5001V6.50006L12.0001 1.00006Z" />
    </svg>
);

export const CubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideCubeIcon {...props} />;
        case 'tabler': return <TablerCubeIcon {...props} />;
        case 'remix': return <RemixCubeIcon {...props} />;
        case 'feather':
        default:
            return <FeatherCubeIcon {...props} />;
    }
};