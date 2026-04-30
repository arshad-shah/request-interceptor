import { chromeApi } from "@/lib/chrome-api";
import { useAppStore } from "@/stores/app-store";
import React from 'react';
import { Zap } from "lucide-react";
import Toggle from "@/components/ui/Toggle";

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
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--accent-indigo)] flex items-center justify-center">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
            Web Tools
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
