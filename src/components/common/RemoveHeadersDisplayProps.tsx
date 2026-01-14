import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import React, { useState } from 'react';

interface RemoveHeadersDisplayProps {
  removeHeaders: string[];
  title: string;
  icon: React.ReactNode;
}

const RemoveHeadersDisplay: React.FC<RemoveHeadersDisplayProps> = ({ 
  removeHeaders, 
  title, 
  icon 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasHeaders = removeHeaders && removeHeaders.length > 0;

  if (!hasHeaders && !isExpanded) {
    return null;
  }

  return (
    <div className="bg-red-50 rounded-lg overflow-hidden border border-red-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-red-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-red-700">{title}</span>
          {hasHeaders && (
            <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs font-medium">
              {removeHeaders.length}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-red-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-red-200 overflow-hidden"
          >
            {hasHeaders ? (
              <div className="p-3 space-y-2">
                {removeHeaders.map((header) => (
                  <div
                    key={header}
                    className="flex items-center gap-2 p-2 bg-white rounded border border-red-200"
                  >
                    <X className="w-3 h-3 text-red-500 flex-shrink-0" />
                    <span className="font-mono text-sm text-red-900">{header}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-sm text-red-600 text-center">
                No headers configured for removal
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RemoveHeadersDisplay;