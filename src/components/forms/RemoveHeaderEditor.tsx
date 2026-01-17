import React, { useState } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
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
      <label className="ds-label">{title}</label>
      {description && (
        <p className="text-[11px] text-[var(--text-tertiary)] -mt-1">{description}</p>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] hover:border-[var(--border-default)] transition-colors">
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[12px] text-[var(--text-secondary)]">
              {hasHeaders ? `${removeHeaders.length} headers to remove` : 'No headers to remove'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              leftIcon={<Plus size={12} />}
            >
              Add
            </Button>
            <ChevronDown
              size={14}
              className={`text-[var(--text-tertiary)] transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="border-t border-[var(--border-subtle)]">
            {hasHeaders ? (
              <div className="p-3 space-y-2">
                {removeHeaders.map((header) => (
                  <div
                    key={header}
                    className="flex items-center justify-between bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.3)] rounded-[var(--radius-sm)] p-3"
                  >
                    <div className="font-mono text-[12px] text-[var(--accent-rose)]">
                      {header}
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveHeader(header)}
                      leftIcon={<X size={12} />}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Add new header section */}
            <div className="p-3 border-t border-[var(--border-subtle)] space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Header-Name"
                  value={newHeader}
                  variant="outlined"
                  onChange={(e) => setNewHeader(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddHeader}
                  disabled={!newHeader.trim() || removeHeaders.includes(newHeader.trim())}
                  leftIcon={<Plus size={12} />}
                >
                  Add
                </Button>
              </div>

              {commonHeaders.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowCommonHeaders(!showCommonHeaders)}
                    leftIcon={<ChevronDown size={12} className={`transition-transform ${
                      showCommonHeaders ? 'rotate-180' : ''
                    }`} />}
                  >
                    Common
                  </Button>
                </div>
              )}

              {/* Common headers */}
              {showCommonHeaders && (
                <div className="border-t border-[var(--border-subtle)] pt-3 space-y-1 max-h-40 overflow-y-auto">
                  {commonHeaders.map((header) => (
                    <button
                      key={header.key}
                      onClick={() => handleAddCommonHeader(header.key)}
                      className="w-full text-left p-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors text-[11px] disabled:opacity-50"
                      disabled={removeHeaders.includes(header.key)}
                    >
                      <div className="font-mono font-medium text-[var(--text-primary)]">
                        {header.key}
                      </div>
                      <div className="text-[var(--text-tertiary)] mt-0.5">
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
