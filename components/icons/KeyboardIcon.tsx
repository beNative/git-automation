import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroKeyboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25v13.5m-3-13.5h15M3.75 5.25c0-1.036.84-1.875 1.875-1.875h13.5c1.036 0 1.875.84 1.875 1.875v13.5c0 1.036-.84 1.875-1.875 1.875h-13.5A1.875 1.875 0 013.75 18.75V5.25zM12 18.75v-6.75a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v6.75" />
  </svg>
);


const LucideKeyboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="16" x="2" y="4" rx="2" ry="2"/>
    <path d="M6 8h.01"/>
    <path d="M10 8h.01"/>
    <path d="M14 8h.01"/>
    <path d="M18 8h.01"/>
    <path d="M8 12h.01"/>
    <path d="M12 12h.01"/>
    <path d="M16 12h.01"/>
    <path d="M7 16h10"/>
  </svg>
);

const TablerKeyboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M2 6m0 2a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z" />
        <path d="M6 10l0 .01" />
        <path d="M10 10l0 .01" />
        <path d="M14 10l0 .01" />
        <path d="M18 10l0 .01" />
        <path d="M6 14l0 .01" />
        <path d="M18 14l0 .01" />
        <path d="M10 14h4" />
    </svg>
);

export const KeyboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide') {
        return <LucideKeyboardIcon {...props} />;
    }
    if (iconSet === 'tabler') {
        return <TablerKeyboardIcon {...props} />;
    }
    return <HeroKeyboardIcon {...props} />;
};