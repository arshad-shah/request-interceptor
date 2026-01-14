import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  onChange?: (value: string) => void;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  className,
  children,
  label,
  error,
  helperText,
  leftIcon,
  onChange,
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="ds-label"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
            {leftIcon}
          </span>
        )}

        <select
          ref={ref}
          id={selectId}
          className={cn(
            'ds-input appearance-none pr-8 cursor-pointer',
            leftIcon && 'pl-9',
            error && 'error',
            className
          )}
          onChange={handleChange}
          {...props}
        >
          {children}
        </select>

        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
        />
      </div>

      {(error || helperText) && (
        <p className={cn(
          'text-[11px]',
          error ? 'text-[var(--accent-rose)]' : 'text-[var(--text-tertiary)]'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
