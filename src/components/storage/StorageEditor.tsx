import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { StorageType } from '@/types/storage';
import ReactAceEditor from '@/components/common/ReactAceEditor';
import Input from '@/components/ui/Input';

interface StorageEditorProps {
  storageType: StorageType;
  initialKey?: string;
  initialValue?: string;
  isNew: boolean;
  onSave: (key: string, value: string) => void;
  onCancel: () => void;
}

function detectLanguage(value: string): 'json' | 'html' | 'javascript' | 'css' | 'text' {
  const trimmed = value.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try { JSON.parse(trimmed); return 'json'; } catch { /* not json */ }
  }
  if (trimmed.startsWith('<') && trimmed.includes('>')) return 'html';
  if (trimmed.includes('function') || trimmed.includes('=>') || trimmed.includes('var ') || trimmed.includes('const ') || trimmed.includes('let ')) return 'javascript';
  return 'text';
}

const StorageEditor: React.FC<StorageEditorProps> = ({
  storageType,
  initialKey = '',
  initialValue = '',
  isNew,
  onSave,
  onCancel,
}) => {
  const [key, setKey] = useState(initialKey);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    // Try to format JSON on initial load
    try {
      const parsed = JSON.parse(initialValue);
      setValue(JSON.stringify(parsed, null, 2));
    } catch {
      setValue(initialValue);
    }
  }, [initialValue]);

  const language = useMemo(() => detectLanguage(value), [value]);

  const handleSave = () => {
    if (!key.trim()) return;
    onSave(key.trim(), value);
  };

  return (
    <div className="ds-modal-backdrop" onClick={onCancel}>
      <div className="ds-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="ds-modal-header">
          <span className="ds-modal-title">
            {isNew ? 'Add' : 'Edit'} {storageType === 'cookies' ? 'Cookie' : 'Item'}
          </span>
          <button className="ds-icon-btn" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="ds-modal-body space-y-3">
          <Input
            label="Key"
            size="sm"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={!isNew}
            placeholder="Enter key..."
            autoFocus={isNew}
          />
          <div>
            <label className="ds-label mb-1 block">Value</label>
            <ReactAceEditor
              value={value}
              onChange={setValue}
              language={language}
              height={220}
              fontSize={12}
              placeholder="Enter value..."
            />
          </div>
        </div>
        <div className="ds-modal-footer">
          <button className="ds-btn" onClick={onCancel}>Cancel</button>
          <button className="ds-btn primary" onClick={handleSave} disabled={!key.trim()}>
            {isNew ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorageEditor;
