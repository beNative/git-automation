import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroCubeTransparentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 01-4.5 0m4.5 0l-4.5 4.5m4.5-4.5l4.5 4.5M14.25 12l-4.5 4.5m4.5-4.5l4.5 4.5M3.75 12a14.25 14.25 0 0016.5 0M3.75 12v-.75A14.25 14.25 0 0112 3.75v.75m0 0v-1.5m0 1.5v.75m0 0v.75m0-1.5v.75m-6.375 6.375a14.25 14.25 0 0112.75 0" />
  </svg>
);

const LucideCubeTransparentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <line x1="3.27" x2="10" y1="6.96" y2="12.5"/>
    <line x1="14" x2="20.73" y1="12.5" y2="6.96"/>
    <polyline points="10 12.5 10 22"/>
    <polyline points="14 12.5 14 22"/>
    <polyline points="3.27 17.04 10 22.5"/>
    <polyline points="14 22.5 20.73 17.04"/>
  </svg>
);

const TablerCubeTransparentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 4m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
        <path d="M3 9.5l18 0" />
        <path d="M12 4v16" />
    </svg>
);

export const CubeTransparentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide') {
        return <LucideCubeTransparentIcon {...props} />;
    }
    if (iconSet === 'tabler') {
        return <TablerCubeTransparentIcon {...props} />;
    }
    return <HeroCubeTransparentIcon {...props} />;
};