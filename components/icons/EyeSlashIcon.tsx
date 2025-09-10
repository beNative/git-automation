import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const LucideEyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <line x1="2" x2="22" y1="2" y2="22"/>
  </svg>
);

const TablerEyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M10.585 10.587a2 2 0 0 0 2.829 2.828" />
        <path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87" />
        <path d="M3 3l18 18" />
    </svg>
);

const FeatherEyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
);

const RemixEyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 14.5C13.3807 14.5 14.5 13.3807 14.5 12C14.5 11.3982 14.2829 10.8522 13.9442 10.4443L11.5557 12.8329C11.1478 13.1716 11.6018 13.3887 12 13.5L12 14.5ZM12 7.5C14.4853 7.5 16.5 9.51472 16.5 12C16.5 12.4334 16.4384 12.8523 16.3263 13.2454L17.5898 14.5089C18.6631 13.785 19.5013 12.9189 20 12C20 8.58172 16.4183 5 12 5C10.2097 5 8.54563 5.58641 7.14732 6.57716L8.50889 7.93873C9.53987 7.64333 10.7042 7.5 12 7.5ZM21.9983 20.5841L3.41421 2L2 3.41421L20.5858 22L21.9983 20.5841ZM4 12C4.49866 11.0811 5.33687 10.215 6.41021 9.49107L7.67139 10.7523C6.56159 11.1478 5.56161 11.5666 4.90606 12C5.56161 12.4334 6.56159 12.8522 7.67139 13.2477L6.41021 14.5089C5.33687 13.785 4.49866 12.9189 4 12Z" />
    </svg>
);

export const EyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideEyeSlashIcon {...props} />;
        case 'tabler': return <TablerEyeSlashIcon {...props} />;
        case 'remix': return <RemixEyeSlashIcon {...props} />;
        case 'feather':
        default:
            return <FeatherEyeSlashIcon {...props} />;
    }
};