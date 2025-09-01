import React, { createContext, useState, useCallback, ReactNode } from 'react';

interface TooltipPosition {
  x: number;
  y: number;
}

interface TooltipState {
  content: ReactNode | null;
  position: TooltipPosition;
  visible: boolean;
// FIX: The second parameter should be TooltipPosition to match the implementation.
  showTooltip: (content: ReactNode, position: TooltipPosition) => void;
  hideTooltip: () => void;
}

const initialState: TooltipState = {
  content: null,
  position: { x: 0, y: 0 },
  visible: false,
  showTooltip: () => {},
  hideTooltip: () => {},
};

export const TooltipContext = createContext<TooltipState>(initialState);

export const TooltipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<ReactNode | null>(null);
  const [position, setPosition] = useState<TooltipPosition>({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const showTooltip = useCallback((newContent: ReactNode, pos: TooltipPosition) => {
    setContent(newContent);
    setPosition(pos);
    setVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    setVisible(false);
  }, []);

// FIX: Removed `as any` as the types for `showTooltip` now match correctly.
  const value = { content, position, visible, showTooltip, hideTooltip };

  return (
    <TooltipContext.Provider value={value}>
      {children}
    </TooltipContext.Provider>
  );
};
