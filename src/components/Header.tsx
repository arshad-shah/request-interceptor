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
    <header className="relative bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200/80">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-2 left-20 w-32 h-32 rounded-full bg-primary-500/10 blur-xl" />
        <div className="absolute top-8 right-16 w-24 h-24 rounded-full bg-blue-500/10 blur-xl" />
      </div>
      
      <div className="relative px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Enhanced Brand Section */}
          <div className="flex items-center gap-4">
            {/* Animated Logo */}
            <div className="relative group">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 blur-sm opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent"
                  animate={{ 
                    background: [
                      'linear-gradient(45deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                      'linear-gradient(225deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 50%, transparent 100%)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                
                {/* Lightning bolt with pulse */}
                <motion.div
                  animate={enabled ? { 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, 0, -5, 0]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Zap className="w-6 h-6 text-white relative z-10 drop-shadow-sm" />
                </motion.div>
              </div>
            </div>
            
            {/* Title and subtitle */}
            <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 leading-tight">
                Request Interceptor
              </h1>
            </div>
          </div>

          {/* Enhanced Status Toggle */}
          <div className="flex items-center gap-4">

            {/* Toggle with enhanced styling */}
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2.5 shadow-sm border border-gray-200/60 hover:shadow-md transition-all duration-200">
                          {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <motion.div
                className={cn(
                  "w-2 h-2 rounded-full",
                  enabled ? "bg-green-500" : "bg-red-500"
                )}
                animate={enabled ? {
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className={cn(
                "text-sm font-semibold transition-colors",
                enabled ? "text-green-700" : "text-red-700"
              )}>
                {enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
              
              <Toggle
                checked={enabled} 
                onChange={handleToggle}
                size="md"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;