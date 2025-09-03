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

const TablerBeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M6 3l8 0" />
        <path d="M6 3v16a1 1 0 0 0 1 1h8a1 1 0 0 0 1 -1v-16" />
        <path d="M6 14h8" />
    </svg>
);

const FeatherBeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4.5 3h15M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3M6 14h12"></path>
    </svg>
);

const RemixBeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.3639 18.2265L18.7782 8.5H5.2218L5.63601 18.2265C5.71261 19.8398 7.02226 21.0857 8.64295 21.0857H15.357C16.9777 21.0857 18.2874 19.8398 18.3639 18.2265ZM20 6H4V8H20V6ZM12 3V5H14V3H12ZM10 3V5H7V3H10Z" />
    </svg>
);

const PhosphorBeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M216,64H40V48a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8ZM88,80v24a8,8,0,0,0,16,0V80Zm96,24a8,8,0,0,0,8-8V80h16v16a8,8,0,0,0,8,8,8,8,0,0,0,0-16h8a8,8,0,0,0,0,16h8a8,8,0,0,0,8-8V80h16a8,8,0,0,0,0-16H232a8,8,0,0,0-8,8v8H208V72a24,24,0,0,0-24-24H48A24,24,0,0,0,24,72v8H40a8,8,0,0,0,0,16h8v8a24,24,0,0,0,24,24V80H56a8,8,0,0,0-16,0V208a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V112H88v96h96V112a8,8,0,0,0-16,0v88a8,8,0,0,1-8,8H96a8,8,0,0,1-8-8V112a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8v96H184V104a8,8,0,0,0-16,0Z" />
    </svg>
);


export const BeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideBeakerIcon {...props} />;
        case 'feather': return <FeatherBeakerIcon {...props} />;
        case 'tabler': return <TablerBeakerIcon {...props} />;
        case 'remix': return <RemixBeakerIcon {...props} />;
        case 'phosphor': return <PhosphorBeakerIcon {...props} />;
        case 'heroicons':
        default:
            return <HeroBeakerIcon {...props} />;
    }
};