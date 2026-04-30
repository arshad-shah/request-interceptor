import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  /** Badge count shown next to title */
  badgeCount?: number;
  /** Whether section is collapsible (false = always open) */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Force expanded (e.g. when editing and section has data) */
  forceExpanded?: boolean;
  /** Auto-focus first input when expanded */
  autoFocus?: boolean;
  children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  icon,
  badgeCount,
  collapsible = true,
  defaultCollapsed = true,
  forceExpanded = false,
  autoFocus = false,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(collapsible ? defaultCollapsed : false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isExpanded = !collapsible || forceExpanded || !collapsed;

  // When forceExpanded changes, open the section
  useEffect(() => {
    if (forceExpanded) setCollapsed(false);
  }, [forceExpanded]);

  // Auto-focus first input when expanding
  useEffect(() => {
    if (isExpanded && autoFocus && contentRef.current) {
      const timer = setTimeout(() => {
        const firstInput = contentRef.current?.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select'
        );
        firstInput?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, autoFocus]);

  const handleToggle = useCallback(() => {
    if (collapsible && !forceExpanded) {
      setCollapsed(prev => !prev);
    }
  }, [collapsible, forceExpanded]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  if (!collapsible) {
    return <div className="space-y-4">{children}</div>;
  }

  return (
    <div className="ds-form-section" data-expanded={isExpanded}>
      <button
        type="button"
        className="ds-form-section-trigger"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-label={`${title} section`}
      >
        <div className="ds-form-section-trigger-left">
          {icon}
          <span>{title}</span>
          {badgeCount != null && badgeCount > 0 && (
            <span className="ds-form-section-badge">{badgeCount}</span>
          )}
        </div>
        <div className="ds-form-section-trigger-right">
          <ChevronDown className="ds-form-section-chevron" />
        </div>
      </button>

      {isExpanded && (
        <div
          ref={contentRef}
          className="ds-form-section-content"
          role="region"
          aria-label={title}
        >
          <div className="space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
};

export default FormSection;
