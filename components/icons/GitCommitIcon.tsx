import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const LucideGitCommitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="3"/>
    <line x1="3" x2="9" y1="12" y2="12"/>
    <line x1="15" x2="21" y1="12" y2="12"/>
  </svg>
);

const TablerGitCommitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        <path d="M12 3l0 6" />
        <path d="M12 15l0 6" />
    </svg>
);

const FeatherGitCommitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="4"></circle>
        <line x1="1.05" y1="12" x2="7" y2="12"></line>
        <line x1="17.01" y1="12" x2="22.96" y2="12"></line>
    </svg>
);

const RemixGitCommitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 4.00001L12 9.00001C12 9.55229 11.5523 10 11 10H4.00001L4.00001 14H11C11.5523 14 12 14.4477 12 15L12 20C17.5228 20 22 15.5228 22 10C22 4.47715 17.5228 0 12 0C6.47715 0 2 4.47715 2 10L2 14L2 14.0001H3.99999L4.00001 12L10 12L10 12.0001H11L11 14.0001H10V14.0001L10 14L10 14H9.99999L4.00001 14V12H9.99999C10.5523 12 11 11.5523 11 11L11 4.00001C16.5228 4.00001 21 8.47716 21 14C21 19.5228 16.5228 24 11 24C5.47715 24 1 19.5228 1 14L1 10C1 4.47715 5.47715 0 11 0L12 4.00001Z" />
    </svg>
);

const PhosphorGitCommitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M248,128a8,8,0,0,1-8,8H176a40,40,0,1,0-40,40v40a8,8,0,0,1-16,0V176a40,40,0,1,0-40-40H8a8,8,0,0,1,0-16H80a40,40,0,1,0,40-40V8a8,8,0,0,1,16,0V80a40,40,0,1,0,40,40h64A8,8,0,0,1,248,128ZM128,152a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z" />
    </svg>
);


export const GitCommitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideGitCommitIcon {...props} />;
        case 'feather': return <FeatherGitCommitIcon {...props} />;
        case 'tabler': return <TablerGitCommitIcon {...props} />;
        case 'remix': return <RemixGitCommitIcon {...props} />;
        case 'phosphor': return <PhosphorGitCommitIcon {...props} />;
        // Heroicons does not have a direct 'git-commit' icon. Using Lucide as a high-quality fallback.
        case 'heroicons':
        default:
            return <LucideGitCommitIcon {...props} />;
    }
};