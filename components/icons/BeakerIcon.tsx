import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

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

export const BeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideBeakerIcon {...props} />;
        case 'tabler': return <TablerBeakerIcon {...props} />;
        case 'remix': return <RemixBeakerIcon {...props} />;
        case 'feather':
        default:
            return <FeatherBeakerIcon {...props} />;
    }
};