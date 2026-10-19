import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi } from '@/lib/chrome-api';
import { onEvent } from '@/lib/messaging';

/** Load interception state from the background and keep the app store in sync with it. */
export function useBackgroundState(): void {
  const { setEnabled, setRoutes, setEventMonitorEnabled, addNotification } = useAppStore();

  useEffect(() => {
    let active = true;
    chromeApi
      .getState()
      .then((state) => {
        if (!active) return;
        setEnabled(state.enabled);
        setRoutes(state.routes);
        setEventMonitorEnabled(state.eventMonitorEnabled);
      })
      .catch((error: Error) => {
        if (!active) return;
        addNotification({
          title: 'Could not load state',
          message: error.message,
          type: 'error',
          timestamp: Date.now(),
        });
      });

    const offState = onEvent('STATE_CHANGED', ({ enabled, routes }) => {
      setEnabled(enabled);
      setRoutes(routes);
    });
    const offMonitor = onEvent('EVENT_MONITOR_CHANGED', ({ enabled }) => setEventMonitorEnabled(enabled));
    return () => {
      active = false;
      offState();
      offMonitor();
    };
  }, [setEnabled, setRoutes, setEventMonitorEnabled, addNotification]);
}
