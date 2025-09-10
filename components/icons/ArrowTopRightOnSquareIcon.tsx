import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const LucideArrowTopRightOnSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>
    <path d="m21 3-9 9"/>
    <path d="M15 3h6v6"/>
  </svg>
);

const TablerArrowTopRightOnSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M11 7h-5a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2v-5" />
        <path d="M15 6l6 -6" />
        <path d="M21 6v-3h-3" />
    </svg>
);

const FeatherArrowTopRightOnSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);


export const ArrowTopRightOnSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideArrowTopRightOnSquareIcon {...props} />;
        case 'tabler': return <TablerArrowTopRightOnSquareIcon {...props} />;
        case 'feather':
        default:
            return <FeatherArrowTopRightOnSquareIcon {...props} />;
    }
};