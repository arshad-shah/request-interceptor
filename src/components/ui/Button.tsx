import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'icon' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant = 'default',
  size = 'md',
  leftIcon,
  rightIcon,
  children,
  disabled,
  isLoading,
  ...props
}, ref) => {
  const isIconOnly = variant === 'icon' || (!children && (leftIcon || rightIcon));

  const baseClasses = isIconOnly ? 'ds-icon-btn' : 'ds-btn';

  // Map variants to CSS classes
  const variantClasses: Record<string, string> = {
    default: '',
    primary: 'primary',
    danger: 'danger',
    success: 'success',
    icon: '',
    ghost: '', // Ghost uses default styling with transparent bg
    secondary: ''  // Secondary also uses default styling
  };

  const sizeClasses: Record<string, string> = {
    sm: isIconOnly ? '' : 'text-[11px] px-3 py-1.5',
    md: '',
    lg: isIconOnly ? 'w-10 h-10' : 'text-[13px] px-5 py-2.5'
  };

  return (
    <button
      ref={ref}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
