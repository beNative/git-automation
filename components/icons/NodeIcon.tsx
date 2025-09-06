import React from 'react';

// A simplified version of the Node.js hexagon icon
export const NodeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" {...props}>
    <title>Node.js</title>
    <path d="M12 0L2.344 5.5v13L12 24l9.656-5.5v-13L12 0zm7.125 17.156l-5.32 3.031V12.97L19.125 9.94v7.216zM12 11.531l-5.297-3.031L12 5.438l5.297 3.062-5.297 3.031zm-7.125.032l5.297 3.031v7.218l-5.297-3.031V11.563z"/>
  </svg>
);
