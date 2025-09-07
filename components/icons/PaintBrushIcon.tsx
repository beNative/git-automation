import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroPaintBrushIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.998 15.998 0 011.622-3.385m5.043.025a23.953 23.953 0 00-4.287-4.287m-1.622 3.385a23.953 23.953 0 014.287-4.287m0 0a23.953 23.953 0 014.287 4.287m0 0v1.282a23.953 23.953 0 01-4.287 4.287m-4.287-4.287a23.953 23.953 0 00-4.287 4.287m0 0a23.953 23.953 0 004.287 4.287m0 0v1.282a23.953 23.953 0 00-4.287-4.287" />
  </svg>
);

const LucidePaintBrushIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
    <path d="M14.5 11.5 3 22"/>
  </svg>
);

const TablerPaintBrushIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 21v-4a4 4 0 0 1 4 -4h4" />
        <path d="M21 3a16 16 0 0 0 -12.8 10.2" />
        <path d="M21 3a16 16 0 0 1 -10.2 12.8" />
        <path d="M10.6 9a9 9 0 0 1 4.4 4.4" />
    </svg>
);

export const PaintBrushIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide' || iconSet === 'feather') {
        return <LucidePaintBrushIcon {...props} />;
    }
    if (iconSet === 'tabler' || iconSet === 'remix') {
        return <TablerPaintBrushIcon {...props} />;
    }
    return <HeroPaintBrushIcon {...props} />;
};