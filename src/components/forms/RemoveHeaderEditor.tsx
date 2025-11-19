import React, { useState } from 'react';
import { Plus, X, ChevronDown, Trash2 } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(removeHeaders.length > 0);
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
    setIsExpanded(true);
  };

  const handleRemoveHeader = (header: string) => {
    onRemoveHeadersChange(removeHeaders.filter(h => h !== header));
  };

  const handleAddCommonHeader = (header: string) => {
    if (!removeHeaders.includes(header)) {
      onRemoveHeadersChange([...removeHeaders, header]);
    }
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
              {hasHeaders ? `${removeHeaders.length} headers to remove` : 'No headers to remove'}
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
                {removeHeaders.map((header) => (
                  <div
                    key={header}
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
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            
            {/* Add new header section */}
            <div className="p-3 border-t border-gray-100 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Header-Name"
                  value={newHeader}
                  onChange={(e) => setNewHeader(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddHeader}
                  disabled={!newHeader.trim() || removeHeaders.includes(newHeader.trim())}
                  leftIcon={<Plus className="w-3 h-3" />}
                  className="text-xs"
                >
                  Add
                </Button>
              </div>
              
              {commonHeaders.length > 0 && (
                <div className="flex items-center gap-2">
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
                </div>
              )}

              {/* Common headers */}
              {showCommonHeaders && (
                <div className="border-t border-gray-100 pt-3 space-y-1 max-h-40 overflow-y-auto">
                  {commonHeaders.map((header) => (
                    <button
                      key={header.key}
                      onClick={() => handleAddCommonHeader(header.key)}
                      className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors text-xs"
                      disabled={removeHeaders.includes(header.key)}
                    >
                      <div className="font-mono font-medium text-gray-900">
                        {header.key}
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

export default RemoveHeadersEditor;