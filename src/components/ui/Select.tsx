import React, { forwardRef, useId } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import {
  sizeStyles,
  statusStyles,
  variantStyles,
  type SelectGroup,
  type SelectOption,
  type SelectProps,
  type SelectSize,
  type SelectStatus,
  type SelectVariant,
} from './select-styles';
import { SelectGroupComponent, SelectItem, SelectSeparator } from './SelectParts';

export type { SelectOption, SelectProps };

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