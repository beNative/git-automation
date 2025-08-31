import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroXIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LucideXIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>
  </svg>
);

export const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide') {
        return <LucideXIcon {...props} />;
    }
    return <HeroXIcon {...props} />;
};
