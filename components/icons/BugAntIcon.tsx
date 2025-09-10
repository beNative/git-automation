import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const LucideBugAntIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m18 10 2-2"/>
    <path d="m16 8-2.5 2.5"/>
    <path d="M12 14v-2.5"/>
    <path d="M10 11.5 7.5 9"/>
    <path d="m6 10-2-2"/>
    <path d="m6 14 2 2"/>
    <path d="M8 16l2.5-2.5"/>
    <path d="M12 14v2.5"/>
    <path d="m14 11.5 2.5 2.5"/>
    <path d="m18 14 2 2"/>
    <path d="M15 22v-4.5"/>
    <path d="M9 22v-4.5"/>
    <path d="M12 17.5a2.5 2.5 0 0 0 0-5h0a2.5 2.5 0 0 0 0 5Z"/>
    <path d="M12 12.5a5 5 0 0 0-5-5h0a5 5 0 0 0-5 5v0a5 5 0 0 0 5 5"/>
    <path d="M12 12.5a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5"/>
  </svg>
);

const TablerBugAntIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M9 12h6" />
        <path d="M12 9v6" />
        <path d="M13 14l5 4" />
        <path d="M7 18l-2 2" />
        <path d="M11 14l-5 4" />
        <path d="M17 18l2 2" />
        <path d="M4 9l2 2" />
        <path d="M20 9l-2 2" />
        <path d="M8 6l2 2" />
        <path d="M16 6l-2 2" />
    </svg>
);

const FeatherBugAntIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="8" y1="6" x2="16" y2="6"></line>
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="22" x2="12" y2="18"></line>
        <line x1="17" y1="20" x2="12" y2="18"></line>
        <line x1="7" y1="20" x2="12" y2="18"></line>
        <line x1="20" y1="13" x2="16" y2="12"></line>
        <line x1="4" y1="13" x2="8" y2="12"></line>
        <path d="M16,16a4,4,0,0,1-8,0"></path>
    </svg>
);

const RemixBugAntIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 20C12 21.1046 11.1046 22 10 22H8C6.89543 22 6 21.1046 6 20V14H4V11C4 7.68629 6.68629 5 10 5H14C17.3137 5 20 7.68629 20 11V14H18V20C18 21.1046 17.1046 22 16 22H14C12.8954 22 12 21.1046 12 20V14H10V20ZM10 12H14V11C14 8.79086 12.2091 7 10 7H14C11.7909 7 10 8.79086 10 11V12ZM4.23746 4.81183L5.65167 6.22604L4.23746 7.64025L2.82325 6.22604L4.23746 4.81183ZM19.7625 4.81183L21.1768 6.22604L19.7625 7.64025L18.3483 6.22604L19.7625 4.81183Z" />
    </svg>
);

export const BugAntIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideBugAntIcon {...props} />;
        case 'tabler': return <TablerBugAntIcon {...props} />;
        case 'remix': return <RemixBugAntIcon {...props} />;
        case 'feather':
        default:
            return <FeatherBugAntIcon {...props} />;
    }
};