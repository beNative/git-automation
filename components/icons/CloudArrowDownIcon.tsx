import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroCloudArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
  </svg>
);

const LucideCloudArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 17V3"/>
    <path d="m6 11 6 6 6-6"/>
    <path d="M16 16.5A5.56 5.56 0 0 0 21 11a8 8 0 0 0-16 0 5.5 5.5 0 0 0 10 4.5"/>
  </svg>
);

export const CloudArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide') {
        return <LucideCloudArrowDownIcon {...props} />;
    }
    return <HeroCloudArrowDownIcon {...props} />;
};
