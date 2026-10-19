import React, { useEffect, useState } from 'react';
import { Bell, Globe, Activity, Wrench, Download, Upload, RotateCcw, X } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import NumberStepper from '@/components/ui/NumberStepper';
import Textarea from '@/components/ui/TextArea';
import { useSettings } from '@/hooks/useSettings';
import { downloadFile } from '@/lib/chrome-api';
import { LIMITS, TOAST_EVENTS, type Settings, type ToastEvent } from '@/core/settings';

const EVENT_LABELS: Record<ToastEvent, string> = {
  mock: 'Mocked responses',
  block: 'Blocked requests',
  redirect: 'Redirects',
  headers: 'Header changes',
  websocket: 'WebSocket rules',
};

const Section: React.FC<{ icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }> = ({
  icon,
  title,
  description,
  children,
}) => (
  <section className="space-y-3 pb-5 border-b border-[var(--border-subtle)] last:border-0">
    <header className="flex items-start gap-2">
      <span className="mt-0.5 text-[var(--accent-blue)]">{icon}</span>
      <div>
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</h3>
        {description && <p className="text-[12px] text-[var(--text-tertiary)]">{description}</p>}
      </div>
    </header>
    <div className="space-y-3 pl-6">{children}</div>
  </section>
);

const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <div className="text-[12px] text-[var(--text-primary)]">{label}</div>
      {hint && <div className="text-[11px] text-[var(--text-tertiary)]">{hint}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

/** One pattern per line; saved on blur. */
const PatternList: React.FC<{ label: string; value: string[]; placeholder: string; onCommit: (v: string[]) => void }> = ({
  label,
  value,
  placeholder,
  onCommit,
}) => {
  const [draft, setDraft] = useState(value.join('\n'));
  useEffect(() => setDraft(value.join('\n')), [value]);
  return (
    <Textarea
      label={label}
      aria-label={label}
      size="sm"
      rows={3}
      fullWidth
      className="font-mono"
      placeholder={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft.split('\n').map((l) => l.trim()).filter(Boolean))}
    />
  );
};

