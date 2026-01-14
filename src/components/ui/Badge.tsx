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
  default: 'bg-ds-bg-surface text-ds-text-secondary border-ds-border-subtle',
  success: 'bg-ds-accent-emerald/15 text-ds-accent-emerald border-ds-accent-emerald/30',
  error: 'bg-ds-accent-rose/15 text-ds-accent-rose border-ds-accent-rose/30',
  warning: 'bg-ds-accent-amber/15 text-ds-accent-amber border-ds-accent-amber/30',
  info: 'bg-ds-accent-cyan/15 text-ds-accent-cyan border-ds-accent-cyan/30'
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
      'inline-flex items-center font-medium rounded-ds-sm border',
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
      return <div className="w-2 h-2 bg-ds-accent-emerald rounded-full" />;
    } else if (status >= 300 && status < 400) {
      return <div className="w-2 h-2 bg-ds-accent-amber rounded-full" />;
    } else if (status >= 400 && status < 500) {
      return <div className="w-2 h-2 bg-ds-accent-amber rounded-full" />;
    } else if (status >= 500) {
      return <div className="w-2 h-2 bg-ds-accent-rose rounded-full" />;
    }
    return <div className="w-2 h-2 bg-ds-text-tertiary rounded-full" />;
  };

  // Special handling for 4xx errors to use amber instead of rose
  const customStatusStyle = status >= 400 && status < 500
    ? 'bg-ds-accent-amber/15 text-ds-accent-amber border-ds-accent-amber/30'
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
          'bg-ds-accent-violet/15 text-ds-accent-violet border-ds-accent-violet/30',
          className
        )}
      >
        <span>WebSocket</span>
        {ruleCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-ds-accent-violet/30 text-ds-accent-violet rounded-full text-xs font-bold min-w-[18px] text-center">
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
