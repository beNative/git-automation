import React, { useContext } from 'react';
import { IconContext } from '../../contexts/IconContext';

const HeroRocketLaunchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a6 6 0 01-7.38 5.84m2.56-5.84a6 6 0 016.38-5.84m-5.84 5.84L11.77 12m2.56 2.56l2.05-2.05m-2.05 2.05l2.05 2.05m-6.38-5.84l-2.05-2.05L7 14.37m5.84-2.56L11.77 12l2.05-2.05m-2.05 2.05l-2.05 2.05m2.05-2.05L14.37 7l2.05 2.05m-2.05-2.05L11.77 12" />
  </svg>
);

const LucideRocketLaunchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.3.09-3.1a2.18 2.18 0 0 0-3.09-.09z"/>
    <path d="M12 15-3.09 3.09a2.18 2.18 0 0 1 .09 3.09A2.18 2.18 0 0 1 3.09 3.09l11.91 11.91"/>
    <path d="M11 2.24c0 .5.16 1 .46 1.4a2.2 2.2 0 0 0 1.4 1.4c.4.3.9.46 1.4.46.5 0 1-.16 1.4-.46.4-.4.56-.9.56-1.4 0-.5-.16-1-.46-1.4A2.2 2.2 0 0 0 16.04.84c-.4-.3-.9-.46-1.4-.46-.5 0-1 .16-1.4.46a2.2 2.2 0 0 0-1.4 1.4Z"/>
    <path d="m18.5 16.5.5-2.5.5 2.5c.1.5.3.8.7.9.2.1.5.1.9-.1l2-1c0 2.5-1.5 4.4-3.5 4.4s-3.5-2-3.5-4.4l2-1c.4-.2.7-.2.9-.1.4.1.6.4.7.9Z"/>
  </svg>
);

export const RocketLaunchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const iconSet = useContext(IconContext);
    if (iconSet === 'lucide') {
        return <LucideRocketLaunchIcon {...props} />;
    }
    // Using a different Heroicon as `rocket-launch` is from v2 which is not standard.
    // Using `PaperAirplaneIcon` as a proxy for launch.
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
    );
};
