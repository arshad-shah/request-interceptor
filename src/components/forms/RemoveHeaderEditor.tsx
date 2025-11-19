import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronRight, Trash2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface RemoveHeadersEditorProps {
  removeHeaders: string[];
  onRemoveHeadersChange: (headers: string[]) => void;
  title: string;
  description?: string;
  commonHeaders?: Array<{ key: string; description: string; }>;
  className?: string;
}

const RemoveHeadersEditor: React.FC<RemoveHeadersEditorProps> = ({
  removeHeaders,
  onRemoveHeadersChange,
  title,
  description,
  commonHeaders = [],
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newHeader, setNewHeader] = useState('');
  const [showCommonHeaders, setShowCommonHeaders] = useState(false);

  const hasHeaders = removeHeaders.length > 0;

  const handleAddHeader = () => {
    if (!newHeader.trim()) return;
    
    const headerName = newHeader.trim();
    if (!removeHeaders.includes(headerName)) {
      onRemoveHeadersChange([...removeHeaders, headerName]);
    }
    setNewHeader('');
  };

  const handleRemoveHeader = (header: string) => {
    onRemoveHeadersChange(removeHeaders.filter(h => h !== header));
  };

  const handleAddCommonHeader = (header: string) => {
    if (!removeHeaders.includes(header)) {
      onRemoveHeadersChange([...removeHeaders, header]);
    }
    setShowCommonHeaders(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddHeader();
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with expand toggle */}
      <div 
        className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-500" />
          <div>
            <div className="text-sm font-medium text-gray-700">{title}</div>
            {description && (
              <div className="text-xs text-gray-500">{description}</div>
            )}
          </div>
          {hasHeaders && (
            <div className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              {removeHeaders.length}
            </div>
          )}
        </div>
        
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </motion.div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 overflow-hidden"
          >
            {/* Existing headers to remove */}
            {hasHeaders && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 mb-2">Headers to Remove:</div>
                <AnimatePresence mode="popLayout">
                  {removeHeaders.map((header) => (
                    <motion.div
                      key={header}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3"
                    >
                      <div className="font-mono text-sm text-red-900">
                        {header}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveHeader(header)}
                        leftIcon={<X className="w-3 h-3" />}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Add new header to remove */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Plus className="w-4 h-4" />
                Add Header to Remove
              </div>
              
              <div className="flex gap-3">
                <Input
                  placeholder="Header-Name"
                  value={newHeader}
                  onChange={(e) => setNewHeader(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddHeader}
                  disabled={!newHeader.trim() || removeHeaders.includes(newHeader.trim())}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add
                </Button>
              </div>
              
              {commonHeaders.length > 0 && (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCommonHeaders(!showCommonHeaders)}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    className="text-red-600 hover:text-red-700"
                  >
                    Common Headers to Remove
                  </Button>

                  <AnimatePresence>
                    {showCommonHeaders && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-200 pt-3 space-y-2 overflow-hidden"
                      >
                        {commonHeaders.map((header) => (
                          <button
                            key={header.key}
                            onClick={() => handleAddCommonHeader(header.key)}
                            className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={removeHeaders.includes(header.key)}
                          >
                            <div className="font-mono text-sm font-medium text-gray-900">
                              {header.key}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {header.description}
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RemoveHeadersEditor;