import React from 'react';

const RestoreIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        {...props}
    >
        <rect x={9} y={4.5} width={10.5} height={10.5} rx={2} ry={2} />
        <rect x={4.5} y={9} width={10.5} height={10.5} rx={2} ry={2} />
    </svg>
);

export { RestoreIcon };
