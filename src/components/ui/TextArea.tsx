import React, { forwardRef, useId } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type TextAreaVariant = 'default' | 'outlined' | 'filled' | 'ghost';
type TextAreaSize = 'sm' | 'md' | 'lg';
type TextAreaStatus = 'default' | 'error' | 'success' | 'warning';

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Visual style variant */
  variant?: TextAreaVariant;
  /** Size of the textarea */
  size?: TextAreaSize;
  /** Status state for validation feedback */
  status?: TextAreaStatus;
  /** Label text above the textarea */
  label?: string;
  /** Error message (also sets status to error) */
  error?: string;
  /** Helper text below the textarea */
  helperText?: string;
  /** Show clear button when textarea has value */
  clearable?: boolean;
  /** Callback when clear button is clicked */
  onClear?: () => void;
  /** Show character count (requires maxLength) */
  showCount?: boolean;
  /** Make the textarea take full width */
  fullWidth?: boolean;
  /** Additional wrapper className */
  wrapperClassName?: string;
}

// ============================================================================
// Styles
// ============================================================================

const variantStyles: Record<TextAreaVariant, string> = {
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

const sizeStyles: Record<TextAreaSize, { textarea: string; label: string; rows: number }> = {
  sm: {
    textarea: 'px-2.5 py-1.5 text-[11px] rounded-[var(--radius-sm)]',
    label: 'text-[10px]',
    rows: 4,
  },
  md: {
    textarea: 'px-3 py-2 text-[12px] rounded-[var(--radius-md)]',
    label: 'text-[10px]',
    rows: 6,
  },
  lg: {
    textarea: 'px-4 py-3 text-[13px] rounded-[var(--radius-md)]',
    label: 'text-[11px]',
    rows: 8,
  },
};

const statusStyles: Record<TextAreaStatus, { border: string; icon: React.ReactNode; text: string }> = {
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

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
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
      clearable = false,
      onClear,
      showCount = false,
      fullWidth = true,
      disabled,
      maxLength,
      value,
      defaultValue,
      id,
      rows,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;

    const status = error ? 'error' : statusProp;
    const currentValue = value ?? defaultValue ?? '';
    const hasValue = String(currentValue).length > 0;
    const charCount = String(currentValue).length;

    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];
    const statusStyle = statusStyles[status];

    const handleClear = () => {
      onClear?.();
      const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
      if (textarea) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        nativeSetter?.call(textarea, '');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
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
            htmlFor={textareaId}
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

        {/* Textarea wrapper */}
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            disabled={disabled}
            maxLength={maxLength}
            value={value}
            defaultValue={defaultValue}
            rows={rows ?? sizeStyle.rows}
            className={clsx(
              'w-full font-[var(--font-mono)] resize-vertical',
              'text-[var(--text-primary)]',
              'placeholder:text-[var(--text-tertiary)]',
              'outline-none',
              'transition-all duration-[var(--transition-fast)]',
              'leading-relaxed',
              variantStyle,
              sizeStyle.textarea,
              status !== 'default' && statusStyle.border,
              clearable && hasValue && 'pr-8',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            {...props}
          />

          {/* Clear button */}
          {clearable && hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              tabIndex={-1}
              aria-label="Clear textarea"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bottom row: helper text / error + character count */}
        {(error || helperText || (showCount && maxLength)) && (
          <div className="flex items-center justify-between gap-2">
            <p
              className={clsx(
                'text-[11px] flex-1',
                error ? statusStyle.text : 'text-[var(--text-tertiary)]'
              )}
            >
              {error || helperText}
            </p>

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

Textarea.displayName = 'Textarea';

export default Textarea;

export type { TextareaProps, TextAreaVariant, TextAreaSize, TextAreaStatus };
