import { chromeApi } from "@/lib/chrome-api";
import { useAppStore } from "@/stores/app-store";
import React from 'react';
import Toggle from "@/components/ui/Toggle";
import BrandMark from "@/components/common/BrandMark";
import { Settings } from "lucide-react";
import SlideOver from "@/components/ui/SlideOver";
import SettingsPanel from "@/components/settings/SettingsPanel";
import ErrorBoundary from "@/components/common/ErrorBoundary";

const Header: React.FC = () => {
  const { enabled, setEnabled, addNotification } = useAppStore();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const handleToggle = async (isEnabled: boolean) => {
    try {
      await chromeApi.toggleEnabled(isEnabled);
      setEnabled(isEnabled);
    } catch (error) {
      addNotification({
        title: 'Could not toggle interception',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        timestamp: Date.now()
      });
    }
  };

  return (
    <>
    <header className="flex items-center justify-between px-4 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-3">
        <BrandMark size={32} className="rounded-[var(--radius-md)]" />
        <div>
          <h1 className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
            Request Interceptor
          </h1>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {enabled ? 'Active' : 'Standby'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="ds-icon-btn sm"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={16} />
        </button>
        <div className={`ds-status ${enabled ? '' : 'paused'}`}>
          <span className="ds-status-dot" />
          <span>{enabled ? 'Active' : 'Inactive'}</span>
        </div>
        <Toggle
          checked={enabled}
          onChange={handleToggle}
          label="Toggle request interception"
          activeColor="emerald"
        />
      </div>
    </header>
    <SlideOver isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings" subtitle="Saved on this device">
      <ErrorBoundary scope="Settings" variant="inline">
        <SettingsPanel />
      </ErrorBoundary>
    </SlideOver>
    </>
  );
};

export default Header;
