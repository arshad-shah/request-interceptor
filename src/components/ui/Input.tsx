import React, { forwardRef, useState, useId } from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type InputVariant = 'default' | 'outlined' | 'filled' | 'ghost';
type InputSize = 'sm' | 'md' | 'lg';
type InputStatus = 'default' | 'error' | 'success' | 'warning';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visual style variant */
  variant?: InputVariant;
  /** Size of the input */
  size?: InputSize;
  /** Status state for validation feedback */
  status?: InputStatus;
  /** Label text above the input */
  label?: string;
  /** Error message (also sets status to error) */
  error?: string;
  /** Helper text below the input */
  helperText?: string;
  /** Icon on the left side */
  leftIcon?: React.ReactNode;
  /** Icon on the right side */
  rightIcon?: React.ReactNode;
  /** Show clear button when input has value */
  clearable?: boolean;
  /** Callback when clear button is clicked */
  onClear?: () => void;
  /** Show loading spinner */
  loading?: boolean;
  /** Show character count (requires maxLength) */
  showCount?: boolean;
  /** Make the input take full width */
  fullWidth?: boolean;
  /** Additional wrapper className */
  wrapperClassName?: string;
}

// ============================================================================
// Styles
// ============================================================================

const variantStyles: Record<InputVariant, string> = {
  default: `
    bg-[var(--bg-surface)]
    border border-[var(--border-subtle)]
    focus:border-[var(--border-focus)]
  `,
  outlined: `
    bg-transparent
    border-2 border-[var(--border-default)]
    focus:border-[var(--accent-indigo)]
    focus:bg-[var(--bg-surface)]/30
  `,
  filled: `
    bg-[var(--bg-elevated)]
    border border-transparent
    focus:bg-[var(--bg-surface)]
    focus:border-[var(--border-focus)]
  `,
  ghost: `
    bg-transparent
    border border-transparent
    hover:bg-[var(--bg-surface)]
    focus:bg-[var(--bg-surface)]
    focus:border-[var(--border-subtle)]
  `,
};

const sizeStyles: Record<
  InputSize,
  { input: string; icon: string; iconSlot: string; label: string }
> = {
  sm: {
    input: 'h-8 px-2.5 text-[11px] rounded-[var(--radius-sm)]',
    icon: 'w-3.5 h-3.5',
    // Slot has explicit dimensions; any SVG inside fills it. Consumers pass <Icon /> with no size.
    iconSlot:
      'flex items-center justify-center w-3.5 h-3.5 [&>svg]:w-full [&>svg]:h-full [&>svg]:shrink-0',
    label: 'text-[10px]',
  },
  md: {
    input: 'h-9 px-3 text-[12px] rounded-[var(--radius-md)]',
    icon: 'w-4 h-4',
    iconSlot:
      'flex items-center justify-center w-4 h-4 [&>svg]:w-full [&>svg]:h-full [&>svg]:shrink-0',
    label: 'text-[10px]',
  },
  lg: {
    input: 'h-11 px-4 text-[13px] rounded-[var(--radius-md)]',
    icon: 'w-5 h-5',
    iconSlot:
      'flex items-center justify-center w-5 h-5 [&>svg]:w-full [&>svg]:h-full [&>svg]:shrink-0',
    label: 'text-[11px]',
  },
};

const statusStyles: Record<InputStatus, { border: string; icon: React.ReactNode; text: string }> = {
  default: {
    border: '',
    icon: null,
    text: 'text-[var(--text-tertiary)]',
  },
  error: {
    border: 'border-[var(--accent-rose)]! focus:border-[var(--accent-rose)]!',
    icon: <AlertCircle className="text-[var(--accent-rose)]" />,
    text: 'text-[var(--accent-rose)]',
  },
  success: {
    border: 'border-[var(--accent-emerald)]! focus:border-[var(--accent-emerald)]!',
    icon: <CheckCircle className="text-[var(--accent-emerald)]" />,
    text: 'text-[var(--accent-emerald)]',
  },
  warning: {
    border: 'border-[var(--accent-amber)]! focus:border-[var(--accent-amber)]!',
    icon: <AlertCircle className="text-[var(--accent-amber)]" />,
    text: 'text-[var(--accent-amber)]',
  },
};

