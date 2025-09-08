import React, { useContext } from 'react';
import { createPortal } from 'react-dom';
import { TooltipContext } from '../contexts/TooltipContext';

const Tooltip: React.FC = () => {
  const { content, position, visible } = useContext(TooltipContext);
  const tooltipId = 'global-tooltip';

  // Only render the portal if the tooltip should be visible
  if (!visible || !content) {
    return null;
  }

  return createPortal(
    <div
      id={tooltipId}
      role="tooltip"
      className={`fixed z-50 px-2.5 py-1.5 text-xs font-semibold text-white bg-gray-900 dark:bg-black rounded-md shadow-lg transition-opacity duration-200 pointer-events-none
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        // Use a transform to ensure the tooltip is centered without causing reflows
        // This also helps with pixel-perfect positioning.
        transform: position.transform,
      }}
    >
      {content}
    </div>,
    document.body
  );
};

export default Tooltip;