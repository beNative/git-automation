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
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 8.25h6a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5h-6a1.5 1.5 0 01-1.5-1.5v-6a1.5 1.5 0 011.5-1.5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 8.25V6a1.5 1.5 0 00-1.5-1.5h-6A1.5 1.5 0 006.75 6v2.25"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 15.75H6a1.5 1.5 0 01-1.5-1.5v-6A1.5 1.5 0 016 6.75h2.25"
    />
  </svg>
);

export { RestoreIcon };
