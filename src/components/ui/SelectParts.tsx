import React, { forwardRef } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import { sizeStyles, type SelectSize } from './select-styles';

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

export { SelectItem, SelectGroupComponent, SelectSeparator };
