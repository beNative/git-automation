import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const LucideArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 5v14"/>
    <path d="m19 12-7 7-7-7"/>
  </svg>
);

const TablerArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 5l0 14" />
        <path d="M18 13l-6 6" />
        <path d="M6 13l6 6" />
    </svg>
);

const FeatherArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <polyline points="19 12 12 19 5 12"></polyline>
    </svg>
);

const RemixArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M13 16.1716L18.364 10.8076L19.7782 12.2218L12.0002 20L4.22217 12.2218L5.63639 10.8076L11 16.1716V4H13V16.1716Z" />
    </svg>
);

export const ArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideArrowDownIcon {...props} />;
        case 'tabler': return <TablerArrowDownIcon {...props} />;
        case 'remix': return <RemixArrowDownIcon {...props} />;
        case 'feather':
        default:
            return <FeatherArrowDownIcon {...props} />;
    }
};