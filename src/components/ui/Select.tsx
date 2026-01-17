import React, { forwardRef, useId } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { clsx } from 'clsx';
import {
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type SelectVariant = 'default' | 'outlined' | 'filled' | 'ghost';
type SelectSize = 'sm' | 'md' | 'lg';
type SelectStatus = 'default' | 'error' | 'success' | 'warning';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps {
  /** Current value (controlled) */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Visual style variant */
  variant?: SelectVariant;
  /** Size of the select */
  size?: SelectSize;
  /** Status state for validation feedback */
  status?: SelectStatus;
  /** Label text above the select */
  label?: string;
  /** Error message (also sets status to error) */
  error?: string;
  /** Helper text below the select */
  helperText?: string;
  /** Icon on the left side of trigger */
  leftIcon?: React.ReactNode;
  /** Show loading spinner */
  loading?: boolean;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Flat options array */
  options?: SelectOption[];
  /** Grouped options */
  groups?: SelectGroup[];
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Make the select take full width */
  fullWidth?: boolean;
  /** Additional wrapper className */
  wrapperClassName?: string;
  /** Additional trigger className */
  className?: string;
  /** ID for the select */
  id?: string;
  /** Name for form submission */
  name?: string;
  /** Dropdown side preference */
  side?: 'top' | 'bottom';
  /** Dropdown alignment */
  align?: 'start' | 'center' | 'end';
}

// ============================================================================
// Styles
// ============================================================================

const variantStyles: Record<SelectVariant, string> = {
  default: `
    bg-[var(--bg-surface)]
    border border-[var(--border-subtle)]
    hover:border-[var(--border-default)]
    data-[state=open]:border-[var(--border-focus)]
  `,
  outlined: `
    bg-transparent
    border-2 border-[var(--border-default)]
    hover:border-[var(--accent-indigo)]/50
    data-[state=open]:border-[var(--accent-indigo)]
    data-[state=open]:bg-[var(--bg-surface)]/30
  `,
  filled: `
    bg-[var(--bg-elevated)]
    border border-transparent
    hover:bg-[var(--bg-surface)]
    data-[state=open]:bg-[var(--bg-surface)]
    data-[state=open]:border-[var(--border-focus)]
  `,
  ghost: `
    bg-transparent
    border border-transparent
    hover:bg-[var(--bg-surface)]
    data-[state=open]:bg-[var(--bg-surface)]
    data-[state=open]:border-[var(--border-subtle)]
  `,
};

const sizeStyles: Record<SelectSize, {
  trigger: string;
  icon: string;
  label: string;
  chevron: number;
  content: string;
  item: string;
  itemIcon: string;
}> = {
  sm: {
    trigger: 'h-8 px-2.5 text-[11px] rounded-[var(--radius-sm)] gap-1.5',
    icon: 'w-3.5 h-3.5',
    label: 'text-[10px]',
    chevron: 12,
    content: 'rounded-[var(--radius-sm)]',
    item: 'px-2.5 py-1.5 text-[11px] rounded-[var(--radius-sm)]',
    itemIcon: 'w-3.5 h-3.5',
  },
  md: {
    trigger: 'h-9 px-3 text-[12px] rounded-[var(--radius-md)] gap-2',
    icon: 'w-4 h-4',
    label: 'text-[10px]',
    chevron: 14,
    content: 'rounded-[var(--radius-md)]',
    item: 'px-3 py-2 text-[12px] rounded-[var(--radius-sm)]',
    itemIcon: 'w-4 h-4',
  },
  lg: {
    trigger: 'h-11 px-4 text-[13px] rounded-[var(--radius-md)] gap-2.5',
    icon: 'w-5 h-5',
    label: 'text-[11px]',
    chevron: 16,
    content: 'rounded-[var(--radius-lg)]',
    item: 'px-4 py-2.5 text-[13px] rounded-[var(--radius-md)]',
    itemIcon: 'w-5 h-5',
  },
};

const statusStyles: Record<SelectStatus, { border: string; text: string; icon: React.ReactNode }> = {
  default: {
    border: '',
    text: 'text-[var(--text-tertiary)]',
    icon: null,
  },
  error: {
    border: 'border-[var(--accent-rose)]! hover:border-[var(--accent-rose)]! data-[state=open]:border-[var(--accent-rose)]!',
    text: 'text-[var(--accent-rose)]',
    icon: <AlertCircle className="text-[var(--accent-rose)]" />,
  },
  success: {
    border: 'border-[var(--accent-emerald)]! hover:border-[var(--accent-emerald)]! data-[state=open]:border-[var(--accent-emerald)]!',
    text: 'text-[var(--accent-emerald)]',
    icon: <CheckCircle className="text-[var(--accent-emerald)]" />,
  },
  warning: {
    border: 'border-[var(--accent-amber)]! hover:border-[var(--accent-amber)]! data-[state=open]:border-[var(--accent-amber)]!',
    text: 'text-[var(--accent-amber)]',
    icon: <AlertCircle className="text-[var(--accent-amber)]" />,
  },
};

// ============================================================================
// Sub-Components
// ============================================================================

interface SelectItemProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
  size?: SelectSize;
  description?: string;
  icon?: React.ReactNode;
}

