import { chromeApi } from "@/lib/chrome-api";
import { useAppStore } from "@/stores/app-store";
import React from 'react';
import Toggle from "@/components/ui/Toggle";
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
    {/* Slim control bar: interception status, settings and the master switch */}
    <header className="flex items-center justify-between gap-3 px-3 py-1.5 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
      <div className={`ds-status ${enabled ? '' : 'paused'}`}>
        <span className="ds-status-dot" />
        <span>{enabled ? 'Intercepting' : 'Paused'}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="ds-icon-btn sm"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={15} />
        </button>
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
