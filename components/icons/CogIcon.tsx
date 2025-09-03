import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroCogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m15-3.75l-1.5-1.5m0 0l-1.5 1.5m1.5-1.5V3m0 18v-1.5m-15-3.75l1.5 1.5m0 0l1.5-1.5m-1.5 1.5V21m0-18v1.5" />
  </svg>
);

const LucideCogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/>
        <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/>
        <path d="M12 22v-2"/>
        <path d="m17 20.66-1-1.73"/>
        <path d="m11 10.27 7-3.92"/>
        <path d="m7 3.34 1 1.73"/>
        <path d="m13 13.73-7 3.92"/>
        <path d="m17 3.34-1 1.73"/>
        <path d="m11 13.73 7 3.92"/>
        <path d="m7 20.66 1-1.73"/>
        <path d="m13 10.27-7-3.92"/>
    </svg>
);

const TablerCogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
        <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
    </svg>
);

const FeatherCogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
);

const RemixCogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 1.99998C13.0523 1.99998 14.0723 2.21045 15.0221 2.61986L15.3965 2.78401L15.9363 2.27415C16.891 1.40113 18.2598 1.47209 19.1328 2.42682L19.2259 2.53668L19.7358 2.02682C20.6627 1.0268 22.2034 1.0268 23.1303 2.02682C24.0572 3.02685 24.0572 4.56756 23.1303 5.56758L22.6204 6.07744L22.7846 6.45185C23.194 7.40167 23.4045 8.42171 23.4045 9.47401C23.4045 10.5263 23.194 11.5463 22.7846 12.4962L22.6204 12.8706L23.1303 13.3804C24.0572 14.3804 24.0572 15.9212 23.1303 16.9212C22.2034 17.9212 20.6627 17.9212 19.7358 16.9212L19.2259 16.4113L18.8515 16.5755C17.9017 16.9849 16.8816 17.1954 15.8293 17.1954C14.777 17.1954 13.757 16.9849 12.8072 16.5755L12.4328 16.4113L11.9229 16.9212C10.9682 17.7942 9.59938 17.8652 8.72636 17.0177L8.6165 16.9212L8.10664 17.431C7.17974 18.431 5.63903 18.431 4.71213 17.431C3.78523 16.4311 3.78523 14.8904 4.71213 13.8904L5.22199 13.3805L5.05784 13.0061C4.64843 12.0563 4.43796 11.0363 4.43796 9.98398C4.43796 8.93168 4.64843 7.91164 5.05784 6.96182L5.22199 6.58741L4.71213 6.07755C3.78523 5.07753 3.78523 3.53682 4.71213 2.53679C5.63903 1.53677 7.17974 1.53677 8.10664 2.53679L8.6165 3.04665L8.99091 2.8825C9.94073 2.47309 10.9608 2.26262 12 1.99998ZM12 8.99998C13.6568 8.99998 15 10.3431 15 12C15 13.6568 13.6568 15 12 15C10.3432 15 9 13.6568 9 12C9 10.3431 10.3432 8.99998 12 8.99998Z" />
    </svg>
);

const PhosphorCogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M222.1,114.2l-32.2,27.8a95.5,95.5,0,0,1,0,28l32.2,27.8a8.1,8.1,0,0,1,2.8,11.2,7.9,7.9,0,0,1-4.9,2.8,8.2,8.2,0,0,1-6.3-1.7l-34.9-22a95.2,95.2,0,0,1-23.8,16.9l-11.2,35.9a8.1,8.1,0,0,1-7.8,6.1,8.3,8.3,0,0,1-7.8-6.1l-11.2-35.9a95.2,95.2,0,0,1-23.8-16.9l-34.9,22a8.2,8.2,0,0,1-6.3,1.7,7.9,7.9,0,0,1-4.9-2.8,8.1,8.1,0,0,1,2.8-11.2l32.2-27.8a95.5,95.5,0,0,1,0-28L33.9,86.2a8.1,8.1,0,0,1-2.8-11.2,7.9,7.9,0,0,1,4.9-2.8,8.2,8.2,0,0,1,6.3,1.7l34.9,22a95.2,95.2,0,0,1,23.8-16.9l11.2-35.9a8.1,8.1,0,0,1,7.8-6.1,8.3,8.3,0,0,1,7.8,6.1l11.2,35.9a95.2,95.2,0,0,1,23.8,16.9l34.9-22a8.2,8.2,0,0,1,6.3-1.7,7.9,7.9,0,0,1,4.9,2.8A8.1,8.1,0,0,1,222.1,114.2ZM128,168a40,40,0,1,0-40-40A40,40,0,0,0,128,168Z" />
    </svg>
);

export const CogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideCogIcon {...props} />;
        case 'feather': return <FeatherCogIcon {...props} />;
        case 'tabler': return <TablerCogIcon {...props} />;
        case 'remix': return <RemixCogIcon {...props} />;
        case 'phosphor': return <PhosphorCogIcon {...props} />;
        case 'heroicons':
        default:
            return <HeroCogIcon {...props} />;
    }
};