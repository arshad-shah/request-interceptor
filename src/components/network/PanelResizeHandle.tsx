/**
 * PanelResizeHandle Component
 * Drag handle between the request list and the details panel
 */

import { clsx } from 'clsx';

interface PanelResizeHandleProps {
  isBottomPanel: boolean;
  isResizing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function PanelResizeHandle({ isBottomPanel, isResizing, onMouseDown }: PanelResizeHandleProps) {
  return (
    <div
      className={clsx(
        'relative group flex-shrink-0',
        isBottomPanel 
          ? 'h-[5px] cursor-row-resize bg-[var(--bg-elevated)] border-y border-[var(--border-default)]'
          : 'w-[5px] cursor-col-resize bg-[var(--bg-elevated)] border-x border-[var(--border-default)]'
      )}
      onMouseDown={onMouseDown}
    >
      {/* Larger invisible hit area */}
      <div
        className={clsx(
          'absolute z-10',
          isBottomPanel
            ? '-top-2 -bottom-2 left-0 right-0'
            : '-left-2 -right-2 top-0 bottom-0'
        )}
      />
      {/* Center dots indicator */}
      <div
        className={clsx(
          'absolute inset-0 flex items-center justify-center',
          isBottomPanel ? 'flex-row gap-1' : 'flex-col gap-1'
        )}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={clsx(
              'rounded-full bg-[var(--text-tertiary)] transition-colors',
              'w-1 h-1',
              'group-hover:bg-[var(--accent-blue)]',
              isResizing && 'bg-[var(--accent-blue)]'
            )}
          />
        ))}
      </div>
      {/* Highlight on hover/drag */}
      <div
        className={clsx(
          'absolute inset-0 transition-colors pointer-events-none',
          isResizing 
            ? 'bg-[var(--accent-blue)]/30' 
            : 'group-hover:bg-[var(--accent-blue)]/20'
        )}
      />
    </div>
  );
}
