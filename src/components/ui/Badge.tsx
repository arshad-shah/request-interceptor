import React from 'react';
import { cn } from '@/lib/utils';
import { HttpMethod } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
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

const variantStyles = {
  default: 'bg-gray-100 text-gray-800 border-gray-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200'
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-sm'
};

const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className 
}) => {
  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded border',
      variantStyles[variant],
      sizeStyles[size],
      className
    )}>
      {children}
    </span>
  );
};

const MethodBadge: React.FC<MethodBadgeProps> = ({ method, className }) => {
  const methodStyles = {
    GET: 'bg-blue-100 text-blue-800 border-blue-200',
    POST: 'bg-green-100 text-green-800 border-green-200',
    PUT: 'bg-amber-100 text-amber-800 border-amber-200',
    DELETE: 'bg-red-100 text-red-800 border-red-200',
    PATCH: 'bg-purple-100 text-purple-800 border-purple-200',
    OPTIONS: 'bg-gray-100 text-gray-800 border-gray-200',
    HEAD: 'bg-gray-200 text-gray-800 border-gray-300',
  };

  return (
    <span className={cn(
      'inline-flex items-center justify-center',
      'px-2 py-1 text-xs font-bold uppercase tracking-wide',
      'rounded border min-w-[48px]',
      methodStyles[method],
      className
    )}>
      {method}
    </span>
  );
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusStyle = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (status >= 300 && status < 400) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    } else if (status >= 400 && status < 500) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    } else if (status >= 500) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <span className={cn(
      'inline-flex items-center justify-center',
      'px-2 py-1 text-xs font-bold',
      'rounded border min-w-[40px]',
      getStatusStyle(status),
      className
    )}>
      {status}
    </span>
  );
};

export default Badge;
export { MethodBadge, StatusBadge };