import React, { createContext, useState, useCallback, ReactNode, useMemo } from 'react';

interface TooltipPosition {
  x: number;
  y: number;
  transform: string;
}

interface TooltipState {
  content: ReactNode | null;
  position: TooltipPosition;
  visible: boolean;
  showTooltip: (content: ReactNode, position: TooltipPosition) => void;
  hideTooltip: () => void;
}

const initialState: TooltipState = {
  content: null,
  position: { x: 0, y: 0, transform: 'translate(-50%, -100%)' },
  visible: false,
  showTooltip: () => {},
  hideTooltip: () => {},
};

export const TooltipContext = createContext<TooltipState>(initialState);

export const TooltipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<ReactNode | null>(null);
  const [position, setPosition] = useState<TooltipPosition>(initialState.position);
  const [visible, setVisible] = useState(false);

  const showTooltip = useCallback((newContent: ReactNode, pos: TooltipPosition) => {
    setContent(newContent);
    setPosition(pos);
    setVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    setVisible(false);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({ 
    content, 
    position, 
    visible, 
    showTooltip, 
    hideTooltip 
  }), [content, position, visible, showTooltip, hideTooltip]);

  return (
    <TooltipContext.Provider value={value}>
      {children}
    </TooltipContext.Provider>
  );
};