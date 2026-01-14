import React from 'react';
import { cn } from '@/lib/utils';
import { HttpMethod } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'info' | 'success' | 'error';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
}

interface StatusBadgeProps {
  status: number;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  icon,
  iconPosition = 'left',
  size = 'md',
  className
}) => {
  // Map semantic variants to color variants
  const variantMap: Record<string, string> = {
    default: '',
    info: 'cyan',
    success: 'emerald',
    error: 'rose'
  };

  const variantClass = variantMap[variant] ?? variant;

  const sizeClasses: Record<string, string> = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: '',
    lg: 'text-[12px] px-2.5 py-1'
  };

  return (
    <span className={cn('ds-badge', variantClass !== '' && variantClass, sizeClasses[size], className)}>
      {icon && iconPosition === 'left' && <span className="mr-1">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="ml-1">{icon}</span>}
    </span>
  );
};

const MethodBadge: React.FC<MethodBadgeProps> = ({ method, className }) => {
  const methodClass = method.toLowerCase();

  return (
    <span className={cn('ds-badge', methodClass, className)}>
      {method}
    </span>
  );
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  let statusClass = 'pending';

  if (status >= 200 && status < 300) {
    statusClass = 's2xx';
  } else if (status >= 300 && status < 400) {
    statusClass = 's3xx';
  } else if (status >= 400 && status < 500) {
    statusClass = 's4xx';
  } else if (status >= 500) {
    statusClass = 's5xx';
  }

  return (
    <span className={cn('ds-badge', statusClass, className)}>
      {status}
    </span>
  );
};

export default Badge;
export { MethodBadge, StatusBadge };
