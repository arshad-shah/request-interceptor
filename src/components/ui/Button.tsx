import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variants = {
  primary: cn(
    "bg-ds-accent-indigo hover:bg-ds-accent-indigo-hover",
    "text-white",
    "border border-ds-accent-indigo hover:border-ds-accent-indigo-hover"
  ),
  secondary: cn(
    "bg-ds-bg-surface hover:bg-ds-bg-hover",
    "text-ds-text-secondary hover:text-ds-text-primary",
    "border border-ds-border-subtle hover:border-ds-border"
  ),
  danger: cn(
    "bg-transparent hover:bg-ds-accent-rose/15",
    "text-ds-accent-rose",
    "border border-ds-accent-rose/50 hover:border-ds-accent-rose"
  ),
  success: cn(
    "bg-ds-accent-emerald hover:bg-ds-accent-emerald/90",
    "text-white",
    "border border-ds-accent-emerald"
  ),
  ghost: cn(
    "bg-transparent hover:bg-ds-bg-surface",
    "text-ds-text-tertiary hover:text-ds-text-primary",
    "border border-transparent"
  ),
  icon: cn(
    "bg-transparent hover:bg-ds-bg-surface",
    "text-ds-text-tertiary hover:text-ds-text-primary",
    "border border-transparent"
  )
};

const sizes = {
  sm: "px-3 py-1.5 text-xs h-8 min-w-[70px]",
  md: "px-4 py-2 text-sm h-9 min-w-[80px]",
  lg: "px-5 py-2.5 text-sm h-10 min-w-[100px]"
};

const iconSizes = {
  sm: "w-7 h-7 p-1.5",
  md: "w-8 h-8 p-2",
  lg: "w-9 h-9 p-2"
};

const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || isLoading;
  const isIconButton = variant === 'icon';

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "font-medium rounded-ds-md",
        "transition-all duration-fast",
        "focus:outline-none focus:ring-2 focus:ring-ds-border-focus focus:ring-offset-1 focus:ring-offset-ds-bg-base",
        // Disabled state
        isDisabled && "opacity-50 cursor-not-allowed",
        !isDisabled && "cursor-pointer",
        // Apply variant
        variants[variant],
        // Apply size
        isIconButton ? iconSizes[size] : sizes[size],
        // Icon button specific
        isIconButton && "rounded-ds-sm min-w-0",
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {isLoading && (
        <div className="w-4 h-4 border-2 border-current rounded-full animate-ds-spin border-t-transparent" />
      )}

      {!isLoading && leftIcon && (
        <span className="flex-shrink-0">{leftIcon}</span>
      )}

      {!isLoading && children && (
        <span className={cn(isIconButton && "sr-only")}>{children}</span>
      )}

      {!isLoading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};

export default Button;
