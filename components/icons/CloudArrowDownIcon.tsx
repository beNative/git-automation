import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroCloudArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
  </svg>
);

const LucideCloudArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 17V3"/>
    <path d="m6 11 6 6 6-6"/>
    <path d="M16 16.5A5.56 5.56 0 0 0 21 11a8 8 0 0 0-16 0 5.5 5.5 0 0 0 10 4.5"/>
  </svg>
);

const TablerCloudArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 13v-7" />
        <path d="M9 10l3 3l3 -3" />
        <path d="M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1" />
    </svg>
);

const FeatherCloudArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="8 17 12 21 16 17"></polyline>
        <line x1="12" y1="12" x2="12" y2="21"></line>
        <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path>
    </svg>
);

const RemixCloudArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M13 13.1716L18.364 7.80756L19.7782 9.22177L12.0002 17L4.22217 9.22177L5.63639 7.80756L11 13.1716V2H13V13.1716Z" />
    </svg>
);

const PhosphorCloudArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M160,128a8,8,0,0,1-8,8H104a8,8,0,0,1,0-16h48A8,8,0,0,1,160,128ZM96,96a8,8,0,0,0,8-8V40a8,8,0,0,0-16,0V88A8,8,0,0,0,96,96Zm48-8a8,8,0,0,0,8,8h48a8,8,0,0,0,0-16H152A8,8,0,0,0,144,88Zm-88,0a8,8,0,0,0,8-8V40a8,8,0,0,0-16,0V80A8,8,0,0,0,56,88Zm160,32a88,88,0,0,1-176,0c0-43,28.18-79.35,67.56-86.63a8,8,0,0,1,8.32,10,51.84,51.84,0,0,0,8.24,0A8,8,0,0,1,130.44,33.37C169.82,26.1,198,62.43,198,104a8,8,0,0,1-16,0,72,72,0,0,0-144,0c0,35.15,26.37,64.57,60.68,69.75a8,8,0,0,1-6.12,14.5A88,88,0,0,1,216,120Z" />
    </svg>
);



export const CloudArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideCloudArrowDownIcon {...props} />;
        case 'feather': return <FeatherCloudArrowDownIcon {...props} />;
        case 'tabler': return <TablerCloudArrowDownIcon {...props} />;
        case 'remix': return <RemixCloudArrowDownIcon {...props} />;
        case 'phosphor': return <PhosphorCloudArrowDownIcon {...props} />;
        case 'heroicons':
        default:
            return <HeroCloudArrowDownIcon {...props} />;
    }
};