/**
 * Details panel docking (bottom/right) and drag-to-resize
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type PanelPosition = 'bottom' | 'right';

const MIN_PANEL_SIZE = 150;
const DEFAULT_PANEL_SIZE_BOTTOM = 280;
const DEFAULT_PANEL_SIZE_RIGHT = 380;

export function usePanelResize() {
  const [panelPosition, setPanelPosition] = useState<PanelPosition>('right');
  const [panelSize, setPanelSize] = useState(DEFAULT_PANEL_SIZE_RIGHT);
  const [isResizing, setIsResizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ size: number; clientPos: number } | null>(null);

  useEffect(() => {
    // Reset panel size when position changes
    setPanelSize(
      panelPosition === 'bottom' 
        ? DEFAULT_PANEL_SIZE_BOTTOM 
        : DEFAULT_PANEL_SIZE_RIGHT
    );
  }, [panelPosition]);

  // ─── Resize Handlers ───────────────────────────────────────────────────────
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      size: panelSize,
      clientPos: panelPosition === 'bottom' ? e.clientY : e.clientX,
    };
  }, [panelSize, panelPosition]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newSize: number;

      if (panelPosition === 'bottom') {
        const delta = resizeStartRef.current.clientPos - e.clientY;
        newSize = Math.max(
          MIN_PANEL_SIZE,
          Math.min(resizeStartRef.current.size + delta, containerRect.height - 150)
        );
      } else {
        const delta = resizeStartRef.current.clientPos - e.clientX;
        newSize = Math.max(
          MIN_PANEL_SIZE,
          Math.min(resizeStartRef.current.size + delta, containerRect.width - 300)
        );
      }

      setPanelSize(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, panelPosition]);

  return {
    panelPosition,
    setPanelPosition,
    panelSize,
    isResizing,
    containerRef,
    handleResizeStart,
  };
}
