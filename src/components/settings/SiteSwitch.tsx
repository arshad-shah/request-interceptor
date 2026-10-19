import React, { useEffect, useState } from 'react';
import Toggle from '@/components/ui/Toggle';
import { useSettings } from '@/hooks/useSettings';
import { isSiteEnabled } from '@/core/settings';

/** "Run on this site" switch for the active tab; adds/removes its host on the deny list. */
const SiteSwitch: React.FC = () => {
  const { settings, update, error } = useSettings();
  const [url, setUrl] = useState<URL | null>(null);

  useEffect(() => {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        try {
          const parsed = tab?.url ? new URL(tab.url) : null;
          setUrl(parsed && /^https?:$/.test(parsed.protocol) ? parsed : null);
        } catch {
          setUrl(null);
        }
      })
      .catch(() => setUrl(null));
  }, []);

  if (!settings || !url) return null;
  const enabled = isSiteEnabled(url.href, settings);
  const host = url.hostname;
  const allowlistMode = settings.sites.mode === 'allowlist';

  const onChange = (on: boolean) => {
    const { denylist, allowlist } = settings.sites;
    if (on) {
      update({
        sites: {
          denylist: denylist.filter((p) => p !== host),
          ...(allowlistMode && !allowlist.includes(host) ? { allowlist: [...allowlist, host] } : {}),
        },
      });
    } else {
      update({ sites: { denylist: [...denylist, host] } });
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-[var(--text-secondary)]">Run on this site</div>
        <div className="text-[11px] text-[var(--text-tertiary)] truncate" title={host}>{host}</div>
        {error && <div role="alert" className="text-[11px] text-[var(--accent-rose)]">{error}</div>}
      </div>
      <Toggle size="sm" checked={enabled} onChange={onChange} label={`Run on ${host}`} />
    </div>
  );
};

export default SiteSwitch;
