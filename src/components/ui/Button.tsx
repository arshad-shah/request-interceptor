import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variants = {
  primary: cn(
    "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
    "text-white shadow-lg hover:shadow-xl",
    "focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600",
    "border-2 border-blue-600 hover:border-blue-700"
  ),
  secondary: cn(
    "bg-white hover:bg-gray-50 text-gray-700",
    "border-2 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg",
    "focus:ring-4 focus:ring-gray-500/20 focus:border-gray-400"
  ),
  danger: cn(
    "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
    "text-white shadow-lg hover:shadow-xl",
    "focus:ring-4 focus:ring-red-500/25 focus:border-red-600",
    "border-2 border-red-500 hover:border-red-600"
  ),
  ghost: cn(
    "bg-transparent hover:bg-gray-100 text-gray-700",
    "border-2 border-transparent hover:border-gray-200",
    "focus:ring-4 focus:ring-gray-500/20 focus:bg-gray-50"
  ),
  icon: cn(
    "bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800",
    "border-2 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg",
    "focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400",
    "hover:scale-110 active:scale-95"
  )
};

const sizes = {
  sm: "px-4 py-2 text-sm h-9 min-w-[80px]",
  md: "px-6 py-3 text-sm h-11 min-w-[100px]",
  lg: "px-8 py-4 text-base h-13 min-w-[120px]"
};

const iconSizes = {
  sm: "w-8 h-8 p-1.5",
  md: "w-10 h-10 p-2",
  lg: "w-12 h-12 p-2.5"
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
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = disabled || isLoading;

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      setIsPressed(true);
      onMouseDown?.(e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsPressed(false);
    onMouseUp?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsPressed(false);
    onMouseLeave?.(e);
  };

  const isIconButton = variant === 'icon';

  return (
    <button
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative inline-flex items-center justify-center hover:cursor-pointer",
        "font-medium rounded-xl transition-all duration-200",
        "focus:outline-none overflow-hidden",
        "transform-gpu", // Enable hardware acceleration
        // Icon button specific styling
        isIconButton && "rounded-full",
        // Gap for regular buttons
        !isIconButton && "gap-2.5",
        // Hover and press effects
        !isDisabled && !isIconButton && "hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] active:translate-y-0",
        // Icon button has different hover effects (defined in variant)
        !isDisabled && isIconButton && "active:scale-95",
        // Pressed state
        isPressed && !isDisabled && !isIconButton && "scale-[0.98] translate-y-0",
        isPressed && !isDisabled && isIconButton && "scale-95",
        // Disabled state
        isDisabled && "opacity-50 cursor-not-allowed hover:transform-none",
        variants[variant],
        isIconButton ? iconSizes[size] : sizes[size],
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {/* Ripple effect background */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        variant === 'primary' && "bg-gradient-to-br from-white/10 to-white/5",
        variant === 'secondary' && "bg-gradient-to-br from-gray-100 to-gray-50",
        variant === 'danger' && "bg-gradient-to-br from-white/10 to-white/5",
        variant === 'ghost' && "bg-gradient-to-br from-gray-100 to-gray-50",
        variant === 'icon' && "bg-gradient-to-br from-blue-50 to-blue-100"
      )} />

      {/* Shine effect */}
      <div className={cn(
        "absolute inset-0 -translate-x-full group-hover:translate-x-full",
        "bg-gradient-to-r from-transparent via-white/20 to-transparent",
        "transform skew-x-12 transition-transform duration-700 ease-out",
        isDisabled && "hidden"
      )} />
      
      {/* Content container */}
      <div className={cn(
        "relative z-10 flex items-center justify-center",
        !isIconButton && "gap-2.5"
      )}>
        {isLoading && (
          <div className={cn(
            "border-2 border-current rounded-full animate-spin border-t-transparent",
            isIconButton ? "w-4 h-4" : "w-4 h-4"
          )} />
        )}
        
        {/* For icon buttons, prioritize children (the icon) over leftIcon */}
        {!isLoading && isIconButton && children && (
          <span className={cn(
            "flex-shrink-0 transition-transform duration-200",
            !isDisabled && "group-hover:rotate-6"
          )}>
            {children}
          </span>
        )}
        
        {!isLoading && !isIconButton && leftIcon && (
          <span className={cn(
            "flex-shrink-0 transition-transform duration-200",
            !isDisabled && "group-hover:scale-110"
          )}>
            {leftIcon}
          </span>
        )}
        
        {!isIconButton && children && (
          <span className="font-medium leading-none">
            {children}
          </span>
        )}
        
        {!isLoading && !isIconButton && rightIcon && (
          <span className={cn(
            "flex-shrink-0 transition-transform duration-200",
            !isDisabled && "group-hover:scale-110"
          )}>
            {rightIcon}
          </span>
        )}
      </div>

      {/* Focus ring enhancement */}
      <div className={cn(
        "absolute inset-0 opacity-0 transition-opacity duration-200 pointer-events-none",
        "focus-visible:opacity-100",
        isIconButton ? "rounded-full" : "rounded-xl",
        variant === 'primary' && "ring-4 ring-blue-500/25",
        variant === 'secondary' && "ring-4 ring-gray-500/20",
        variant === 'danger' && "ring-4 ring-red-500/25",
        variant === 'ghost' && "ring-4 ring-gray-500/20",
        variant === 'icon' && "ring-4 ring-blue-500/20"
      )} />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className={cn(
          "absolute inset-0 bg-black/5",
          isIconButton ? "rounded-full" : "rounded-xl"
        )} />
      )}
    </button>
  );
};

export default Button;