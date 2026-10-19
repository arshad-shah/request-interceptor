import React from 'react';
import { ExternalLink } from 'lucide-react';
import BrandMark from '@/components/common/BrandMark';
import { useAppStore } from '@/stores/app-store';
import { chromeApi } from '@/lib/chrome-api';
import { useBackgroundState } from '@/hooks/useBackgroundState';
import SiteSwitch from '@/components/settings/SiteSwitch';
// Import custom UI components
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import Badge from '@/components/ui/Badge';

const Popup: React.FC = () => {
  const { enabled, routes, setEnabled, addNotification } = useAppStore();

  useBackgroundState();

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

  const routeCount = Object.keys(routes).length;
  const enabledRoutes = Object.values(routes).filter(route => route.enabled === true).length;

  const handleOpenSidePanel = async () => {
    try {
      // Get the current window first
      const currentWindow = await chrome.windows.getCurrent();

      // chrome.sidePanel is runtime-guarded; older Chromium falls through to the new-tab fallback below
      if (currentWindow?.id && chrome.sidePanel) {
        // extforge-ignore-compat: chrome.sidePanel.open — only reached when sidePanel API is present
        await chrome.sidePanel.open({ windowId: currentWindow.id });
      } else {
        // Alternative: open the extension page in a new tab
        await chrome.tabs.create({
          url: chrome.runtime.getURL('ui/sidepanel/index.html')
        });
      }
    } catch (error) {
      console.error('Failed to open side panel:', error);

      // Fallback: open extension page in new tab
      try {
        await chrome.tabs.create({
          url: chrome.runtime.getURL('ui/sidepanel/index.html')
        });
      } catch (fallbackError) {
        console.error('Failed to open fallback tab:', fallbackError);
        addNotification({
          title: 'Error',
          message: 'Failed to open side panel. Please open it manually from the browser toolbar.',
          type: 'error',
          timestamp: Date.now()
        });
      }
    }
  };

  return (
    <div className="w-80 bg-[var(--bg-base)] text-[var(--text-primary)] dark-theme">
      <div className="p-4 space-y-4">
        {/* Header Card */}
        <div className="bg-[var(--accent-indigo)] rounded-[var(--radius-lg)] p-4">
          <div className="flex items-center justify-center gap-3">
            <BrandMark size={40} className="rounded-[var(--radius-md)] shadow-sm" />
            <div className="text-center">
              <h1 className="text-lg font-bold text-white">Request Interceptor</h1>
              <p className="text-xs text-white/70">Mock, block and inspect requests</p>
            </div>
          </div>
        </div>

        {/* Status Toggle Card */}
        <Card>
          <Card.Body className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`ds-status ${enabled ? '' : 'paused'}`}>
                  <span className="ds-status-dot" />
                  <span>{enabled ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <Toggle
                checked={enabled}
                onChange={handleToggle}
                size="md"
                label="Toggle request interception"
              />
            </div>
            <SiteSwitch />
          </Card.Body>
        </Card>

        {/* Stats Card */}
        <Card>
          <Card.Body className="py-3">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Configured Routes
                </span>
                <Badge variant="cyan" size="sm">
                  {routeCount}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Active Routes
                </span>
                <Badge variant={enabledRoutes > 0 ? 'emerald' : 'default'} size="sm">
                  {enabledRoutes}
                </Badge>
              </div>

              {routeCount > 0 && (
                <div className="w-full bg-[var(--bg-surface)] rounded-full h-2 mt-2">
                  <div
                    className="bg-[var(--accent-emerald)] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(enabledRoutes / routeCount) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </Card.Body>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            leftIcon={<ExternalLink size={14} />}
            onClick={handleOpenSidePanel}
          >
            Open Side Panel
          </Button>

          {routeCount === 0 && (
            <div className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-[var(--radius-md)] p-3">
              <p className="text-[11px] text-[var(--accent-amber)] text-center font-medium">
                No routes configured yet. Open the side panel to create your first route interception.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Popup;
