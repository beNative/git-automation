import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const LucideChevronsDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m7 13 5 5 5-5" />
    <path d="m7 6 5 5 5-5" />
  </svg>
);

const FeatherChevronsDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polyline points="7 13 12 18 17 13" />
    <polyline points="7 6 12 11 17 6" />
  </svg>
);

const TablerChevronsDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    strokeWidth="2"
    stroke="currentColor"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M7 13l5 5l5 -5" />
    <path d="M7 6l5 5l5 -5" />
  </svg>
);

export const ChevronsDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  const iconSet = useContext(IconContext);
  switch (iconSet) {
    case 'lucide':
      return <LucideChevronsDownIcon {...props} />;
    case 'tabler':
      return <TablerChevronsDownIcon {...props} />;
    case 'remix':
      return <TablerChevronsDownIcon {...props} />;
    case 'feather':
    default:
      return <FeatherChevronsDownIcon {...props} />;
  }
};
