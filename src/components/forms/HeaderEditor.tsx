import React, { useState } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, Check, X } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(Object.keys(headers || {}).length > 0);
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
    setIsExpanded(true);
  };

  const handleUpdateHeader = (oldKey: string, newKey: string, newValue: string) => {
    if (!newKey.trim() || !newValue.trim()) return;
    
    const updatedHeaders = { ...headers };
    
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
    setIsExpanded(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddHeader();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {title}
      </label>
      {description && (
        <p className="text-sm text-gray-600 -mt-1">{description}</p>
      )}
      
      <div className="border-2 rounded-xl bg-white border-gray-200 hover:border-gray-300 transition-all duration-200">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-sm text-gray-600">
              {hasHeaders ? `${headerEntries.length} headers` : 'No headers'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              leftIcon={<Plus className="w-3 h-3" />}
              className="text-xs"
            >
              Add
            </Button>
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="border-t border-gray-100">
            {hasHeaders ? (
              <div className="p-3 space-y-2">
                {headerEntries.map(([key, value]) => (
                  <HeaderRow
                    key={key}
                    headerKey={key}
                    headerValue={value}
                    onUpdate={handleUpdateHeader}
                    onRemove={handleRemoveHeader}
                  />
                ))}
              </div>
            ) : null}
            
            {/* Add new header section */}
            <div className="p-3 border-t border-gray-100 space-y-3">
              <div className="grid grid-cols-2 gap-2">
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
                  variant="primary"
                  size="sm"
                  onClick={handleAddHeader}
                  disabled={!newKey.trim() || !newValue.trim()}
                  leftIcon={<Plus className="w-3 h-3" />}
                  className="text-xs"
                >
                  Add
                </Button>
                
                {commonHeaders.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCommonHeaders(!showCommonHeaders)}
                    leftIcon={<ChevronDown className={`w-3 h-3 transition-transform ${
                      showCommonHeaders ? 'rotate-180' : ''
                    }`} />}
                    className="text-xs"
                  >
                    Common
                  </Button>
                )}
              </div>

              {/* Common headers */}
              {showCommonHeaders && (
                <div className="border-t border-gray-100 pt-3 space-y-1 max-h-40 overflow-y-auto">
                  {commonHeaders.map((header) => (
                    <button
                      key={header.key}
                      onClick={() => handleAddCommonHeader(header.key, header.value)}
                      className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors text-xs"
                      disabled={headers[header.key] !== undefined}
                    >
                      <div className="font-mono font-medium text-gray-900">
                        {header.key}: {header.value}
                      </div>
                      <div className="text-gray-500 mt-0.5">
                        {header.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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

  if (isEditing) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
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
            leftIcon={<Check className="w-3 h-3" />}
            className="text-xs"
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            leftIcon={<X className="w-3 h-3" />}
            className="text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm">
            <span className="font-medium text-gray-900">{headerKey}:</span>
            <span className="text-gray-600 ml-2 break-all">{headerValue}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            leftIcon={<Edit3 className="w-3 h-3" />}
            className="text-xs"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(headerKey)}
            leftIcon={<Trash2 className="w-3 h-3" />}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HeaderEditor;