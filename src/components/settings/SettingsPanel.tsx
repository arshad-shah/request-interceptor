import React, { useEffect, useState } from 'react';
import { Bell, Globe, Activity, Wrench, Download, Upload, RotateCcw } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
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

/** Number input that commits a clamped value on blur/Enter. */
const NumberField: React.FC<{
  value: number;
  range: readonly [number, number];
  unit?: string;
  label: string;
  onCommit: (value: number) => void;
}> = ({ value, range, unit, label, onCommit }) => {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n !== value) onCommit(Math.min(range[1], Math.max(range[0], Math.round(n))));
    else setDraft(String(value));
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="number"
        aria-label={label}
        className="ds-input w-24 text-right text-[12px] py-1"
        min={range[0]}
        max={range[1]}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
      {unit && <span className="text-[11px] text-[var(--text-tertiary)]">{unit}</span>}
    </span>
  );
};

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
    <label className="block">
      <span className="text-[12px] text-[var(--text-primary)]">{label}</span>
      <textarea
        aria-label={label}
        className="ds-input mt-1 w-full font-mono text-[12px] min-h-[72px]"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft.split('\n').map((l) => l.trim()).filter(Boolean))}
      />
    </label>
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
          <button onClick={clearError} aria-label="Dismiss error">✕</button>
        </div>
      )}

      <Section icon={<Bell size={14} />} title="Notifications" description="On-page toasts when a rule fires.">
        <Row label="Show on-page notifications">
          <Toggle checked={n.pageToasts} onChange={(v) => update({ notifications: { pageToasts: v } })} label="Show on-page notifications" />
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
          <NumberField label="Notification duration" value={n.durationMs / 1000} unit="s" range={[LIMITS.durationMs[0] / 1000, LIMITS.durationMs[1] / 1000]} onCommit={(s) => update({ notifications: { durationMs: s * 1000 } })} />
        </Row>
        <Row label="Maximum visible">
          <NumberField label="Maximum visible notifications" value={n.maxVisible} range={LIMITS.maxVisible} onCommit={(v) => update({ notifications: { maxVisible: v } })} />
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
          <NumberField label="Requests kept per tab" value={settings.network.maxRequests} range={LIMITS.maxRequests} onCommit={(v) => update({ network: { maxRequests: v } })} />
        </Row>
        <Row label="Response body cache">
          <NumberField label="Response body cache size" value={settings.network.bodyCacheMB} unit="MB" range={LIMITS.bodyCacheMB} onCommit={(v) => update({ network: { bodyCacheMB: v } })} />
        </Row>
        <Row label="WebSocket frames per socket">
          <NumberField label="WebSocket frames per socket" value={settings.network.webSocketFrames} range={LIMITS.webSocketFrames} onCommit={(v) => update({ network: { webSocketFrames: v } })} />
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
