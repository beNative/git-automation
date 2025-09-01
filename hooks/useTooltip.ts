import { useContext, useRef, useCallback, ReactNode } from 'react';
import { TooltipContext } from '../contexts/TooltipContext';

// --- Configuration ---
const TOOLTIP_GAP = 8; // The space between the element and the tooltip
const MOCK_TOOLTIP_WIDTH = 150; // An estimated average width for position calculation
const MOCK_TOOLTIP_HEIGHT = 28; // An estimated height for position calculation

export const useTooltip = (content: ReactNode) => {
  const { showTooltip, hideTooltip } = useContext(TooltipContext);
  const targetRef = useRef<HTMLElement | null>(null);

// FIX: The event type is now a union to correctly handle both onMouseEnter (MouseEvent) and onFocus (FocusEvent).
  const handleShow = useCallback((event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    if (!content) return;
    targetRef.current = event.currentTarget;
    const rect = targetRef.current.getBoundingClientRect();
    
    // --- Dynamic Positioning Logic ---
    let y = rect.top - MOCK_TOOLTIP_HEIGHT - TOOLTIP_GAP; // Default: above
    let x = rect.left + rect.width / 2; // Default: centered
    
    // 1. Vertical Flipping: If it doesn't fit on top, move to bottom.
    if (y < 0) {
      y = rect.bottom + TOOLTIP_GAP;
    }
    
    // 2. Horizontal Clamping: Ensure it doesn't go off the left/right edges.
    const halfWidth = MOCK_TOOLTIP_WIDTH / 2;
    if (x - halfWidth < 0) {
      x = halfWidth; // Clamp to left edge
    } else if (x + halfWidth > window.innerWidth) {
      x = window.innerWidth - halfWidth; // Clamp to right edge
    }

    showTooltip(content, { x, y });
  }, [content, showTooltip]);
  
  const handleHide = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  // Return props to be spread on the target element
  return {
    onMouseEnter: handleShow,
    onMouseLeave: handleHide,
    onFocus: handleShow,
    onBlur: handleHide,
    'aria-label': typeof content === 'string' ? content : 'element has tooltip',
  };
};
