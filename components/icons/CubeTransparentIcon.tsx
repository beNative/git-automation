import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroCubeTransparentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 01-4.5 0m4.5 0l-4.5 4.5m4.5-4.5l4.5 4.5M14.25 12l-4.5 4.5m4.5-4.5l4.5 4.5M3.75 12a14.25 14.25 0 0016.5 0M3.75 12v-.75A14.25 14.25 0 0112 3.75v.75m0 0v-1.5m0 1.5v.75m0 0v.75m0-1.5v.75m-6.375 6.375a14.25 14.25 0 0112.75 0" />
  </svg>
);

const LucideCubeTransparentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <line x1="3.27" x2="10" y1="6.96" y2="12.5"/>
    <line x1="14" x2="20.73" y1="12.5" y2="6.96"/>
    <polyline points="10 12.5 10 22"/>
    <polyline points="14 12.5 14 22"/>
    <polyline points="3.27 17.04 10 22.5"/>
    <polyline points="14 22.5 20.73 17.04"/>
  </svg>
);

const TablerCubeTransparentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M2.571 8.243l8.858 -5.023a1 1 0 0 1 .571 .006l8.858 5.017" />
        <path d="M12 22v-11.5" />
        <path d="M3.142 8.5v8" />
        <path d="M20.858 8.5v8" />
        <path d="M12 10.5l8.571 -4.757" />
        <path d="M3.429 5.743l8.571 4.757" />
    </svg>
);

const FeatherCubeTransparentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <line x1="3.27" y1="6.96" x2="12" y2="12.5"></line>
        <line x1="12" y1="22.08" x2="12" y2="12.5"></line>
        <line x1="20.73" y1="6.96" x2="12" y2="12.5"></line>
    </svg>
);

const RemixCubeTransparentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 22L3.93756 16.8125V7.1875L12 12.375L20.0625 7.1875V16.8125L12 22ZM12 1L21 6.5V17.5L12 23L3 17.5V6.5L12 1Z" />
    </svg>
);

const PhosphorCubeTransparentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M222.19,83.13l-88-53.13a15.9,15.9,0,0,0-12.38,0l-88,53.13A16,16,0,0,0,24,96.87v62.26a16,16,0,0,0,9.81,13.74l88,53.13a15.9,15.9,0,0,0,12.38,0l88-53.13A16,16,0,0,0,232,159.13V96.87A16,16,0,0,0,222.19,83.13ZM40,159.13V96.87L128,144Zm16,10.66,66.19,40L56,169.79ZM144,144,216,96.87v62.26Zm65.81-80.44-72,43.37L68.19,63.69,128,30.13Z" />
    </svg>
);


export const CubeTransparentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideCubeTransparentIcon {...props} />;
        case 'feather': return <FeatherCubeTransparentIcon {...props} />;
        case 'tabler': return <TablerCubeTransparentIcon {...props} />;
        case 'remix': return <RemixCubeTransparentIcon {...props} />;
        case 'phosphor': return <PhosphorCubeTransparentIcon {...props} />;
        case 'heroicons':
        default:
            return <HeroCubeTransparentIcon {...props} />;
    }
};