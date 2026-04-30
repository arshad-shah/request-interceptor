import React from 'react';
import { cn } from '@/lib/utils';

interface RadioProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
  value: string;
  name: string;
  className?: string;
  icon?: React.ReactNode;
}

const sizes = {
  sm: {
    container: 'w-4 h-4',
    dot: 'w-2 h-2',
    text: 'text-sm',
    gap: 'gap-2'
  },
  md: {
    container: 'w-5 h-5',
    dot: 'w-2.5 h-2.5',
    text: 'text-sm',
    gap: 'gap-3'
  },
  lg: {
    container: 'w-6 h-6',
    dot: 'w-3 h-3',
    text: 'text-base',
    gap: 'gap-3'
  }
};

const Radio: React.FC<RadioProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  description,
  value,
  name,
  className,
  icon
}) => {
  const sizeConfig = sizes[size];

  return (
    <label className={cn(
      "inline-flex items-start cursor-pointer group",
      disabled && "cursor-not-allowed opacity-50",
      sizeConfig.gap,
      className
    )}>
      <div className="relative flex-shrink-0">
        <input
          type="radio"
          className="sr-only"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          value={value}
          name={name}
        />

        {/* Radio Container */}
        <div
          className={cn(
            "relative rounded-full border-2 transition-all duration-200 ease-out flex items-center justify-center",
            sizeConfig.container,
            !disabled && "group-hover:scale-105",
            disabled && "opacity-60",
            checked
              ? "border-[var(--accent-cyan)] bg-[rgba(6,182,212,0.1)]"
              : "border-[var(--border-default)] bg-[var(--bg-surface)]"
          )}
        >
          {/* Inner dot */}
          {checked && (
            <div
              className={cn(
                "rounded-full transition-all duration-200",
                sizeConfig.dot,
                "bg-[var(--accent-cyan)]"
              )}
            />
          )}
        </div>
      </div>

      {/* Label and Description */}
      {(label || icon) && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {icon && (
              <div className={cn(
                "transition-colors duration-200",
                checked ? "text-[var(--accent-cyan)]" : "text-[var(--text-tertiary)]"
              )}>
                {icon}
              </div>
            )}
            {label && (
              <span className={cn(
                "font-medium select-none transition-colors duration-200",
                sizeConfig.text,
                checked ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
                disabled && "text-[var(--text-tertiary)]"
              )}>
                {label}
              </span>
            )}
          </div>
          {description && (
            <p className={cn(
              "text-xs mt-1 select-none transition-colors duration-200",
              checked ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]"
            )}>
              {description}
            </p>
          )}
        </div>
      )}
    </label>
  );
};

export default Radio;
