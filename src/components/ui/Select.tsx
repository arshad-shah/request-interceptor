import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  onChange?: (value: string) => void;
  placeholder?: string;
}

interface OptionProps {
  value: string;
  label: string;
  disabled?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  className,
  children,
  label,
  error,
  helperText,
  leftIcon,
  id,
  value,
  onChange,
  placeholder = "Select an option...",
  disabled,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || '');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Parse options from children
  const options: OptionProps[] = React.Children.toArray(children)
    .filter((child): child is React.ReactElement => React.isValidElement(child))
    .map((child) => ({
      value: child.props.value || '',
      label: child.props.children || child.props.value || '',
      disabled: child.props.disabled || false
    }));

  const selectedOption = options.find(option => option.value === selectedValue);

  // Calculate dropdown position
  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;

      setDropdownPosition({
        top: rect.bottom + scrollY + 8, // 8px gap
        left: rect.left + scrollX,
        width: rect.width
      });
    }
  };

  // Sync selectedValue with value prop changes
  useEffect(() => {
    setSelectedValue(value || '');
  }, [value]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position when opened
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();

      // Update position on scroll/resize
      const handleReposition = () => updateDropdownPosition();
      window.addEventListener('scroll', handleReposition, true);
      window.addEventListener('resize', handleReposition);

      return () => {
        window.removeEventListener('scroll', handleReposition, true);
        window.removeEventListener('resize', handleReposition);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else if (focusedIndex >= 0) {
          handleOptionSelect(options[focusedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex(prev =>
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        }
        break;
    }
  };

  const handleOptionSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
    onChange?.(optionValue);
    triggerRef.current?.focus();
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setFocusedIndex(0);
      }
    }
  };

  // Dropdown component to be rendered in portal
  const dropdown = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 9999,
      }}
      className={cn(
        "bg-ds-bg-elevated rounded-ds-md shadow-ds-lg border border-ds-border-subtle",
        "max-h-60 overflow-auto",
        "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
    >
      <div className="p-1.5">
        {options.length === 0 ? (
          <div className="px-3 py-2 text-sm text-ds-text-tertiary text-center">
            No options available
          </div>
        ) : (
          options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionSelect(option.value)}
              disabled={option.disabled}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-ds-sm text-sm transition-all duration-150",
                "text-left focus:outline-none",
                // Hover and focus states
                !option.disabled && "hover:bg-ds-bg-surface focus:bg-ds-bg-surface",
                // Selected state
                selectedValue === option.value && "bg-ds-accent-indigo/15 text-ds-accent-indigo font-medium",
                // Focused state (keyboard navigation)
                focusedIndex === index && !option.disabled && "bg-ds-bg-hover",
                // Disabled state
                option.disabled && "text-ds-text-tertiary cursor-not-allowed opacity-60",
                // Default text color
                selectedValue !== option.value && !option.disabled && "text-ds-text-secondary"
              )}
              role="option"
              aria-selected={selectedValue === option.value}
            >
              <span className="truncate">{option.label}</span>
              {selectedValue === option.value && (
                <Check className="w-4 h-4 text-ds-accent-indigo flex-shrink-0 ml-2" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            "block text-sm font-medium transition-colors",
            error ? "text-ds-accent-rose" : "text-ds-text-secondary",
            disabled && "text-ds-text-tertiary"
          )}
        >
          {label}
        </label>
      )}

      <div className="relative">
        {/* Hidden native select for form compatibility */}
        <select
          ref={ref}
          id={selectId}
          value={selectedValue}
          onChange={() => {}} // Handled by custom dropdown
          className="sr-only"
          tabIndex={-1}
          {...props}
        >
          <option value="">{placeholder}</option>
          {children}
        </select>

        {/* Custom trigger button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5",
            "border rounded-ds-md bg-ds-bg-surface text-left",
            "transition-all duration-200 cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-ds-border-focus/30",
            "hover:shadow-ds-sm hover:border-ds-border",
            // Error states
            error
              ? "border-ds-accent-rose/50 focus:border-ds-accent-rose"
              : "border-ds-border-subtle focus:border-ds-border-focus",
            // Disabled states
            disabled && "bg-ds-bg-base cursor-not-allowed opacity-60 hover:shadow-none hover:border-ds-border-subtle",
            // Open state
            isOpen && !error && "border-ds-border-focus ring-2 ring-ds-border-focus/30",
            className
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? `${selectId}-label` : undefined}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {leftIcon && (
              <div className={cn(
                "flex-shrink-0 transition-colors",
                error ? "text-ds-accent-rose" : "text-ds-text-tertiary",
                selectedValue && !error && "text-ds-accent-indigo"
              )}>
                {leftIcon}
              </div>
            )}

            <span className={cn(
              "block truncate text-sm",
              selectedValue
                ? "text-ds-text-primary font-medium"
                : "text-ds-text-tertiary"
            )}>
              {selectedOption?.label || placeholder}
            </span>
          </div>

          <ChevronDown className={cn(
            "w-4 h-4 transition-all duration-200 flex-shrink-0",
            isOpen && "rotate-180",
            error ? "text-ds-accent-rose" : "text-ds-text-tertiary"
          )} />
        </button>
      </div>

      {/* Render dropdown in portal */}
      {typeof document !== 'undefined' && dropdown && createPortal(dropdown, document.body)}

      {(error || helperText) && (
        <div className="flex items-start gap-2">
          {error && (
            <div className="w-1 h-4 bg-ds-accent-rose rounded-full flex-shrink-0 mt-0.5"></div>
          )}
          <p className={cn(
            "text-sm leading-5",
            error ? "text-ds-accent-rose font-medium" : "text-ds-text-tertiary"
          )}>
            {error || helperText}
          </p>
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
