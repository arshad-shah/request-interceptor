import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
        <motion.div
          className={cn(
            "relative rounded-full border-2 transition-all duration-200 ease-out",
            sizeConfig.container,
            !disabled && "group-hover:scale-105",
            disabled && "opacity-60"
          )}
          animate={{
            borderColor: checked 
              ? (disabled ? '#9ca3af' : '#3b82f6') 
              : (disabled ? '#d1d5db' : '#e5e7eb'),
            backgroundColor: checked 
              ? (disabled ? '#f3f4f6' : '#eff6ff') 
              : '#ffffff',
            scale: !disabled && checked ? [1, 1.1, 1] : 1
          }}
          transition={{ 
            duration: checked ? 0.3 : 0.2,
            ease: "easeOut"
          }}
          whileHover={!disabled ? { scale: 1.05 } : {}}
          whileTap={!disabled ? { scale: 0.95 } : {}}
        >
          {/* Inner dot */}
          <AnimatePresence>
            {checked && (
              <motion.div
                className={cn(
                  "absolute inset-0 flex items-center justify-center"
                )}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 500, 
                  damping: 25 
                }}
              >
                <motion.div
                  className={cn(
                    "rounded-full transition-colors duration-200",
                    sizeConfig.dot,
                    checked 
                      ? (disabled ? 'bg-gray-400' : 'bg-blue-500') 
                      : 'bg-transparent'
                  )}
                  animate={{
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Active state ring */}
          {checked && !disabled && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-30"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.3, opacity: 0 }}
              transition={{ 
                duration: 0.6,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          )}
        </motion.div>
      </div>

      {/* Label and Description */}
      {(label || icon) && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {icon && (
              <motion.div
                animate={{
                  color: checked ? '#3b82f6' : '#6b7280'
                }}
                transition={{ duration: 0.2 }}
              >
                {icon}
              </motion.div>
            )}
            {label && (
              <span className={cn(
                "font-medium select-none transition-colors duration-200",
                sizeConfig.text,
                checked ? 'text-blue-700' : 'text-gray-700',
                disabled && 'text-gray-500'
              )}>
                {label}
              </span>
            )}
          </div>
          {description && (
            <motion.p 
              className="text-xs text-gray-500 mt-1 select-none"
              animate={{
                color: checked ? '#6b7280' : '#9ca3af'
              }}
              transition={{ duration: 0.2 }}
            >
              {description}
            </motion.p>
          )}
        </div>
      )}
    </label>
  );
};

export default Radio;