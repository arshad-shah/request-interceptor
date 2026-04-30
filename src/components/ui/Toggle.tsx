import React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeClasses: Record<'sm' | 'md' | 'lg', { toggle: string; track: string; thumb: string; translate: string }> = {
  sm: {
    toggle: 'w-[32px] h-[18px]',
    track: 'rounded-[9px]',
    thumb: 'w-[12px] h-[12px] top-[3px] left-[3px]',
    translate: 'translate-x-[14px]',
  },
  md: {
    toggle: 'w-[40px] h-[22px]',
    track: 'rounded-[11px]',
    thumb: 'w-[16px] h-[16px] top-[3px] left-[3px]',
    translate: 'translate-x-[18px]',
  },
  lg: {
    toggle: 'w-[52px] h-[28px]',
    track: 'rounded-[14px]',
    thumb: 'w-[22px] h-[22px] top-[3px] left-[3px]',
    translate: 'translate-x-[24px]',
  },
};

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className
}) => {
  const s = sizeClasses[size];

  return (
    <label
      className={cn(
        'relative inline-flex cursor-pointer',
        s.toggle,
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-label={label}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="absolute opacity-0 w-0 h-0"
      />
      <div
        className={cn(
          'w-full h-full bg-[var(--bg-surface)] transition-colors duration-[var(--transition-fast)]',
          s.track,
          checked && 'bg-[rgba(99,102,241,0.2)]'
        )}
      />
      <div
        className={cn(
          'absolute rounded-full bg-[var(--text-tertiary)] transition-all duration-[var(--transition-fast)]',
          s.thumb,
          checked && cn(s.translate, 'bg-[var(--accent-indigo)]')
        )}
      />
    </label>
  );
};

export default Toggle;
