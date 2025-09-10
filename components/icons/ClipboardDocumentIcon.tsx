import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

// This is the Heroicons v2 "ClipboardDocument" icon
const LucideClipboardDocumentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  </svg>
);

export const ClipboardDocumentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide':
        case 'tabler':
        case 'remix':
        case 'feather':
        default:
            // All other sets fall back to the Lucide version which is a good generic representation.
            return <LucideClipboardDocumentIcon {...props} />;
    }
};