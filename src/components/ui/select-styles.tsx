import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type SelectVariant = 'default' | 'outlined' | 'filled' | 'ghost';
export type SelectSize = 'sm' | 'md' | 'lg';
export type SelectStatus = 'default' | 'error' | 'success' | 'warning';

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

export const variantStyles: Record<SelectVariant, string> = {
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

export const sizeStyles: Record<SelectSize, {
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

export const statusStyles: Record<SelectStatus, { border: string; text: string; icon: React.ReactNode }> = {
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
