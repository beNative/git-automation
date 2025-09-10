import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const LucideArrowRightOnRectangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
    <polyline points="10 17 15 12 10 7"/>
    <line x1="15" x2="3" y1="12" y2="12"/>
  </svg>
);

const TablerArrowRightOnRectangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M7 12h14l-3 -3m0 6l3 -3" />
        <path d="M12 4v4h-4a4 4 0 0 0 0 8h4v4" />
    </svg>
);

const FeatherArrowRightOnRectangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
        <polyline points="10 17 15 12 10 7"></polyline>
        <line x1="15" y1="12" x2="3" y2="12"></line>
    </svg>
);

const RemixArrowRightOnRectangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M5 11H11V5H5V11ZM7 7H9V9H7V7Z" />
        <path d="M5 13H11V19H5V13ZM7 15H9V17H7V15Z" />
        <path d="M13 5H19V11H13V5ZM15 7H17V9H15V7Z" />
        <path d="M13 13H19V19H13V13ZM15 15H17V17H15V15Z" />
        <path d="M13 13H19V19H13V13ZM15 15H17V17H15V15Z" />
    </svg>
);

export const ArrowRightOnRectangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideArrowRightOnRectangleIcon {...props} />;
        case 'tabler': return <TablerArrowRightOnRectangleIcon {...props} />;
        case 'remix': return <RemixArrowRightOnRectangleIcon {...props} />;
        case 'feather':
        default:
            return <FeatherArrowRightOnRectangleIcon {...props} />;
    }
};