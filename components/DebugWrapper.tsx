import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import { DebugContext } from '../contexts/DebugContext';

const DebugOverlay: React.FC<{ name: string; classNames: string; dimensions: string; }> = ({ name, classNames, dimensions }) => {
    return (
        <div style={{
            position: 'absolute',
            top: '1px',
            left: '1px',
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '2px 4px',
            fontSize: '10px',
            zIndex: 9999,
            pointerEvents: 'none',
            maxWidth: 'calc(100% - 4px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            borderRadius: '2px',
            lineHeight: 1.2,
        }}>
            <div><strong>{name}</strong></div>
            <div>{dimensions}</div>
            <div title={classNames}>{classNames}</div>
        </div>
    );
};

interface DebugWrapperProps {
  children: React.ReactNode;
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export const DebugWrapper: React.FC<DebugWrapperProps> = ({ children, name, className, style }) => {
  const { debugMode } = useContext(DebugContext);
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState('0x0');
  const [classNames, setClassNames] = useState('');

  const updateDebugInfo = useCallback(() => {
    if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setDimensions(`${Math.round(rect.width)}x${Math.round(rect.height)}`);
        setClassNames(ref.current.className);
    }
  }, []);

  useEffect(() => {
    if (debugMode && ref.current) {
        updateDebugInfo();

        const observer = new ResizeObserver(() => {
            updateDebugInfo();
        });

        observer.observe(ref.current);

        return () => {
            observer.disconnect();
        };
    }
  }, [debugMode, updateDebugInfo]);
  
  // This effect is for cases where content inside changes, which might not trigger ResizeObserver
  useEffect(() => {
      if (debugMode) {
          updateDebugInfo();
      }
  }, [children, debugMode, updateDebugInfo]);

  if (!debugMode) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <div ref={ref} className={className} style={{...style, position: 'relative', outline: '1px solid rgba(255, 0, 0, 0.5)' }}>
      {children}
      <DebugOverlay name={name} dimensions={dimensions} classNames={classNames} />
    </div>
  );
};
