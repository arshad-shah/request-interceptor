import { chromeApi } from "@/lib/chrome-api";
import { useAppStore } from "@/stores/app-store";
import React from 'react';
import Toggle from "@/components/ui/Toggle";
import BrandMark from "@/components/common/BrandMark";

const Header: React.FC = () => {
  const { enabled, setEnabled, addNotification } = useAppStore();

  const handleToggle = async (isEnabled: boolean) => {
    try {
      const response = await chromeApi.toggleEnabled(isEnabled);
      if (response.success) {
        setEnabled(isEnabled);
      }
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'Failed to toggle interceptor',
        type: 'error',
        timestamp: Date.now()
      });
    }
  };

  return (
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
  );
};

export default Header;
