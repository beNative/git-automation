import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroCodeBracketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
  </svg>
);

const LucideCodeBracketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m10 10-4.5 10"/>
    <path d="M14 4l6 6-6 6"/>
    <path d="m10 4-6 6 6 6"/>
  </svg>
);

const TablerCodeBracketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M7 8l-4 4l4 4" />
        <path d="M17 8l4 4l-4 4" />
        <path d="M14 4l-4 16" />
    </svg>
);

const FeatherCodeBracketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
);

const RemixCodeBracketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M9.41421 8.58579L10.8284 7.17157L5.63604 2L4.22183 3.41421L9.41421 8.58579ZM14.5858 8.58579L19.7782 3.41421L18.364 2L13.1716 7.17157L14.5858 8.58579ZM12 21C11.6667 18.3333 11 15.6667 10 13C11.3333 11.6667 12.6667 10.3333 14 9C13 12.3333 12.3333 15.6667 12 19V21Z" />
    </svg>
);

const PhosphorCodeBracketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M83.06,179.06a8,8,0,0,1,0,11.31l-42.34,42.34a8,8,0,0,1-11.32-11.32L71.75,179.06a8,8,0,0,1,11.31,0ZM224,32v96a8,8,0,0,1-16,0V47.31l-50.34,50.35a8,8,0,0,1-11.32-11.32L196.69,32H128a8,8,0,0,1,0-16h96A8,8,0,0,1,224,32Zm-61.66,93.66a8,8,0,0,0-11.32,11.32L201.31,188H128a8,8,0,0,0,0,16h72a8,8,0,0,0,5.66-13.66ZM94.34,149.66a8,8,0,0,0-11.32-11.32L32,189.31V128a8,8,0,0,0-16,0v64a8,8,0,0,0,8,8h64a8,8,0,0,0,0-16H42.69Z" />
    </svg>
);



export const CodeBracketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideCodeBracketIcon {...props} />;
        case 'feather': return <FeatherCodeBracketIcon {...props} />;
        case 'tabler': return <TablerCodeBracketIcon {...props} />;
        case 'remix': return <RemixCodeBracketIcon {...props} />;
        case 'phosphor': return <PhosphorCodeBracketIcon {...props} />;
        case 'heroicons':
        default:
            return <HeroCodeBracketIcon {...props} />;
    }
};