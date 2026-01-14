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

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className
}) => {
  return (
    <label className={cn(
      'ds-toggle',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
      />
      <div className="ds-toggle-track" />
      <div className="ds-toggle-thumb" />
    </label>
  );
};

export default Toggle;