const SelectItem = forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, SelectItemProps>(
  ({ className, children, size = 'md', description, icon, ...props }, ref) => {
    const sizeStyle = sizeStyles[size];

    return (
      <SelectPrimitive.Item
        ref={ref}
        className={clsx(
          'relative flex items-center gap-2 cursor-pointer select-none outline-none',
          'transition-colors duration-75',
          'text-[var(--text-primary)]',
          'data-[highlighted]:bg-[var(--bg-hover)]',
          'data-[state=checked]:bg-[var(--accent-indigo)]/10',
          'data-[disabled]:opacity-40 data-[disabled]:pointer-events-none',
          sizeStyle.item,
          className
        )}
        {...props}
      >
        {/* Custom icon */}
        {icon && (
          <span className={clsx(sizeStyle.itemIcon, 'text-[var(--text-tertiary)] flex-shrink-0')}>
            {icon}
          </span>
        )}

        {/* Label and description */}
        <div className="flex-1 min-w-0">
          <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
          {description && (
            <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
              {description}
            </p>
          )}
        </div>

        {/* Check indicator */}
        <SelectPrimitive.ItemIndicator className="flex-shrink-0">
          <Check className={clsx(sizeStyle.itemIcon, 'text-[var(--accent-indigo)]')} />
        </SelectPrimitive.ItemIndicator>
      </SelectPrimitive.Item>
    );
  }
);
SelectItem.displayName = 'SelectItem';

interface SelectGroupProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Group> {
  label: string;
  size?: SelectSize;
}

const SelectGroupComponent = forwardRef<React.ElementRef<typeof SelectPrimitive.Group>, SelectGroupProps>(
  ({ className, label, children, ...props }, ref) => {
    return (
      <SelectPrimitive.Group ref={ref} className={className} {...props}>
        <SelectPrimitive.Label
          className={clsx(
            'px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider',
            'text-[var(--text-tertiary)]',
            'select-none'
          )}
        >
          {label}
        </SelectPrimitive.Label>
        {children}
      </SelectPrimitive.Group>
    );
  }
);
SelectGroupComponent.displayName = 'SelectGroup';

const SelectSeparator = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={clsx('h-px my-1 mx-2 bg-[var(--border-subtle)]', className)}
    {...props}
  />
));
SelectSeparator.displayName = 'SelectSeparator';

// ============================================================================
// Main Component
// ============================================================================

