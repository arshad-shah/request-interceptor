import { chromeApi } from "@/lib/chrome-api";
import { useAppStore } from "@/stores/app-store";
import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from "lucide-react";
import Toggle from "@/components/ui/Toggle";
import { cn } from "@/lib/utils";

const Header: React.FC = () => {
  const { enabled, setEnabled, addNotification } = useAppStore();

  const handleToggle = async (isEnabled: boolean) => {
    try {
      const response = await chromeApi.toggleEnabled(isEnabled);
      if (response.success) {
        setEnabled(isEnabled);
      }
    } catch (error) {
      addNotification('Error', 'Failed to toggle interceptor', 'error');
    }
  };

  return (
    <header className="relative bg-white border-b border-gray-200">
      {/* Subtle accent gradient */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 transition-all duration-500",
        enabled 
          ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" 
          : "bg-gradient-to-r from-gray-300 to-gray-400"
      )} />
      
      {/* Main content */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Section */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            {/* Logo */}
            <motion.div
              className={cn(
                "relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300",
                "border border-white/20",
                enabled 
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600" 
                  : "bg-gradient-to-br from-gray-500 to-gray-600"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Subtle inner glow */}
              <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-white/30 to-transparent opacity-60" />
              
              <motion.div
                animate={enabled ? { 
                  rotate: [0, 5, 0, -5, 0] 
                } : {}}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white relative z-10" />
              </motion.div>
            </motion.div>
            
            {/* Title */}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                Request Interceptor
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                {enabled ? 'Active monitoring' : 'Ready to monitor'}
              </p>
            </div>
          </div>

          {/* Control Section */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {/* Status Indicator */}
            <div className={cn(
              "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-300",
              "bg-white border shadow-sm",
              enabled 
                ? "border-blue-200 shadow-blue-100" 
                : "border-gray-200 shadow-gray-100"
            )}>
              {/* Status dot */}
              <div className="relative">
                <motion.div
                  className={cn(
                    "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors duration-300",
                    enabled ? "bg-green-500" : "bg-gray-400"
                  )}
                  animate={enabled ? {
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Subtle pulse ring */}
                {enabled && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-green-400"
                    animate={{
                      scale: [1, 2, 1],
                      opacity: [0.3, 0, 0.3]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              
              {/* Status text */}
              <div className="flex flex-col">
                <span className={cn(
                  "text-xs sm:text-sm font-semibold transition-colors duration-300",
                  enabled ? "text-green-700" : "text-gray-600"
                )}>
                  {enabled ? 'ACTIVE' : 'INACTIVE'}
                </span>
                <span className="text-xs text-gray-500 hidden sm:block">
                  {enabled ? 'Intercepting' : 'Standby'}
                </span>
              </div>
            </div>

            {/* Toggle */}
            <motion.div 
              className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3 shadow-sm hover:shadow-md transition-shadow duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Toggle
                checked={enabled} 
                onChange={handleToggle}
                size="md"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;