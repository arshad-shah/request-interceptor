import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CodeEditor } from '@/components/common/code-editor';
import Input from '@/components/ui/Input';

interface CookieEditorProps {
  initialCookie?: {
    name: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: string;
    expirationDate?: number;
  };
  url: string;
  isNew: boolean;
  onSave: (cookie: Record<string, unknown>) => void;
  onCancel: () => void;
}

const CookieEditor: React.FC<CookieEditorProps> = ({
  initialCookie,
  url,
  isNew,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialCookie?.name || '');
  const [value, setValue] = useState(initialCookie?.value || '');
  const [domain, setDomain] = useState(initialCookie?.domain || '');
  const [path, setPath] = useState(initialCookie?.path || '/');
  const [secure, setSecure] = useState(initialCookie?.secure || false);
  const [sameSite, setSameSite] = useState(initialCookie?.sameSite || 'lax');
  const [expirationDays, setExpirationDays] = useState('30');

  useEffect(() => {
    if (!domain && url) {
      try {
        setDomain(new URL(url).hostname);
      } catch { /* ignore */ }
    }
  }, [url, domain]);

  const handleSave = () => {
    if (!name.trim()) return;
    const cookie: Record<string, unknown> = {
      url: `${secure ? 'https' : 'http'}://${domain}${path}`,
      name: name.trim(),
      value,
      domain,
      path,
      secure,
      sameSite,
    };
    const days = parseInt(expirationDays);
    if (!isNaN(days) && days > 0) {
      cookie.expirationDate = Math.floor(Date.now() / 1000) + days * 86400;
    }
    onSave(cookie);
  };

  return (
    <div className="ds-modal-backdrop" onClick={onCancel}>
      <div className="ds-modal" onClick={e => e.stopPropagation()}>
        <div className="ds-modal-header">
          <span className="ds-modal-title">{isNew ? 'Add' : 'Edit'} Cookie</span>
          <button className="ds-icon-btn" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="ds-modal-body space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Name"
              size="sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isNew}
              autoFocus={isNew}
            />
            <Input
              label="Domain"
              size="sm"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <div>
            <label className="ds-label mb-1 block">Value</label>
            <CodeEditor
              value={value}
              onChange={setValue}
              language="text"
              height={100}
              fontSize={12}
              showGutter={false}
              placeholder="Cookie value..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Path"
              size="sm"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="ds-label font-medium text-[10px]">SameSite</label>
              <select
                className="ds-select sm"
                value={sameSite}
                onChange={(e) => setSameSite(e.target.value)}
              >
                <option value="lax">Lax</option>
                <option value="strict">Strict</option>
                <option value="no_restriction">None</option>
              </select>
            </div>
            <Input
              label="Expires (days)"
              size="sm"
              type="number"
              value={expirationDays}
              onChange={(e) => setExpirationDays(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" checked={secure} onChange={e => setSecure(e.target.checked)} className="accent-[var(--accent-indigo)]" />
              Secure
            </label>
          </div>
        </div>
        <div className="ds-modal-footer">
          <button className="ds-btn" onClick={onCancel}>Cancel</button>
          <button className="ds-btn primary" onClick={handleSave} disabled={!name.trim()}>
            {isNew ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieEditor;