const SettingsPanel: React.FC = () => {
  const { settings, error, clearError, update, reset, importFrom } = useSettings();
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);

  if (!settings) {
    return error ? <p role="alert" className="text-[12px] text-[var(--accent-rose)]">{error}</p> : <p className="text-[12px] text-[var(--text-tertiary)]">Loading settings…</p>;
  }
  const n = settings.notifications;

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await importFrom(JSON.parse(await file.text()));
    } catch {
      await importFrom(null).catch(() => {});
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div role="alert" className="px-3 py-2 text-[12px] rounded-[var(--radius-md)] bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.3)] text-[var(--accent-rose)] flex justify-between gap-2">
          <span>{error}</span>
          <button onClick={clearError} aria-label="Dismiss error"><X size={12} /></button>
        </div>
      )}

      <Section icon={<Bell size={14} />} title="Notifications" description="On-page toasts when a rule fires.">
        <Row label="Show on-page notifications">
          <Toggle size="sm" checked={n.pageToasts} onChange={(v) => update({ notifications: { pageToasts: v } })} label="Show on-page notifications" />
        </Row>
        {TOAST_EVENTS.map((event) => (
          <Row key={event} label={EVENT_LABELS[event]}>
            <Toggle
              size="sm"
              disabled={!n.pageToasts}
              checked={n.events[event]}
              onChange={(v) => update({ notifications: { events: { [event]: v } } })}
              label={`Notify: ${EVENT_LABELS[event]}`}
            />
          </Row>
        ))}
        <Row label="Position">
          <Select
            size="sm"
            value={n.position}
            disabled={!n.pageToasts}
            onChange={(v) => update({ notifications: { position: v as Settings['notifications']['position'] } })}
            options={[
              { value: 'top-right', label: 'Top right' },
              { value: 'top-left', label: 'Top left' },
              { value: 'bottom-right', label: 'Bottom right' },
              { value: 'bottom-left', label: 'Bottom left' },
            ]}
          />
        </Row>
        <Row label="Duration" hint="How long each notification stays visible">
          <NumberStepper label="Notification duration" disabled={!n.pageToasts} value={n.durationMs / 1000} unit="s" min={LIMITS.durationMs[0] / 1000} max={LIMITS.durationMs[1] / 1000} onChange={(s) => update({ notifications: { durationMs: s * 1000 } })} />
        </Row>
        <Row label="Maximum visible">
          <NumberStepper label="Maximum visible notifications" disabled={!n.pageToasts} value={n.maxVisible} min={LIMITS.maxVisible[0]} max={LIMITS.maxVisible[1]} onChange={(v) => update({ notifications: { maxVisible: v } })} />
        </Row>
      </Section>

      <Section
        icon={<Globe size={14} />}
        title="Sites"
        description="Where interception, injection and the event monitor run. Patterns: a host (example.com, includes subdomains), a URL with * wildcards, or /regex/."
      >
        <Row label="Run on">
          <Select
            size="sm"
            value={settings.sites.mode}
            onChange={(v) => update({ sites: { mode: v as 'all' | 'allowlist' } })}
            options={[
              { value: 'all', label: 'All sites' },
              { value: 'allowlist', label: 'Only listed sites' },
            ]}
          />
        </Row>
        {settings.sites.mode === 'allowlist' && (
          <PatternList label="Allowed sites" value={settings.sites.allowlist} placeholder={'localhost\nstaging.example.com'} onCommit={(v) => update({ sites: { allowlist: v } })} />
        )}
        <PatternList label="Never run on" value={settings.sites.denylist} placeholder={'bank.example.com\nhttps://mail.google.com/*'} onCommit={(v) => update({ sites: { denylist: v } })} />
      </Section>

      <Section icon={<Activity size={14} />} title="Network capture" description="Limits that keep memory use bounded while recording.">
        <Row label="Requests kept per tab">
          <NumberStepper label="Requests kept per tab" value={settings.network.maxRequests} step={100} min={LIMITS.maxRequests[0]} max={LIMITS.maxRequests[1]} onChange={(v) => update({ network: { maxRequests: v } })} />
        </Row>
        <Row label="Response body cache">
          <NumberStepper label="Response body cache size" value={settings.network.bodyCacheMB} unit="MB" step={4} min={LIMITS.bodyCacheMB[0]} max={LIMITS.bodyCacheMB[1]} onChange={(v) => update({ network: { bodyCacheMB: v } })} />
        </Row>
        <Row label="WebSocket frames per socket">
          <NumberStepper label="WebSocket frames per socket" value={settings.network.webSocketFrames} step={50} min={LIMITS.webSocketFrames[0]} max={LIMITS.webSocketFrames[1]} onChange={(v) => update({ network: { webSocketFrames: v } })} />
        </Row>
      </Section>

      <Section icon={<Wrench size={14} />} title="Diagnostics">
        <Row label="Log to the page console" hint="Interception details in each page's DevTools console">
          <Toggle size="sm" checked={settings.diagnostics.pageConsoleLogs} onChange={(v) => update({ diagnostics: { pageConsoleLogs: v } })} label="Log to the page console" />
        </Row>
      </Section>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => downloadFile(JSON.stringify(settings, null, 2), 'request-interceptor-settings.json')}>
          <Download size={12} /> Export
        </Button>
        <Button size="sm" variant="secondary" onClick={() => fileInput?.click()}>
          <Upload size={12} /> Import
        </Button>
        <input ref={setFileInput} type="file" accept=".json,application/json" className="hidden" onChange={onImport} />
        <Button size="sm" variant="danger" onClick={() => reset()}>
          <RotateCcw size={12} /> Reset to defaults
        </Button>
      </div>
    </div>
  );
};

export default SettingsPanel;
