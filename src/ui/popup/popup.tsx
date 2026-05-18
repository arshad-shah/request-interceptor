import React, { useEffect } from 'react';
import { Zap, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, addMessageListener } from '@/lib/chrome-api';
// Import custom UI components
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import Badge from '@/components/ui/Badge';

const Popup: React.FC = () => {
  const { enabled, routes, setEnabled, setRoutes, addNotification } = useAppStore();

  useEffect(() => {
    // Load initial state
    chromeApi.getState().then(state => {
      setEnabled(state.enabled);
      setRoutes(state.routes);
    }).catch(console.error);

    // Listen for state changes from background
    const messageListener = (message: any) => {
      if (message.action === 'stateChanged') {
        setEnabled(message.enabled);
        if (message.routes) {
          setRoutes(message.routes);
        }
      } else if (message.action === 'routesChanged') {
        setRoutes(message.routes || {});
        if (Object.hasOwn(message, 'enabled')) {
          setEnabled(message.enabled);
        }
      }
    };

    const cleanup = addMessageListener(messageListener);

    // Cleanup on unmount
    return cleanup;
  }, [setEnabled, setRoutes]);

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

  const routeCount = Object.keys(routes).length;
  const enabledRoutes = Object.values(routes).filter(route => route.enabled === true).length;

  const handleOpenSidePanel = async () => {
    try {
      // Get the current window first
      const currentWindow = await chrome.windows.getCurrent();

      if (currentWindow?.id && chrome.sidePanel) {
        await chrome.sidePanel.open({ windowId: currentWindow.id });
      } else {
        // Alternative: open the extension page in a new tab
        await chrome.tabs.create({
          url: chrome.runtime.getURL('sidepanel.html')
        });
      }
    } catch (error) {
      console.error('Failed to open side panel:', error);

      // Fallback: open extension page in new tab
      try {
        await chrome.tabs.create({
          url: chrome.runtime.getURL('sidepanel.html')
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
            <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-[var(--radius-md)]">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-white">Request Interceptor</h1>
              <p className="text-xs text-white/70">Chrome Extension</p>
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
              />
            </div>
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
