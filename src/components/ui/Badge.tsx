import React from 'react';
import { cn } from '@/lib/utils';
import { HttpMethod } from '@/types';
import { MessageSquare, Filter, Code, Globe, Send, Edit, Trash2, Settings, Eye } from 'lucide-react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
  showIcon?: boolean;
}

interface StatusBadgeProps {
  status: number;
  className?: string;
  showIcon?: boolean;
}

interface ModeBadgeProps {
  headersOnly?: boolean;
  isWebSocket?: boolean;
  ruleCount?: number;
  className?: string;
  showIcon?: boolean;
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

const iconSizeStyles = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4'
};

const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className,
  icon,
  iconPosition = 'left'
}) => {
  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded border',
      variantStyles[variant],
      sizeStyles[size],
      icon && 'gap-1.5',
      className
    )}>
      {icon && iconPosition === 'left' && (
        <span className={iconSizeStyles[size]}>
          {icon}
        </span>
      )}
      {children}
      {icon && iconPosition === 'right' && (
        <span className={iconSizeStyles[size]}>
          {icon}
        </span>
      )}
    </span>
  );
};

const MethodBadge: React.FC<MethodBadgeProps> = ({ method, className, showIcon = true }) => {
  const methodVariant = {
    GET: 'info',
    POST: 'success',
    PUT: 'warning',
    DELETE: 'error',
    PATCH: 'default',
    OPTIONS: 'default',
    HEAD: 'default',
  } as const;

  const methodIcons = {
    GET: <Globe className="w-4 h-4" />,
    POST: <Send className="w-4 h-4" />,
    PUT: <Edit className="w-4 h-4" />,
    DELETE: <Trash2 className="w-4 h-4" />,
    PATCH: <Settings className="w-4 h-4" />,
    OPTIONS: <Settings className="w-4 h-4" />,
    HEAD: <Eye className="w-4 h-4" />,
  };

  return (
    <Badge
      variant={methodVariant[method]}
      icon={showIcon ? methodIcons[method] : undefined}
      className={cn(
        'justify-center font-bold uppercase tracking-wide min-w-[48px]',
        className
      )}
    >
      {method}
    </Badge>
  );
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, showIcon = false }) => {
  const getStatusVariant = (status: number) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'warning';
    if (status >= 400 && status < 500) return 'error';
    if (status >= 500) return 'error';
    return 'default';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) {
      return <div className="w-2 h-2 bg-green-500 rounded-full" />;
    } else if (status >= 300 && status < 400) {
      return <div className="w-2 h-2 bg-amber-500 rounded-full" />;
    } else if (status >= 400 && status < 500) {
      return <div className="w-2 h-2 bg-orange-500 rounded-full" />;
    } else if (status >= 500) {
      return <div className="w-2 h-2 bg-red-500 rounded-full" />;
    }
    return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
  };

  // Special handling for 4xx errors to use orange instead of red
  const customStatusStyle = status >= 400 && status < 500 
    ? 'bg-orange-100 text-orange-800 border-orange-200' 
    : '';

  return (
    <Badge
      variant={getStatusVariant(status)}
      icon={showIcon ? getStatusIcon(status) : undefined}
      className={cn(
        'justify-center font-bold min-w-[40px]',
        customStatusStyle,
        className
      )}
    >
      {status}
    </Badge>
  );
};

const ModeBadge: React.FC<ModeBadgeProps> = ({ 
  headersOnly, 
  isWebSocket, 
  ruleCount = 0, 
  className,
  showIcon = true
}) => {
  if (isWebSocket) {
    return (
      <Badge
        variant="default"
        icon={showIcon ? <MessageSquare className="w-4 h-4" /> : undefined}
        className={cn(
          'bg-purple-100 text-purple-800 border-purple-200',
          className
        )}
      >
        <span>WebSocket</span>
        {ruleCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-purple-200 text-purple-900 rounded-full text-xs font-bold min-w-[18px] text-center">
            {ruleCount}
          </span>
        )}
      </Badge>
    );
  }
  
  if (headersOnly) {
    return (
      <Badge
        variant="info"
        icon={showIcon ? <Filter className="w-4 h-4" /> : undefined}
        className={cn(className)}
      >
        Headers-Only
      </Badge>
    );
  }
  
  return (
    <Badge
      variant="success"
      icon={showIcon ? <Code className="w-4 h-4" /> : undefined}
      className={cn(className)}
    >
      Full Response
    </Badge>
  );
};

export default Badge;
export { MethodBadge, StatusBadge, ModeBadge };