import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroBugAntIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.378 2.418c.24-.954 1.002-1.658 1.954-1.658s1.714.704 1.954 1.658l.142.566a1.002 1.002 0 001.556.505l.52-.328a1.75 1.75 0 012.12.322l.53.662a1.75 1.75 0 01-.22 2.392l-.534.42a1.002 1.002 0 00-.23 1.6l.412.593a1.75 1.75 0 01-.13 2.458l-.626.56a1.002 1.002 0 00-.012 1.63l.53.53a1.75 1.75 0 01-.322 2.12l-.662.53a1.75 1.75 0 01-2.392-.22l-.42-.534a1.002 1.002 0 00-1.6.23l-.593.412a1.75 1.75 0 01-2.458-.13l-.56-.626a1.002 1.002 0 00-1.63-.012l-.53.53a1.75 1.75 0 01-2.12-.322l-.53-.662a1.75 1.75 0 01.22-2.392l.534-.42a1.002 1.002 0 00.23-1.6l-.412-.593a1.75 1.75 0 01.13-2.458l.626-.56a1.002 1.002 0 00.012-1.63l-.53-.53a1.75 1.75 0 01.322-2.12l.662-.53a1.75 1.75 0 012.392.22l.42.534a1.002 1.002 0 001.6-.23l.593-.412z" />
  </svg>
);


const LucideBugAntIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m18 10 2-2"/>
    <path d="m16 8-2.5 2.5"/>
    <path d="M12 14v-2.5"/>
    <path d="M10 11.5 7.5 9"/>
    <path d="m6 10-2-2"/>
    <path d="m6 14 2 2"/>
    <path d="M8 16l2.5-2.5"/>
    <path d="M12 14v2.5"/>
    <path d="m14 11.5 2.5 2.5"/>
    <path d="m18 14 2 2"/>
    <path d="M15 22v-4.5"/>
    <path d="M9 22v-4.5"/>
    <path d="M12 17.5a2.5 2.5 0 0 0 0-5h0a2.5 2.5 0 0 0 0 5Z"/>
    <path d="M12 12.5a5 5 0 0 0-5-5h0a5 5 0 0 0-5 5v0a5 5 0 0 0 5 5"/>
    <path d="M12 12.5a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5"/>
  </svg>
);

const TablerBugAntIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M9 12h6" />
        <path d="M12 9v6" />
        <path d="M13 14l5 4" />
        <path d="M7 18l-2 2" />
        <path d="M11 14l-5 4" />
        <path d="M17 18l2 2" />
        <path d="M4 9l2 2" />
        <path d="M20 9l-2 2" />
        <path d="M8 6l2 2" />
        <path d="M16 6l-2 2" />
    </svg>
);


export const BugAntIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide') {
        return <LucideBugAntIcon {...props} />;
    }
    if (iconSet === 'tabler') {
        return <TablerBugAntIcon {...props} />;
    }
    return <HeroBugAntIcon {...props} />;
};