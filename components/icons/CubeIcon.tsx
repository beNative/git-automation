import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroCubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

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
        <path d="M21 16.5l-9 5.5l-9 -5.5" />
        <path d="M3 7.5l9 5.5l9 -5.5" />
        <path d="M21 7.5v9" />
        <path d="M3 7.5v9" />
        <path d="M12 2v5.5" />
        <path d="M12 13v9" />
    </svg>
);

export const CubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide') {
        return <LucideCubeIcon {...props} />;
    }
    if (iconSet === 'tabler') {
        return <TablerCubeIcon {...props} />;
    }
    return <HeroCubeIcon {...props} />;
};