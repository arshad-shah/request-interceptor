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
      addNotification({
        title: 'Error',
        message: 'Failed to toggle interceptor',
        type: 'error',
        timestamp: Date.now()
      });
    }
  };

  return (
    <header className="relative bg-ds-bg-elevated border-b border-ds-border-subtle">
      {/* Subtle accent gradient */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 transition-all duration-500",
        enabled
          ? "bg-gradient-to-r from-ds-accent-indigo via-ds-accent-violet to-ds-accent-cyan"
          : "bg-gradient-to-r from-ds-bg-surface to-ds-bg-hover"
      )} />

      {/* Main content */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Section */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            {/* Logo */}
            <motion.div
              className={cn(
                "relative w-10 h-10 sm:w-12 sm:h-12 rounded-ds-lg flex items-center justify-center shadow-ds-md transition-all duration-300",
                "border border-white/10",
                enabled
                  ? "bg-gradient-to-br from-ds-accent-indigo to-ds-accent-violet"
                  : "bg-gradient-to-br from-ds-bg-surface to-ds-bg-hover"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Subtle inner glow */}
              <div className="absolute inset-1 rounded-ds-md bg-gradient-to-br from-white/20 to-transparent opacity-60" />

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
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-ds-text-primary truncate">
                Request Interceptor
              </h1>
              <p className="text-xs sm:text-sm text-ds-text-secondary hidden sm:block">
                {enabled ? 'Active monitoring' : 'Ready to monitor'}
              </p>
            </div>
          </div>

          {/* Control Section */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {/* Status Indicator */}
            <div className={cn(
              "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-ds-md transition-all duration-300",
              "bg-ds-bg-surface border shadow-ds-sm",
              enabled
                ? "border-ds-accent-emerald/30"
                : "border-ds-border-subtle"
            )}>
              {/* Status dot */}
              <div className="relative">
                <motion.div
                  className={cn(
                    "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors duration-300",
                    enabled ? "bg-ds-accent-emerald" : "bg-ds-text-tertiary"
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
                    className="absolute inset-0 rounded-full bg-ds-accent-emerald"
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
                  enabled ? "text-ds-accent-emerald" : "text-ds-text-tertiary"
                )}>
                  {enabled ? 'ACTIVE' : 'INACTIVE'}
                </span>
                <span className="text-xs text-ds-text-tertiary hidden sm:block">
                  {enabled ? 'Intercepting' : 'Standby'}
                </span>
              </div>
            </div>

              <Toggle
                checked={enabled}
                onChange={handleToggle}
                size="md"
              />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
