import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroBeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 01-6.23-.607L4.2 15.3m15.6 0-3.176.794a9.065 9.065 0 01-7.248 0L4.2 15.3m15.6 0a9.065 9.065 0 00-4.68-2.025M4.2 15.3a9.065 9.065 0 01-4.68 2.025" />
    </svg>
);

const LucideBeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4.5 3h15"/>
        <path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/>
        <path d="M6 14h12"/>
    </svg>
);

export const BeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide') {
        return <LucideBeakerIcon {...props} />;
    }
    return <HeroBeakerIcon {...props} />;
};
