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
              ? "text-ds-accent-rose"
              : isFocused
                ? "text-ds-accent-indigo"
                : "text-ds-text-secondary",
            props.disabled && "text-ds-text-tertiary"
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
          "border rounded-ds-md bg-ds-bg-surface overflow-hidden",
          "transition-all duration-200",
          "hover:shadow-ds-sm",
          // Focus states
          isFocused && !error && "ring-2 ring-ds-border-focus/30 border-ds-border-focus",
          // Error states
          error
            ? "border-ds-accent-rose/50"
            : "border-ds-border-subtle hover:border-ds-border",
          error && isFocused && "border-ds-accent-rose ring-2 ring-ds-accent-rose/20",
          // Disabled states
          props.disabled && "bg-ds-bg-base hover:shadow-none hover:border-ds-border-subtle opacity-60"
        )}>
          {/* Left icon */}
          {leftIcon && (
            <div className={cn(
              "absolute left-3 flex items-center justify-center",
              "transition-colors duration-200 z-10",
              error
                ? "text-ds-accent-rose"
                : isFocused
                  ? "text-ds-accent-indigo"
                  : hasValue
                    ? "text-ds-text-secondary"
                    : "text-ds-text-tertiary",
              props.disabled && "text-ds-text-tertiary"
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
              "w-full px-3 py-2.5 bg-transparent",
              "text-ds-text-primary placeholder-ds-text-tertiary",
              "focus:outline-none transition-all duration-200",
              "disabled:cursor-not-allowed disabled:text-ds-text-tertiary",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              // Enhanced typography
              "text-sm leading-6",
              className
            )}
            {...props}
          />

          {/* Right icon */}
          {rightIcon && (
            <div className={cn(
              "absolute right-3 flex items-center justify-center",
              "transition-colors duration-200 z-10",
              error
                ? "text-ds-accent-rose"
                : isFocused
                  ? "text-ds-accent-indigo"
                  : hasValue
                    ? "text-ds-text-secondary"
                    : "text-ds-text-tertiary",
              props.disabled && "text-ds-text-tertiary"
            )}>
              {rightIcon}
            </div>
          )}

          {/* Focus indicator bar */}
          <div className={cn(
            "absolute bottom-0 left-0 h-0.5 bg-ds-accent-indigo transition-all duration-300",
            isFocused && !error ? "w-full" : "w-0",
            error && isFocused && "bg-ds-accent-rose"
          )} />
        </div>

        {/* Character count for inputs with maxLength */}
        {props.maxLength && hasValue && (
          <div className="absolute -top-1 right-2 bg-ds-bg-elevated px-2">
            <span className={cn(
              "text-xs font-medium transition-colors duration-200",
              error
                ? "text-ds-accent-rose"
                : (props.value?.toString().length || 0) > props.maxLength * 0.8
                  ? "text-ds-accent-amber"
                  : "text-ds-text-tertiary"
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
            <div className="w-1 h-4 bg-ds-accent-rose rounded-full flex-shrink-0 mt-0.5 animate-pulse"></div>
          )}
          <p className={cn(
            "text-sm leading-5 transition-colors duration-200",
            error
              ? "text-ds-accent-rose font-medium"
              : "text-ds-text-tertiary"
          )}>
            {error || helperText}
          </p>
        </div>
      )}

      {/* Optional enhancement: Input type indicators */}
      {props.type === 'password' && !error && !helperText && (
        <p className="text-xs text-ds-text-tertiary flex items-center gap-1">
          <span className="w-1 h-1 bg-ds-text-tertiary rounded-full"></span>
          Use a strong password with at least 8 characters
        </p>
      )}

      {props.type === 'email' && !error && !helperText && (
        <p className="text-xs text-ds-text-tertiary flex items-center gap-1">
          <span className="w-1 h-1 bg-ds-text-tertiary rounded-full"></span>
          We'll never share your email address
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
