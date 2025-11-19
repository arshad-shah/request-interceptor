import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HeaderConfig } from '@/types';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface HeaderEditorProps {
  headers: HeaderConfig;
  onHeadersChange: (headers: HeaderConfig) => void;
  title: string;
  description?: string;
  placeholder?: {
    key: string;
    value: string;
  };
  commonHeaders?: Array<{ key: string; value: string; description: string; }>;
  className?: string;
}

const HeaderEditor: React.FC<HeaderEditorProps> = ({
  headers,
  onHeadersChange,
  title,
  description,
  placeholder = { key: 'Header-Name', value: 'Header Value' },
  commonHeaders = [],
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showCommonHeaders, setShowCommonHeaders] = useState(false);

  const headerEntries = Object.entries(headers || {});
  const hasHeaders = headerEntries.length > 0;

  const handleAddHeader = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    
    const updatedHeaders = {
      ...headers,
      [newKey.trim()]: newValue.trim()
    };
    
    onHeadersChange(updatedHeaders);
    setNewKey('');
    setNewValue('');
  };

  const handleUpdateHeader = (oldKey: string, newKey: string, newValue: string) => {
    if (!newKey.trim() || !newValue.trim()) return;
    
    const updatedHeaders = { ...headers };
    
    // Remove old key if it changed
    if (oldKey !== newKey.trim()) {
      delete updatedHeaders[oldKey];
    }
    
    updatedHeaders[newKey.trim()] = newValue.trim();
    onHeadersChange(updatedHeaders);
  };

  const handleRemoveHeader = (key: string) => {
    const updatedHeaders = { ...headers };
    delete updatedHeaders[key];
    onHeadersChange(updatedHeaders);
  };

  const handleAddCommonHeader = (key: string, value: string) => {
    const updatedHeaders = {
      ...headers,
      [key]: value
    };
    onHeadersChange(updatedHeaders);
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
          <Settings className="w-4 h-4 text-gray-500" />
          <div>
            <div className="text-sm font-medium text-gray-700">{title}</div>
            {description && (
              <div className="text-xs text-gray-500">{description}</div>
            )}
          </div>
          {hasHeaders && (
            <div className="ml-2 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
              {headerEntries.length}
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
            {/* Existing headers */}
            {hasHeaders && (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {headerEntries.map(([key, value]) => (
                    <HeaderRow
                      key={key}
                      headerKey={key}
                      headerValue={value}
                      onUpdate={handleUpdateHeader}
                      onRemove={handleRemoveHeader}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Add new header */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Plus className="w-4 h-4" />
                Add Header
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder={placeholder.key}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Input
                  placeholder={placeholder.value}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddHeader}
                  disabled={!newKey.trim() || !newValue.trim()}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Header
                </Button>
                
                {commonHeaders.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCommonHeaders(!showCommonHeaders)}
                    leftIcon={<ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      showCommonHeaders && "rotate-180"
                    )} />}
                  >
                    Common Headers
                  </Button>
                )}
              </div>

              {/* Common headers dropdown */}
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
                        onClick={() => handleAddCommonHeader(header.key, header.value)}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={headers[header.key] !== undefined}
                      >
                        <div className="font-mono text-sm font-medium text-gray-900">
                          {header.key}: {header.value}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface HeaderRowProps {
  headerKey: string;
  headerValue: string;
  onUpdate: (oldKey: string, newKey: string, newValue: string) => void;
  onRemove: (key: string) => void;
}

const HeaderRow: React.FC<HeaderRowProps> = ({
  headerKey,
  headerValue,
  onUpdate,
  onRemove
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editKey, setEditKey] = useState(headerKey);
  const [editValue, setEditValue] = useState(headerValue);

  const handleSave = () => {
    if (editKey.trim() && editValue.trim()) {
      onUpdate(headerKey, editKey.trim(), editValue.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditKey(headerKey);
    setEditValue(headerValue);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white border border-gray-200 rounded-lg p-3"
    >
      {isEditing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              value={editKey}
              onChange={(e) => setEditKey(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Header name"
              autoFocus
            />
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Header value"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!editKey.trim() || !editValue.trim()}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm">
              <span className="font-medium text-gray-900">{headerKey}:</span>
              <span className="text-gray-600 ml-2">{headerValue}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              leftIcon={<Edit3 className="w-3 h-3" />}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(headerKey)}
              leftIcon={<Trash2 className="w-3 h-3" />}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default HeaderEditor;