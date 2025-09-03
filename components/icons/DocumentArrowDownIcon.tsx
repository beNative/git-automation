import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroDocumentArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.158 10.192l-1.076 1.076a.563.563 0 01-.796 0l-1.076-1.076a.563.563 0 010-.796l1.076-1.076a.563.563 0 01.796 0l1.076 1.076a.563.563 0 010 .796z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.008v.008H12v-.008zm0 2.25h.008v.008H12v-.008zM9.75 15.75h.008v.008H9.75v-.008zm0 2.25h.008v.008H9.75v-.008zm0-4.5h.008v.008H9.75v-.008zm2.25-4.5h.008v.008H12v-.008zm2.25 0h.008v.008H14.25v-.008zM12 2.25c-5.18 0-9.44 4.034-9.95 9.111l-.102.683c-.023.153 0 .308.056.452.056.144.15.27.27.379.12.109.263.19.414.24.15.05.31.069.468.046l.63-.102a9.92 9.92 0 00.523-4.043c.38-4.329 3.956-7.697 8.3-7.697 4.344 0 7.92 3.368 8.3 7.697a9.92 9.92 0 00.523 4.043l.63.102c.158.023.318.004.468-.046.15-.05.294-.131.414-.24.12-.109.214-.235.27-.379.056-.144.079-.299.056-.452l-.102-.683A9.953 9.953 0 0012 2.25z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75a.75.75 0 00.75.75h.01a.75.75 0 00.75-.75v-.01a.75.75 0 00-.75-.75h-.01a.75.75 0 00-.75.75v.01z" />
  </svg>
);

const LucideDocumentArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M12 18v-6"/>
    <path d="m15 15-3 3-3-3"/>
  </svg>
);

const TablerDocumentArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
        <path d="M12 11v6" />
        <path d="M15 14l-3 3l-3 -3" />
    </svg>
);

const FeatherDocumentArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="12" y1="18" x2="12" y2="12"></line>
        <polyline points="15 15 12 18 9 15"></polyline>
    </svg>
);

const RemixDocumentArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V8L14 2ZM13 18V14H11V18H8L12 22L16 18H13ZM13 3.41421L17.5858 8H13V3.41421Z" />
    </svg>
);

const PhosphorDocumentArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
        <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,88V44.69L199.31,88ZM200,224H56a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h88V88a8,8,0,0,0,8,8h48V216A8,8,0,0,1,200,224Zm-72-58.34L165.66,128a8,8,0,0,1,0,11.31l-32,32a8,8,0,0,1-11.32,0l-32-32a8,8,0,0,1,11.32-11.31L120,146.34V112a8,8,0,0,1,16,0v34.34Z" />
    </svg>
);

export const DocumentArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    switch (iconSet) {
        case 'lucide': return <LucideDocumentArrowDownIcon {...props} />;
        case 'feather': return <FeatherDocumentArrowDownIcon {...props} />;
        case 'tabler': return <TablerDocumentArrowDownIcon {...props} />;
        case 'remix': return <RemixDocumentArrowDownIcon {...props} />;
        case 'phosphor': return <PhosphorDocumentArrowDownIcon {...props} />;
        case 'heroicons':
        default:
            return <HeroDocumentArrowDownIcon {...props} />;
    }
};