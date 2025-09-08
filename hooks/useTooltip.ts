import { useContext, useRef, useCallback, ReactNode } from 'react';
import { TooltipContext } from '../contexts/TooltipContext';

const TOOLTIP_GAP = 10; // The space between the element and the tooltip

export const useTooltip = (content: ReactNode) => {
  const { showTooltip, hideTooltip } = useContext(TooltipContext);
  const hideTimer = useRef<number | null>(null);
  
  const handleShow = useCallback((event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    if (!content) return;
    
    // If a hide timer is running, cancel it. This prevents flickering on quick mouse movements.
    if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
    }

    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    
    // We can't know the tooltip's size before rendering, so we use an approximation
    // and then clamp its position to stay within the viewport.
    const MOCK_TOOLTIP_WIDTH = (String(content).length * 6) + 20; // Estimate width based on content length
    const MOCK_TOOLTIP_HEIGHT = 28; 

    // Default position: above the element, centered.
    let y = rect.top - TOOLTIP_GAP;
    let x = rect.left + rect.width / 2;
    let transform = 'translate(-50%, -100%)'; // Positions bottom-center of tooltip at (x,y)

    // Check if it fits above. If not, position below.
    if (y - MOCK_TOOLTIP_HEIGHT < 0) {
      y = rect.bottom + TOOLTIP_GAP;
      transform = 'translate(-50%, 0)'; // Positions top-center of tooltip at (x,y)
    }
    
    // Clamp horizontal position to prevent going off-screen.
    const halfWidth = MOCK_TOOLTIP_WIDTH / 2;
    if (x - halfWidth < 5) {
      x = 5 + halfWidth;
    } else if (x + halfWidth > window.innerWidth - 5) {
      x = window.innerWidth - 5 - halfWidth;
    }

    showTooltip(content, { x, y, transform });
  }, [content, showTooltip]);
  
  const handleHide = useCallback(() => {
    // Use a short delay before hiding. This prevents the tooltip from disappearing
    // if the mouse briefly leaves and re-enters the target element.
    hideTimer.current = window.setTimeout(() => {
        hideTooltip();
    }, 100);
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