import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroCogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m15-3.75l-1.5-1.5m0 0l-1.5 1.5m1.5-1.5V3m0 18v-1.5m-15-3.75l1.5 1.5m0 0l1.5-1.5m-1.5 1.5V21m0-18v1.5" />
  </svg>
);

const LucideCogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/>
        <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/>
        <path d="M12 22v-2"/>
        <path d="m17 20.66-1-1.73"/>
        <path d="m11 10.27 7-3.92"/>
        <path d="m7 3.34 1 1.73"/>
        <path d="m13 13.73-7 3.92"/>
        <path d="m17 3.34-1 1.73"/>
        <path d="m11 13.73 7 3.92"/>
        <path d="m7 20.66 1-1.73"/>
        <path d="m13 10.27-7-3.92"/>
    </svg>
);

export const CogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide') {
        return <LucideCogIcon {...props} />;
    }
    return <HeroCogIcon {...props} />;
};
