import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface PopoverProps {
  trigger: React.ReactElement;
  content: React.ReactElement;
  align?: 'start' | 'end';
}

const Popover: React.FC<PopoverProps> = ({ trigger, content, align = 'end' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const portalRoot = document.body;

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !contentRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const viewHeight = window.innerHeight;
    const viewWidth = window.innerWidth;
    const margin = 8; // 8px margin

    const newStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 50,
    };

    // Vertical positioning
    const spaceBelow = viewHeight - triggerRect.bottom;
    if (spaceBelow < contentRect.height && triggerRect.top > contentRect.height) {
      newStyle.bottom = viewHeight - triggerRect.top + margin;
    } else {
      newStyle.top = triggerRect.bottom + margin;
    }
    
    // Horizontal positioning
    if (align === 'start') {
        newStyle.left = triggerRect.left;
    } else { // 'end'
        newStyle.right = viewWidth - triggerRect.right;
    }

    setStyle(newStyle);
  }, [align]);
  
  // Use a layout effect to calculate position after mount and on open to avoid flicker
  useEffect(() => {
    if (isOpen) {
        // We need a frame for the content to be rendered and have dimensions
        requestAnimationFrame(() => {
            calculatePosition();
        });
    }
  }, [isOpen, calculatePosition]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(prev => !prev);
  };
  
  const handleContentClick = (e: React.MouseEvent) => {
      // If a button or link inside the content is clicked, we assume an action was taken
      // and the popover should close.
      if ((e.target as HTMLElement).closest('button, a')) {
        setIsOpen(false);
      }
  };


  // FIX: The type of `trigger` is a generic React.ReactElement, which causes TypeScript's
  // overload resolution for `React.cloneElement` to fail when passing a `ref`.
  // We use `@ts-ignore` as this is a known limitation in React's typings and the
  // code is correct for DOM elements, which is the use case here.
  // @ts-ignore
  const triggerWithRef = React.cloneElement(trigger, {
    ref: (node: HTMLElement) => {
      triggerRef.current = node;
      const { ref } = trigger as any;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    onClick: handleToggle,
    'aria-haspopup': true,
    'aria-expanded': isOpen,
  });

  return (
    <>
      {triggerWithRef}
      {isOpen && ReactDOM.createPortal(
        // FIX: The type of `content` is a generic React.ReactElement, which causes TypeScript's
        // overload resolution for `React.cloneElement` to fail when passing a `ref`.
        // We use `@ts-ignore` as this is a known limitation in React's typings and the
        // code is correct for DOM elements, which is the use case here.
        // @ts-ignore
        React.cloneElement(content, {
            ref: contentRef,
            style: style,
            onClick: handleContentClick
        }),
        portalRoot
      )}
    </>
  );
};

export default Popover;
