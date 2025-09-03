import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroEyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

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

const PhosphorEyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M228.49,228.49a8,8,0,0,1-11.32,0L43.51,54.83a8,8,0,0,1,11.32-11.32L228.49,217.17A8,8,0,0,1,228.49,228.49ZM159.4,162a48.45,48.45,0,0,1-66.8-66.8l20,20A32,32,0,0,0,139,142Zm68.25-37.24c-.35-.79-8.82-19.58-27.65-38.41C175,61,151.3,49.88,128.1,48.06A8,8,0,0,0,120,56v8.44l-31-31a8,8,0,1,0-11.31,11.31L89,56.05C61.43,61.26,33.43,74.52,8.69,124.76a8,8,0,0,0,0,6.48c.35.79,8.82,19.58,27.65,38.41C55.45,188.4,79.54,200.2,103.5,206.27l-10,10A8,8,0,1,0,104.8,227.5l9.2-9.2L128,208s66.57-13.26,91.66-38.35c15.11-15.11,22.45-28.8,24.65-34.88A8,8,0,0,0,247.31,124.76C242.32,124.93,234.25,127,227.65,124.76Z" />
    </svg>
);

export const EyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideEyeSlashIcon {...props} />;
        case 'feather': return <FeatherEyeSlashIcon {...props} />;
        case 'tabler': return <TablerEyeSlashIcon {...props} />;
        case 'remix': return <RemixEyeSlashIcon {...props} />;
        case 'phosphor': return <PhosphorEyeSlashIcon {...props} />;
        case 'heroicons':
        default:
            return <HeroEyeSlashIcon {...props} />;
    }
};