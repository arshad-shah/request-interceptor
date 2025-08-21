import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variants = {
  primary: cn(
    "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    "focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
  ),
  secondary: cn(
    "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm",
    "focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
  ),
  danger: cn(
    "bg-red-500 hover:bg-red-600 text-white shadow-sm",
    "focus:ring-2 focus:ring-red-200 focus:ring-offset-2"
  ),
  ghost: cn(
    "bg-transparent hover:bg-gray-100 text-gray-700",
    "focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
  )
};

const sizes = {
  sm: "px-3 py-1.5 text-sm h-8",
  md: "px-4 py-2 text-sm h-10",
  lg: "px-6 py-3 text-base h-12"
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

  // Separate motion props from HTML button props
  const { 
    onAnimationStart, 
    onAnimationEnd, 
    onDragStart,
    onDragEnd,
    onDrag,
    ...buttonProps 
  } = props;

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.02, y: -1 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "font-medium rounded-lg transition-all duration-200",
        "focus:outline-none relative overflow-hidden",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isDisabled}
      {...buttonProps}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      {isLoading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      
      {!isLoading && leftIcon && (
        <span className="flex-shrink-0">{leftIcon}</span>
      )}
      
      <span className="relative z-10">{children}</span>
      
      {!isLoading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </motion.button>
  );
};

export default Button;