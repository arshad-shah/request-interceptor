import React, { useEffect } from 'react';
import { Zap, Settings } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, addMessageListener } from '@/lib/chrome-api';
import { cn } from '@/lib/utils';

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ 
  checked, 
  onChange 
}) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <div className={cn(
      "relative w-12 h-6 rounded-full transition-colors duration-300",
      "peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300",
      checked ? "bg-green-500" : "bg-gray-300"
    )}>
      <div className={cn(
        "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300",
        checked ? "left-6" : "left-0.5"
      )} />
    </div>
  </label>
);

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

    addMessageListener(messageListener);
  }, [setEnabled, setRoutes]);

  const handleToggle = async (isEnabled: boolean) => {
    try {
      const response = await chromeApi.toggleEnabled(isEnabled);
      if (response.success) {
        setEnabled(isEnabled);
      }
    } catch (error) {
      addNotification('Error', 'Failed to toggle interceptor', 'error');
    }
  };

  const routeCount = Object.keys(routes).length;
  const enabledRoutes = Object.values(routes).filter(route => route.enabled !== false).length;

  return (
    <div className="w-80 bg-gray-50 text-gray-900">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="relative w-9 h-9 flex items-center justify-center bg-primary-500 rounded-lg shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent transform rotate-45 translate-y-[-100%] animate-shine" />
            <Zap className="w-5 h-5 text-white relative z-10" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Request Interceptor</h1>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center justify-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-2 shadow-sm border border-white/20">
          <span className={cn(
            "text-sm font-medium transition-colors",
            enabled ? "text-green-600" : "text-red-500"
          )}>
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Toggle checked={enabled} onChange={handleToggle} />
        </div>

        {/* Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800 text-center font-medium">
            Open the side panel to view and manage intercepted requests.
          </p>
        </div>

        {/* Stats */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Active Routes
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 bg-gray-100 border-2 border-gray-200 rounded px-2 py-1 shadow-sm">
                {enabledRoutes}
              </span>
              <span className="text-sm text-gray-500">
                / {routeCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Popup;