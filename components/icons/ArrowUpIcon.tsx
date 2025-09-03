import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroArrowUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
  </svg>
);

const LucideArrowUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 19V5"/>
    <path d="m5 12 7-7 7 7"/>
  </svg>
);

const TablerArrowUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 5l0 14" />
        <path d="M18 11l-6 -6" />
        <path d="M6 11l6 -6" />
    </svg>
);

const FeatherArrowUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
);

const RemixArrowUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M13 7.82843V20H11V7.82843L5.63604 13.1924L4.22183 11.7782L12 4L19.7782 11.7782L18.364 13.1924L13 7.82843Z" />
    </svg>
);

const PhosphorArrowUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M213.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L188.69,136H40a8,8,0,0,1,0-16H188.69L122.34,54.34a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,213.66,133.66Z" transform="rotate(-90 128 128)" />
    </svg>
);

export const ArrowUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideArrowUpIcon {...props} />;
        case 'feather': return <FeatherArrowUpIcon {...props} />;
        case 'tabler': return <TablerArrowUpIcon {...props} />;
        case 'remix': return <RemixArrowUpIcon {...props} />;
        case 'phosphor': return <PhosphorArrowUpIcon {...props} />;
        case 'heroicons':
        default:
            return <HeroArrowUpIcon {...props} />;
    }
};