import React, { useEffect } from 'react';
import { Zap, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, addMessageListener } from '@/lib/chrome-api';
import { cn } from '@/lib/utils';

// Import design system styles
import '@/styles/design-system.css';

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
        if (message.hasOwnProperty('enabled')) {
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
        //@ts-ignore
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
    <div className="w-80 bg-ds-bg-base text-ds-text-primary">
      <div className="p-4 space-y-4">
        {/* Header Card */}
        <Card className="bg-gradient-to-br from-ds-accent-indigo to-ds-accent-violet border-ds-accent-indigo text-white" hover={false}>
          <Card.Body className="py-4">
            <div className="flex items-center justify-center gap-3">
              <div className="relative w-10 h-10 flex items-center justify-center bg-white/20 rounded-ds-md shadow-ds-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent transform rotate-45 translate-y-[-100%] animate-shine" />
                <Zap className="w-5 h-5 text-white relative z-10" />
              </div>
              <div className="text-center">
                <h1 className="text-lg font-bold">Request Interceptor</h1>
                <p className="text-xs text-white/70">Chrome Extension</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Status Toggle Card */}
        <Card>
          <Card.Body className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={enabled ? 'success' : 'error'} size="sm">
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    enabled ? "bg-ds-accent-emerald animate-pulse" : "bg-ds-accent-rose"
                  )} />
                  {enabled ? 'Active' : 'Inactive'}
                </Badge>
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
                <span className="text-sm font-medium text-ds-text-secondary">
                  Configured Routes
                </span>
                <Badge variant="info" size="sm">
                  {routeCount}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-ds-text-secondary">
                  Active Routes
                </span>
                <Badge variant={enabledRoutes > 0 ? 'success' : 'default'} size="sm">
                  {enabledRoutes}
                </Badge>
              </div>

              {routeCount > 0 && (
                <div className="w-full bg-ds-bg-surface rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-ds-accent-emerald to-ds-accent-cyan h-2 rounded-full transition-all duration-300"
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
            leftIcon={<ExternalLink className="w-4 h-4" />}
            onClick={handleOpenSidePanel}
          >
            Open Side Panel
          </Button>

          {routeCount === 0 && (
            <Card className="bg-ds-accent-amber/10 border-ds-accent-amber/30">
              <Card.Body className="py-3">
                <p className="text-xs text-ds-accent-amber text-center font-medium">
                  No routes configured yet. Open the side panel to create your first route interception.
                </p>
              </Card.Body>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Popup;
