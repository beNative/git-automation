import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroHomeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a.75.75 0 011.06 0l8.955 8.955M3 10.5v.75a3 3 0 003 3h1.5v3a.75.75 0 00.75.75h3a.75.75 0 00.75-.75v-3H18a3 3 0 003-3v-.75" />
  </svg>
);

const LucideHomeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export const HomeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide') {
        return <LucideHomeIcon {...props} />;
    }
    return <HeroHomeIcon {...props} />;
};
