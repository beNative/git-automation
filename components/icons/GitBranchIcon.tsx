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

export const GitBranchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide') {
        return <LucideGitBranchIcon {...props} />;
    }
    return <HeroGitBranchIcon {...props} />;
};