const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      variant = 'default',
      size = 'md',
      status: statusProp = 'default',
      label,
      error,
      helperText,
      leftIcon,
      loading = false,
      placeholder = 'Select...',
      options,
      groups,
      disabled,
      required,
      fullWidth = true,
      wrapperClassName,
      className,
      id,
      name,
      side = 'bottom',
      align = 'start',
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    // Determine status
    const status = error ? 'error' : statusProp;

    // Style lookups
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];
    const statusStyle = statusStyles[status];

    // Find selected option for icon display
    const allOptions = groups?.flatMap((g) => g.options) || options || [];
    const selectedOption = allOptions.find((opt) => opt.value === value || opt.value === defaultValue);

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
            htmlFor={selectId}
            className={clsx(
              'ds-label font-medium',
              sizeStyle.label,
              disabled && 'opacity-50'
            )}
          >
            {label}
            {required && (
              <span className="text-[var(--accent-rose)] ml-0.5">*</span>
            )}
          </label>
        )}

        {/* Select */}
        <SelectPrimitive.Root
          value={value}
          defaultValue={defaultValue}
          onValueChange={onChange}
          disabled={disabled || loading}
          name={name}
          required={required}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={selectId}
            className={clsx(
              // Base styles
              'flex items-center justify-between w-full',
              'font-[var(--font-mono)]',
              'outline-none cursor-pointer',
              'transition-all duration-[120ms]',
              // Variant styles
              variantStyle,
              // Size styles
              sizeStyle.trigger,
              // Status border override
              status !== 'default' && statusStyle.border,
              // Disabled/loading state
              (disabled || loading) && 'opacity-50 cursor-not-allowed',
              // Custom className
              className
            )}
          >
            {/* Left section: icon + value */}
            <span className="flex items-center gap-2 min-w-0 flex-1">
              {/* Left icon */}
              {leftIcon && (
                <span className={clsx(sizeStyle.icon, 'text-[var(--text-tertiary)] flex-shrink-0')}>
                  {leftIcon}
                </span>
              )}

              {/* Value or placeholder */}
              <span className="truncate flex items-center gap-2">
                {selectedOption?.icon && (
                  <span className={clsx(sizeStyle.icon, 'flex-shrink-0')}>
                    {selectedOption.icon}
                  </span>
                )}
                <SelectPrimitive.Value placeholder={placeholder} />
              </span>
            </span>

            {/* Right section: status icon + chevron */}
            <span className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              {/* Status icon */}
              {status !== 'default' && statusStyle.icon && !loading && (
                <span className={sizeStyle.icon}>
                  {React.cloneElement(statusStyle.icon as React.ReactElement, {
                    className: sizeStyle.icon,
                  })}
                </span>
              )}

              {/* Loading or chevron */}
              {loading ? (
                <Loader2
                  size={sizeStyle.chevron}
                  className="animate-spin text-[var(--text-tertiary)]"
                />
              ) : (
                <SelectPrimitive.Icon asChild>
                  <ChevronDown
                    size={sizeStyle.chevron}
                    className="text-[var(--text-tertiary)]"
                  />
                </SelectPrimitive.Icon>
              )}
            </span>
          </SelectPrimitive.Trigger>

          {/* Dropdown Portal */}
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              side={side}
              align={align}
              sideOffset={4}
              position="popper"
              className={clsx(
                'z-[9999] overflow-hidden',
                'bg-[var(--bg-elevated)]',
                'border border-[var(--border-default)]',
                'shadow-lg',
                sizeStyle.content,
                // Animation
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
                'data-[side=bottom]:slide-in-from-top-2',
                'data-[side=top]:slide-in-from-bottom-2',
                // Width matches trigger
                'min-w-[var(--radix-select-trigger-width)]',
                'max-h-[min(var(--radix-select-content-available-height),320px)]'
              )}
            >
              {/* Scroll Up Button */}
              <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 bg-[var(--bg-elevated)] cursor-default border-b border-[var(--border-subtle)]">
                <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
              </SelectPrimitive.ScrollUpButton>

              {/* Viewport */}
              <SelectPrimitive.Viewport className="p-1.5">
                {/* Render grouped options */}
                {groups && groups.length > 0 && (
                  <>
                    {groups.map((group, groupIndex) => (
                      <React.Fragment key={group.label}>
                        {groupIndex > 0 && <SelectSeparator />}
                        <SelectGroupComponent label={group.label} size={size}>
                          {group.options.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              disabled={option.disabled}
                              size={size}
                              description={option.description}
                              icon={option.icon}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroupComponent>
                      </React.Fragment>
                    ))}
                  </>
                )}

                {/* Render flat options */}
                {options && options.length > 0 && !groups && (
                  <>
                    {options.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        size={size}
                        description={option.description}
                        icon={option.icon}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </>
                )}

                {/* Empty state */}
                {(!options || options.length === 0) && (!groups || groups.length === 0) && (
                  <div className="py-6 text-center text-[var(--text-tertiary)] text-sm">
                    No options available
                  </div>
                )}
              </SelectPrimitive.Viewport>

              {/* Scroll Down Button */}
              <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 bg-[var(--bg-elevated)] cursor-default border-t border-[var(--border-subtle)]">
                <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

        {/* Error or helper text */}
        {(error || helperText) && (
          <p
            className={clsx(
              'text-[11px]',
              error ? statusStyle.text : 'text-[var(--text-tertiary)]'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// ============================================================================
// Exports
// ============================================================================

export default Select;
export { Select, SelectItem, SelectGroupComponent as SelectGroup, SelectSeparator };
export type { SelectGroup as SelectGroupType, SelectVariant, SelectSize, SelectStatus };