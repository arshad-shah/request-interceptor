import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

const SlideOver: React.FC<SlideOverProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = '100%',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      // Focus the panel after animation
      requestAnimationFrame(() => {
        panelRef.current?.focus();
      });
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="ds-slide-over-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="ds-slide-over"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="ds-slide-over-header">
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ds-icon-btn sm"
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="ds-slide-over-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SlideOver;