// ============================================================================
// Component
// ============================================================================

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      variant = 'default',
      size = 'md',
      status: statusProp = 'default',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      loading = false,
      showCount = false,
      fullWidth = true,
      type = 'text',
      disabled,
      maxLength,
      value,
      defaultValue,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    // Internal state for password visibility
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === 'password';
    const actualType = isPasswordType && showPassword ? 'text' : type;

    // Determine status (error prop overrides status prop)
    const status = error ? 'error' : statusProp;

    // Get current value for clearable and character count
    const currentValue = value ?? defaultValue ?? '';
    const hasValue = String(currentValue).length > 0;
    const charCount = String(currentValue).length;

    // Style lookups
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];
    const statusStyle = statusStyles[status];

    // Calculate padding based on icons
    const hasLeftIcon = !!leftIcon;
    const hasRightContent =
      !!rightIcon ||
      loading ||
      (clearable && hasValue) ||
      isPasswordType ||
      status !== 'default';

    const leftPadding = hasLeftIcon
      ? size === 'sm'
        ? 'pl-8'
        : size === 'lg'
        ? 'pl-11'
        : 'pl-9'
      : '';

    const rightPadding = hasRightContent
      ? size === 'sm'
        ? 'pr-8'
        : size === 'lg'
        ? 'pr-11'
        : 'pr-9'
      : '';

    // Handle clear
    const handleClear = () => {
      onClear?.();
      // Also try to clear via native input if uncontrolled
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    // Render right side icons/buttons
    const renderRightContent = () => {
      const items: React.ReactNode[] = [];

      // Loading spinner
      if (loading) {
        items.push(
          <span
            key="loading"
            className={clsx(sizeStyle.iconSlot, 'animate-spin text-[var(--text-tertiary)]')}
          >
            <Loader2 />
          </span>
        );
      }

      // Clear button
      if (clearable && hasValue && !loading && !disabled) {
        items.push(
          <button
            key="clear"
            type="button"
            onClick={handleClear}
            className={clsx(
              sizeStyle.iconSlot,
              'p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors',
            )}
            tabIndex={-1}
            aria-label="Clear input"
          >
            <X />
          </button>
        );
      }

      // Password toggle
      if (isPasswordType && !loading) {
        items.push(
          <button
            key="password"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={clsx(
              sizeStyle.iconSlot,
              'p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors',
            )}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        );
      }

      // Status icon
      if (status !== 'default' && statusStyle.icon && !loading) {
        items.push(
          <span key="status" className={sizeStyle.iconSlot}>
            {statusStyle.icon}
          </span>
        );
      }

      // Custom right icon
      if (rightIcon && !loading) {
        items.push(
          <span
            key="rightIcon"
            className={clsx(sizeStyle.iconSlot, 'text-[var(--text-tertiary)]')}
          >
            {rightIcon}
          </span>
        );
      }

      if (items.length === 0) return null;

      return (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {items}
        </div>
      );
    };

    return (
      <div
        className={clsx(
          'flex flex-col gap-1.5',
          fullWidth && 'w-full',
          wrapperClassName
        )}
      >
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'ds-label font-medium',
              sizeStyle.label,
              disabled && 'opacity-50'
            )}
          >
            {label}
            {props.required && (
              <span className="text-[var(--accent-rose)] ml-0.5">*</span>
            )}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <span
              className={clsx(
                'absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none',
                sizeStyle.iconSlot,
                disabled && 'opacity-50'
              )}
            >
              {leftIcon}
            </span>
          )}

          {/* Input element */}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            disabled={disabled}
            maxLength={maxLength}
            value={value}
            defaultValue={defaultValue}
            className={clsx(
              // Base styles
              'w-full font-[var(--font-mono)]',
              'text-[var(--text-primary)]',
              'placeholder:text-[var(--text-tertiary)]',
              'outline-none',
              'transition-all duration-[var(--transition-fast)]',
              // Variant styles
              variantStyle,
              // Size styles
              sizeStyle.input,
              // Status border override
              status !== 'default' && statusStyle.border,
              // Icon padding
              leftPadding,
              rightPadding,
              // Disabled state
              disabled && 'opacity-50 cursor-not-allowed',
              // Custom className
              className
            )}
            {...props}
          />

          {/* Right content (icons, buttons) */}
          {renderRightContent()}
        </div>

        {/* Bottom row: helper text and character count */}
        {(error || helperText || (showCount && maxLength)) && (
          <div className="flex items-center justify-between gap-2">
            {/* Error or helper text */}
            <p
              className={clsx(
                'text-[11px] flex-1',
                error ? statusStyle.text : 'text-[var(--text-tertiary)]'
              )}
            >
              {error || helperText}
            </p>

            {/* Character count */}
            {showCount && maxLength && (
              <span
                className={clsx(
                  'text-[10px] font-mono tabular-nums',
                  charCount > maxLength * 0.9
                    ? 'text-[var(--accent-amber)]'
                    : 'text-[var(--text-tertiary)]',
                  charCount >= maxLength && 'text-[var(--accent-rose)]'
                )}
              >
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

// ============================================================================
// Additional Exports for Convenience
// ============================================================================

export type { InputProps, InputVariant, InputSize, InputStatus };