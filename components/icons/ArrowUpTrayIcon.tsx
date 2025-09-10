import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const LucideArrowUpTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

const TablerArrowUpTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
        <path d="M7 9l5 -5l5 5" />
        <path d="M12 4l0 12" />
    </svg>
);

const FeatherArrowUpTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
);

const RemixArrowUpTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M3 19H21V21H3V19ZM13 5.82843L18.364 11.1924L19.7782 9.77817L12.0002 2L4.22217 9.77817L5.63639 11.1924L11 5.82843V17H13V5.82843Z" />
    </svg>
);

export const ArrowUpTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideArrowUpTrayIcon {...props} />;
        case 'tabler': return <TablerArrowUpTrayIcon {...props} />;
        case 'remix': return <RemixArrowUpTrayIcon {...props} />;
        case 'feather':
        default:
            return <FeatherArrowUpTrayIcon {...props} />;
    }
};