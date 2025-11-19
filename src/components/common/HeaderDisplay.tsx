import { HeaderConfig } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

interface HeaderDisplayProps {
  headers: HeaderConfig;
  title: string;
  icon: React.ReactNode;
  emptyMessage?: string;
}

const HeaderDisplay: React.FC<HeaderDisplayProps> = ({ 
  headers, 
  title, 
  icon, 
  emptyMessage = "No headers configured" 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const headerEntries = Object.entries(headers || {});
  const hasHeaders = headerEntries.length > 0;

  if (!hasHeaders && !isExpanded) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-700">{title}</span>
          {hasHeaders && (
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
              {headerEntries.length}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 overflow-hidden"
          >
            {hasHeaders ? (
              <div className="p-3 space-y-2">
                {headerEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between p-2 bg-white rounded border border-gray-200"
                  >
                    <div className="font-mono text-sm min-w-0 flex-1">
                      <div className="font-medium text-gray-900 break-all">{key}</div>
                      <div className="text-gray-600 break-all">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-sm text-gray-500 text-center">
                {emptyMessage}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeaderDisplay;