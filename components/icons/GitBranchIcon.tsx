import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroGitBranchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 8v10m0 0a2 2 0 100 4 2 2 0 000-4zm0-10a2 2 0 100-4 2 2 0 000 4zm12 0a2 2 0 100-4 2 2 0 000 4zm0 10v.01M18 6v2a2 2 0 002 2h2" />
    </svg>
);

const LucideGitBranchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="6" x2="6" y1="3" y2="15"/>
    <circle cx="18" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M18 9a9 9 0 0 1-9 9"/>
  </svg>
);

const TablerGitBranchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M7 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
        <path d="M7 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
        <path d="M17 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
        <path d="M7 8l0 8" />
        <path d="M9 18h6a2 2 0 0 0 2 -2v-5" />
        <path d="M14 14l3 -3l-3 -3" />
    </svg>
);

const FeatherGitBranchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="6" y1="3" x2="6" y2="15"></line>
        <circle cx="18" cy="6" r="3"></circle>
        <circle cx="6" cy="18" r="3"></circle>
        <path d="M18 9a9 9 0 0 1-9 9"></path>
    </svg>
);

const RemixGitBranchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M6 3V15H5C3.34315 15 2 16.3431 2 18C2 19.6569 3.34315 21 5 21C6.65685 21 8 19.6569 8 18C8 16.3431 6.65685 15 5 15H4V3H6ZM18 11V21H20V11H18ZM18 5C16.3431 5 15 6.34315 15 8C15 9.65685 16.3431 11 18 11C19.6569 11 21 9.65685 21 8C21 6.34315 19.6569 5 18 5Z" />
    </svg>
);

const PhosphorGitBranchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M224,68a32,32,0,1,0-32,32A32,32,0,0,0,224,68Zm-32,0a24,24,0,1,1,24,24A24,24,0,0,1,192,68ZM68,160a32,32,0,1,0,32,32A32,32,0,0,0,68,160Zm0,48a24,24,0,1,1,24-24A24,24,0,0,1,68,208Zm124-92a8,8,0,0,0-8,8v12.35A56.12,56.12,0,0,0,154.26,96.5a8,8,0,0,0-10.52,12.23A40,40,0,0,1,176,140.35V168a8,8,0,0,0,16,0V140a56.06,56.06,0,0,0-29.74-49.73A8,8,0,0,0,144,80V48a8,8,0,0,0-16,0v8.68A56.15,56.15,0,0,0,88,96.42V48a8,8,0,0,0-16,0v88a8,8,0,0,0,8,8h27.65a56.12,56.12,0,0,0,39.85,39.74,8,8,0,0,0,4.24,1.07A8,8,0,0,0,160,208V184a8,8,0,0,0-16,0v23.58A40,40,0,0,1,112.35,176H80a8,8,0,0,0-8,8v16a8,8,0,0,0,16,0v-8.68A56.15,56.15,0,0,0,128,176.42V144a8,8,0,0,0-16,0v24a8,8,0,0,0,8,8h11.62A40,40,0,0,1,96,207.65V184a8,8,0,0,0-16,0v16.42A56.12,56.12,0,0,0,119.74,240a8,8,0,1,0,8.52-13.84A40,40,0,0,1,96,184.38V160a8,8,0,0,0-16,0v8.42A56.12,56.12,0,0,0,40.26,208a8,8,0,1,0,8.52,13.84A40,40,0,0,1,16,184.38V160a8,8,0,0,0-16,0v8.42A56.12,56.12,0,0,0,.26,208a8,8,0,1,0,8.52,13.84A40,40,0,0,1-23,184.38Z" />
    </svg>
);


export const GitBranchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideGitBranchIcon {...props} />;
        case 'feather': return <FeatherGitBranchIcon {...props} />;
        case 'tabler': return <TablerGitBranchIcon {...props} />;
        case 'remix': return <RemixGitBranchIcon {...props} />;
        case 'phosphor': return <PhosphorGitBranchIcon {...props} />;
        case 'heroicons':
        default:
            return <HeroGitBranchIcon {...props} />;
    }
};