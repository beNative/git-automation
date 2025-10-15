import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const LucideChevronsUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="m17 11-5-5-5 5" />
    <path d="m17 18-5-5-5 5" />
  </svg>
);

const FeatherChevronsUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <polyline points="17 11 12 6 7 11" />
    <polyline points="17 18 12 13 7 18" />
  </svg>
);

const TablerChevronsUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M7 11l5 -5l5 5" />
    <path d="M7 18l5 -5l5 5" />
  </svg>
);

export const ChevronsUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  const iconSet = useContext(IconContext);
  switch (iconSet) {
    case 'lucide':
      return <LucideChevronsUpIcon {...props} />;
    case 'tabler':
      return <TablerChevronsUpIcon {...props} />;
    case 'remix':
      return <TablerChevronsUpIcon {...props} />;
    case 'feather':
    default:
      return <FeatherChevronsUpIcon {...props} />;
  }
};
