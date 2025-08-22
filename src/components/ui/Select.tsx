import React, { forwardRef, useState, useRef, useEffect } from 'react';
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

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={selectId}
          className={cn(
            "block text-sm font-medium transition-colors",
            error ? "text-red-700" : "text-gray-700",
            disabled && "text-gray-400"
          )}
        >
          {label}
        </label>
      )}
      
      <div className="relative" ref={dropdownRef}>
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
            "w-full flex items-center justify-between px-4 py-3",
            "border-2 rounded-xl bg-white text-left",
            "transition-all duration-200 cursor-pointer",
            "focus:outline-none focus:ring-4 focus:ring-blue-500/20",
            "hover:shadow-md hover:border-gray-300",
            // Error states
            error 
              ? "border-red-300 focus:border-red-500 shadow-red-100" 
              : "border-gray-200 focus:border-blue-500",
            // Disabled states
            disabled && "bg-gray-50 cursor-not-allowed opacity-60 hover:shadow-none hover:border-gray-200",
            // Open state
            isOpen && !error && "border-blue-500 ring-4 ring-blue-500/20",
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
                error ? "text-red-500" : "text-gray-400",
                selectedValue && !error && "text-blue-500"
              )}>
                {leftIcon}
              </div>
            )}
            
            <span className={cn(
              "block truncate text-sm",
              selectedValue 
                ? "text-gray-900 font-medium" 
                : "text-gray-500"
            )}>
              {selectedOption?.label || placeholder}
            </span>
          </div>
          
          <ChevronDown className={cn(
            "w-4 h-4 transition-all duration-200 flex-shrink-0",
            isOpen && "rotate-180",
            error ? "text-red-500" : "text-gray-400"
          )} />
        </button>

        {/* Custom dropdown */}
        {isOpen && (
          <div className={cn(
            "absolute top-full left-0 right-0 mt-2 z-50",
            "bg-white rounded-xl shadow-xl border-2 border-gray-200",
            "max-h-60 overflow-auto",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}>
            <div className="p-2">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
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
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                      "text-left focus:outline-none",
                      // Hover and focus states
                      !option.disabled && "hover:bg-gray-50 focus:bg-gray-50",
                      // Selected state
                      selectedValue === option.value && "bg-blue-50 text-blue-700 font-medium",
                      // Focused state (keyboard navigation)
                      focusedIndex === index && !option.disabled && "bg-gray-100",
                      // Disabled state
                      option.disabled && "text-gray-400 cursor-not-allowed opacity-60"
                    )}
                    role="option"
                    aria-selected={selectedValue === option.value}
                  >
                    <span className="truncate">{option.label}</span>
                    {selectedValue === option.value && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className="flex items-start gap-2">
          {error && (
            <div className="w-1 h-4 bg-red-400 rounded-full flex-shrink-0 mt-0.5"></div>
          )}
          <p className={cn(
            "text-sm leading-5",
            error ? "text-red-600 font-medium" : "text-gray-500"
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