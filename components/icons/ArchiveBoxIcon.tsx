import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const LucideArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/>
    <path d="M21 3H3v5h18V3z"/>
    <path d="M10 12h4"/>
  </svg>
);

const TablerArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 4m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
        <path d="M5 10v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-10" />
        <path d="M10 14h4" />
    </svg>
);

const FeatherArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"></path>
        <rect x="1" y="3" width="22" height="5"></rect>
        <line x1="10" y1="12" x2="14" y2="12"></line>
    </svg>
);

const RemixArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M3 3H21C21.5523 3 22 3.44772 22 4V8C22 8.55228 21.5523 9 21 9H3C2.44772 9 2 8.55228 2 8V4C2 3.44772 2.44772 3 3 3ZM4 10H20V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V10ZM10.5 14H13.5V16H10.5V14Z" />
    </svg>
);

const PhosphorArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M224,88H32a8,8,0,0,0-8,8V208a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V96A8,8,0,0,0,224,88Zm-96,64a8,8,0,0,1-8,8H104a8,8,0,0,1,0-16h16A8,8,0,0,1,128,152Zm96-88H32a8,8,0,0,0-8,8V80H232V72A8,8,0,0,0,224,64Z" />
    </svg>
);


export const ArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideArchiveBoxIcon {...props} />;
        case 'feather': return <FeatherArchiveBoxIcon {...props} />;
        case 'tabler': return <TablerArchiveBoxIcon {...props} />;
        case 'remix': return <RemixArchiveBoxIcon {...props} />;
        case 'phosphor': return <PhosphorArchiveBoxIcon {...props} />;
        case 'heroicons':
        default:
            return <HeroArchiveBoxIcon {...props} />;
    }
};