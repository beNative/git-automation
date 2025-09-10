import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const LucideChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const TablerChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M6 9l6 6l6 -6" />
    </svg>
);

const FeatherChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

const RemixChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 13.1716L16.9497 8.22183L18.364 9.63604L12 16L5.63604 9.63604L7.05025 8.22183L12 13.1716Z" />
    </svg>
);

export const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideChevronDownIcon {...props} />;
        case 'tabler': return <TablerChevronDownIcon {...props} />;
        case 'remix': return <RemixChevronDownIcon {...props} />;
        case 'feather':
        default:
            return <FeatherChevronDownIcon {...props} />;
    }
};