import React, { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  id,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value);
    props.onChange?.(e);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={inputId}
          className={cn(
            "block text-sm font-medium transition-all duration-200",
            error 
              ? "text-red-700" 
              : isFocused 
                ? "text-blue-700" 
                : "text-gray-700",
            props.disabled && "text-gray-400"
          )}
        >
          {label}
        </label>
      )}
      
      <div className={cn(
        "relative group",
        "transition-all duration-200"
      )}>
        {/* Input container with enhanced styling */}
        <div className={cn(
          "relative flex items-center",
          "border-2 rounded-xl bg-white overflow-hidden",
          "transition-all duration-200",
          "hover:shadow-md",
          // Focus states
          isFocused && !error && "ring-4 ring-blue-500/20 border-blue-500",
          // Error states
          error 
            ? "border-red-300 shadow-red-100" 
            : "border-gray-200 hover:border-gray-300",
          error && isFocused && "border-red-500 ring-4 ring-red-500/20",
          // Disabled states
          props.disabled && "bg-gray-50 hover:shadow-none hover:border-gray-200 opacity-60"
        )}>
          {/* Left icon */}
          {leftIcon && (
            <div className={cn(
              "absolute left-4 flex items-center justify-center",
              "transition-colors duration-200 z-10",
              error 
                ? "text-red-500" 
                : isFocused 
                  ? "text-blue-500" 
                  : hasValue 
                    ? "text-gray-600" 
                    : "text-gray-400",
              props.disabled && "text-gray-400"
            )}>
              {leftIcon}
            </div>
          )}
          
          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            className={cn(
              "w-full px-4 py-3 bg-transparent",
              "text-gray-900 placeholder-gray-400",
              "focus:outline-none transition-all duration-200",
              "disabled:cursor-not-allowed disabled:text-gray-500",
              leftIcon && "pl-12",
              rightIcon && "pr-12",
              // Enhanced typography
              "text-sm leading-6",
              className
            )}
            {...props}
          />
          
          {/* Right icon */}
          {rightIcon && (
            <div className={cn(
              "absolute right-4 flex items-center justify-center",
              "transition-colors duration-200 z-10",
              error 
                ? "text-red-500" 
                : isFocused 
                  ? "text-blue-500" 
                  : hasValue 
                    ? "text-gray-600" 
                    : "text-gray-400",
              props.disabled && "text-gray-400"
            )}>
              {rightIcon}
            </div>
          )}

          {/* Focus indicator bar */}
          <div className={cn(
            "absolute bottom-0 left-0 h-0.5 bg-blue-500 transition-all duration-300",
            isFocused && !error ? "w-full" : "w-0",
            error && isFocused && "bg-red-500"
          )} />
        </div>

        {/* Character count for inputs with maxLength */}
        {props.maxLength && hasValue && (
          <div className="absolute -top-1 right-2 bg-white px-2">
            <span className={cn(
              "text-xs font-medium transition-colors duration-200",
              error 
                ? "text-red-500" 
                : (props.value?.toString().length || 0) > props.maxLength * 0.8
                  ? "text-orange-500"
                  : "text-gray-400"
            )}>
              {props.value?.toString().length || 0}/{props.maxLength}
            </span>
          </div>
        )}
      </div>
      
      {/* Enhanced error and helper text */}
      {(error || helperText) && (
        <div className="flex items-start gap-2">
          {error && (
            <div className="w-1 h-4 bg-red-400 rounded-full flex-shrink-0 mt-0.5 animate-pulse"></div>
          )}
          <p className={cn(
            "text-sm leading-5 transition-colors duration-200",
            error 
              ? "text-red-600 font-medium" 
              : "text-gray-500"
          )}>
            {error || helperText}
          </p>
        </div>
      )}

      {/* Optional enhancement: Input type indicators */}
      {props.type === 'password' && !error && !helperText && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
          Use a strong password with at least 8 characters
        </p>
      )}
      
      {props.type === 'email' && !error && !helperText && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
          We'll never share your email address
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;