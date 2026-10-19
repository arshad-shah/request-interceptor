import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CodeEditor } from '@/components/common/code-editor';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Toggle from '@/components/ui/Toggle';
import NumberStepper from '@/components/ui/NumberStepper';

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
  const [httpOnly, setHttpOnly] = useState(initialCookie?.httpOnly || false);
  const [sameSite, setSameSite] = useState(initialCookie?.sameSite || 'lax');
  // Keep an edited cookie's remaining lifetime; 0 = session cookie
  const [expirationDays, setExpirationDays] = useState(() =>
    initialCookie
      ? initialCookie.expirationDate
        ? Math.max(1, Math.ceil((initialCookie.expirationDate - Date.now() / 1000) / 86400))
        : 0
      : 30
  );

  useEffect(() => {
    if (!domain && url) {
      try {
        setDomain(new URL(url).hostname);
      } catch { /* ignore */ }
    }
  }, [url, domain]);

  const handleSave = () => {
    if (!name.trim()) return;
    // Domain cookies are stored as ".example.com"; the URL needs a real host
    const host = domain.replace(/^\./, '');
    const cookie: Record<string, unknown> = {
      url: `${secure ? 'https' : 'http'}://${host}${path.startsWith('/') ? path : `/${path}`}`,
      name: name.trim(),
      value,
      domain,
      path,
      secure,
      httpOnly,
      sameSite,
    };
    if (expirationDays > 0) {
      cookie.expirationDate = Math.floor(Date.now() / 1000) + expirationDays * 86400;
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
            <Select
              label="SameSite"
              size="sm"
              value={sameSite}
              onChange={setSameSite}
              options={[
                { value: 'lax', label: 'Lax' },
                { value: 'strict', label: 'Strict' },
                { value: 'no_restriction', label: 'None' },
              ]}
            />
            <div className="flex flex-col gap-1.5">
              <span className="ds-label font-medium text-[10px]">Expires</span>
              <NumberStepper
                label="Expires in days (0 for a session cookie)"
                value={expirationDays}
                min={0}
                max={3650}
                unit={expirationDays === 0 ? 'session' : 'days'}
                onChange={setExpirationDays}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <Toggle size="sm" checked={secure} onChange={setSecure} label="Secure" />
              Secure
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <Toggle size="sm" checked={httpOnly} onChange={setHttpOnly} label="HttpOnly" />
              HttpOnly
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
