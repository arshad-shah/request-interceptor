import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizes = {
  sm: {
    container: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translateX: 16,
    padding: 'top-0.5 left-0.5'
  },
  md: {
    container: 'w-11 h-6',
    thumb: 'w-5 h-5',
    translateX: 20,
    padding: 'top-0.5 left-0.5'
  },
  lg: {
    container: 'w-14 h-7',
    thumb: 'w-6 h-6',
    translateX: 28,
    padding: 'top-0.5 left-0.5'
  }
};

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className
}) => {
  const sizeConfig = sizes[size];

  return (
    <label className={cn(
      "inline-flex items-center cursor-pointer",
      disabled && "cursor-not-allowed opacity-50",
      className
    )}>
      {label && (
        <span className="mr-3 text-sm font-medium text-gray-700">
          {label}
        </span>
      )}
      
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        
        <motion.div
          className={cn(
            "relative inline-block rounded-full transition-colors duration-300",
            sizeConfig.container,
            checked ? "bg-primary-500" : "bg-gray-300",
            !disabled && "focus-within:ring-4 focus-within:ring-primary-200"
          )}
          animate={{
            backgroundColor: checked ? (disabled ? '#9ca3af' : '#4063ee') : '#d1d5db'
          }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={cn(
              "absolute bg-white rounded-full shadow-md transition-transform duration-300",
              sizeConfig.thumb,
              sizeConfig.padding
            )}
            animate={{
              x: checked ? sizeConfig.translateX : 0
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
          />
        </motion.div>
      </div>
    </label>
  );
};

export default Toggle;