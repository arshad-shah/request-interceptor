/**
 * Collapsible section used throughout the request details panel
 */

import { clsx } from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeType?: 'default' | 'success' | 'warning' | 'error';
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function Section({
  title,
  icon,
  badge,
  badgeType = 'default',
  collapsed,
  onToggle,
  children,
  actions,
  className,
}: SectionProps) {
  return (
    <div className={clsx('ds-section', collapsed && 'collapsed', className)}>
      <div className="ds-section-header" onClick={onToggle}>
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          {icon}
          <span>{title}</span>
          {badge !== undefined && (
            <span
              className={clsx(
                'ds-badge text-[10px]',
                badgeType === 'success' && 'emerald',
                badgeType === 'warning' && 'amber',
                badgeType === 'error' && 'rose',
                badgeType === 'default' && 'gray'
              )}
            >
              {badge}
            </span>
          )}
        </div>
        {actions && (
          <div
            className="flex items-center gap-1"
            onClick={e => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
      <div className="ds-section-content">{children}</div>
    </div>
  );
}
