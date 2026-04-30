import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { StorageType } from '@/types/storage';

interface StorageEditorProps {
  storageType: StorageType;
  initialKey?: string;
  initialValue?: string;
  isNew: boolean;
  onSave: (key: string, value: string) => void;
  onCancel: () => void;
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
    // Try to format JSON
    try {
      const parsed = JSON.parse(initialValue);
      setValue(JSON.stringify(parsed, null, 2));
    } catch {
      setValue(initialValue);
    }
  }, [initialValue]);

  const handleSave = () => {
    if (!key.trim()) return;
    onSave(key.trim(), value);
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      setValue(JSON.stringify(parsed, null, 2));
    } catch {
      // not valid JSON, leave as is
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(value);
      setValue(JSON.stringify(parsed));
    } catch {
      // not valid JSON
    }
  };

  return (
    <div className="ds-modal-backdrop" onClick={onCancel}>
      <div className="ds-modal" onClick={e => e.stopPropagation()}>
        <div className="ds-modal-header">
          <span className="ds-modal-title">
            {isNew ? 'Add' : 'Edit'} {storageType === 'cookies' ? 'Cookie' : 'Item'}
          </span>
          <button className="ds-icon-btn" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="ds-modal-body space-y-3">
          <div>
            <label className="ds-label mb-1 block">Key</label>
            <input
              type="text"
              className="ds-input"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={!isNew}
              placeholder="Enter key..."
              autoFocus={isNew}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="ds-label">Value</label>
              <div className="flex gap-1">
                <button className="text-[10px] text-[var(--accent-indigo)] hover:underline" onClick={handleFormat}>
                  Format
                </button>
                <button className="text-[10px] text-[var(--accent-indigo)] hover:underline" onClick={handleMinify}>
                  Minify
                </button>
              </div>
            </div>
            <textarea
              className="ds-input font-mono text-[11px] h-[200px] resize-y"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter value..."
              autoFocus={!isNew}
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
