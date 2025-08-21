import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';
import { tabs } from '@/config/tabs';

const Navigation: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-20 shadow-sm">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          
          {/* Tab Navigation */}
          <div className="flex items-center space-x-1 bg-gray-100/50 rounded-lg p-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "relative px-3 sm:px-4 py-2 text-sm font-medium transition-all duration-300",
                  "flex items-center gap-2 rounded-md min-h-[36px]",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2",
                  "active:scale-95 transform",
                  activeTab === id
                    ? "text-white bg-blue-600 shadow-lg shadow-blue-600/25"
                    : "text-gray-600 hover:text-blue-600 hover:bg-white/80 hover:shadow-sm"
                )}
                aria-current={activeTab === id ? 'page' : undefined}
                role="tab"
                aria-selected={activeTab === id}
              >
                <Icon className={cn(
                  "w-4 h-4 transition-colors duration-300",
                  activeTab === id ? "text-white" : "text-gray-500"
                )} />
                
                <span className="hidden sm:block whitespace-nowrap">
                  {label}
                </span>
                
                {/* Animated background */}
                {activeTab === id && (
                  <motion.div
                    className="absolute inset-0 bg-blue-600 rounded-md -z-10"
                    layoutId="activeTabBackground"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 35,
                      mass: 0.8
                    }}
                  />
                )}
                
                {/* Subtle hover indicator */}
                <motion.div
                  className="absolute inset-0 bg-white/80 rounded-md -z-10 opacity-0"
                  whileHover={activeTab !== id ? { opacity: 1 } : {}}
                  transition={{ duration: 0.2 }}
                />
              </button>
            ))}
          </div>
        </div>
        
        {/* Mobile tab labels - shown on small screens */}
        <div className="sm:hidden pb-2">
          <div className="text-center">
            <span className="text-sm font-medium text-gray-700">
              {tabs.find(tab => tab.id === activeTab)?.label}
            </span>
          </div>
        </div>
      </div>
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </nav>
  );
};

export default Navigation;