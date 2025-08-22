import React, { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, addMessageListener } from '@/lib/chrome-api';
import NotificationContainer from '@/components/Notification';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import { RouteConfig, WebSocketConfig } from '@/types';
import TabContent from '@/components/TabContent';

const App: React.FC = () => {
  const { setEnabled, setRoutes } = useAppStore();

  useEffect(() => {
    let isComponentMounted = true;

    // Load initial state
    const loadState = async () => {
      try {
        const state = await chromeApi.getState();
        if (isComponentMounted) {
          setEnabled(state.enabled);
          // Updated to handle both RouteConfig and WebSocketConfig
          setRoutes(state.routes || {});
        }
      } catch (error) {
        console.error('Failed to load initial state:', error);
      }
    };

    loadState();

    // Listen for state changes from background
    const messageListener = (message: any) => {
      if (!isComponentMounted) return;

      console.log('App received message:', message);

      if (message.action === 'stateChanged') {
        setEnabled(message.enabled);
        if (message.routes) {
          // Updated to handle both RouteConfig and WebSocketConfig
          setRoutes(message.routes as Record<string, RouteConfig | WebSocketConfig>);
        }
      } else if (message.action === 'routesChanged') {
        // Always update routes when they change
        setRoutes(message.routes as Record<string, RouteConfig | WebSocketConfig> || {});
        if (message.hasOwnProperty('enabled')) {
          setEnabled(message.enabled);
        }
      }
    };

    // Add message listener and get cleanup function
    const removeMessageListener = addMessageListener(messageListener);

    // Cleanup function
    return () => {
      isComponentMounted = false;
      removeMessageListener(); // Properly remove the message listener
    };
  }, [setEnabled, setRoutes]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <Navigation />
      <TabContent />
      <NotificationContainer />
    </div>
  );
};

export default App;