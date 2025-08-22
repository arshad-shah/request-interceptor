import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

const sizes = {
  sm: {
    container: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translateX: 16,
    padding: 'top-0.5 left-0.5',
    textSize: 'text-xs'
  },
  md: {
    container: 'w-11 h-6',
    thumb: 'w-5 h-5',
    translateX: 20,
    padding: 'top-0.5 left-0.5',
    textSize: 'text-xs'
  },
  lg: {
    container: 'w-14 h-7',
    thumb: 'w-6 h-6',
    translateX: 28,
    padding: 'top-0.5 left-0.5',
    textSize: 'text-xs'
  },
  xl: {
    container: 'w-16 h-8',
    thumb: 'w-7 h-7',
    translateX: 32,
    padding: 'top-0.5 left-0.5',
    textSize: 'text-xs'
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
      "inline-flex items-center cursor-pointer group",
      disabled && "cursor-not-allowed opacity-50",
      className
    )}>
      {label && (
        <span className="mr-3 text-sm font-medium text-gray-700 select-none">
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
        
        {/* Toggle Track */}
        <motion.div
          className={cn(
            "relative inline-block rounded-full border-2 transition-all duration-300 ease-out",
            sizeConfig.container,
            !disabled && "group-hover:shadow-lg",
            disabled && "opacity-60"
          )}
          animate={{
            backgroundColor: checked 
              ? (disabled ? '#9ca3af' : '#3b82f6') 
              : (disabled ? '#e5e7eb' : '#f3f4f6'),
            borderColor: checked 
              ? (disabled ? '#9ca3af' : '#3b82f6') 
              : (disabled ? '#d1d5db' : '#e5e7eb'),
            scale: !disabled && checked ? [1, 1.05, 1] : 1
          }}
          transition={{ 
            duration: checked ? 0.6 : 0.3,
            ease: "easeOut"
          }}
          whileHover={!disabled ? { scale: 1.05 } : {}}
          whileTap={!disabled ? { scale: 0.95 } : {}}
        >
          {/* Subtle inner glow when active */}
          {checked && !disabled && (
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-400 opacity-20"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.2 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
          
          {/* Track indicators (ON/OFF text) */}
          <div className="absolute inset-0 flex items-center justify-between px-1">
            {/* ON indicator */}
            <motion.span
              className={cn(
                "font-bold text-white select-none",
                sizeConfig.textSize
              )}
              animate={{
                opacity: checked ? 1 : 0,
                scale: checked ? 1 : 0.8
              }}
              transition={{ duration: 0.2 }}
            >
              I
            </motion.span>
            
            {/* OFF indicator */}
            <motion.span
              className={cn(
                "font-bold text-gray-400 select-none",
                sizeConfig.textSize
              )}
              animate={{
                opacity: checked ? 0 : 1,
                scale: checked ? 0.8 : 1
              }}
              transition={{ duration: 0.2 }}
            >
              O
            </motion.span>
          </div>
        </motion.div>
        
        {/* Toggle Thumb */}
        <motion.div
          className={cn(
            "absolute bg-white rounded-full shadow-lg border-2 border-white",
            "transition-all duration-300 ease-out",
            sizeConfig.thumb,
            sizeConfig.padding,
            !disabled && "group-hover:shadow-xl"
          )}
          animate={{
            x: checked ? sizeConfig.translateX : 0,
            scale: !disabled ? (checked ? [1, 1.1, 1] : 1) : 1,
            boxShadow: checked 
              ? "0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1)"
              : "0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)"
          }}
          transition={{
            type: "spring",
            stiffness: 600,
            damping: 35,
            mass: 0.8
          }}
          whileHover={!disabled ? { scale: 1.1 } : {}}
        >
          {/* Inner thumb glow */}
          {checked && !disabled && (
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-400 opacity-30"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
          
          {/* Thumb highlight */}
          <div className="absolute inset-0.5 rounded-full bg-gradient-to-tr from-white/60 to-transparent" />
        </motion.div>
        
        {/* Active state ring */}
        {checked && !disabled && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-50"
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ 
              duration: 1,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        )}
        
      </div>
    </label>
  );
};

export default Toggle;