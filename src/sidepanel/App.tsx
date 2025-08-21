import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Router, 
  Plus, 
  FileCode, 
  Search, 
  Filter,
  Download,
  Trash2
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, addMessageListener } from '@/lib/chrome-api';
import { TabId } from '@/types';
import { cn } from '@/lib/utils';
import RouteList from '@/components/RouteList';
import AddRouteForm from '@/components/AddRouteForm';
import TemplatesTab from '@/components/TemplatesTab';
import NotificationContainer from '@/components/Notification';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

const RouteControls: React.FC = () => {
  const { 
    routes, 
    filters, 
    setFilters, 
    setActiveTab, 
    addNotification,
    clearRoutes 
  } = useAppStore();
  
  const [showClearDialog, setShowClearDialog] = React.useState(false);

  const handleExport = async () => {
    try {
      const response = await chromeApi.exportRoutes();
      if (response.success) {
        const jsonString = JSON.stringify(response.data, null, 2);
        
        // Download file
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const date = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `request-interceptor-routes-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Copy to clipboard
        await navigator.clipboard.writeText(jsonString);
        
        addNotification('Success', 'Routes exported and copied to clipboard');
      }
    } catch (error) {
      addNotification('Error', 'Failed to export routes', 'error');
    }
  };

  const handleClearAll = async () => {
    try {
      await chromeApi.clearRoutes();
      clearRoutes();
      addNotification('Success', 'All routes cleared successfully');
    } catch (error) {
      addNotification('Error', 'Failed to clear routes', 'error');
    }
    setShowClearDialog(false);
  };

  const routeCount = Object.keys(routes).length;

  return (
    <>
      <div className="flex flex-col gap-4 p-6 bg-gray-50 border-b border-gray-200">
        {/* Search and Filter Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search routes..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          
          <div className="sm:w-48">
            <Select
              value={filters.method}
              onChange={(e) => setFilters({ method: e.target.value as any })}
              leftIcon={<Filter className="w-4 h-4" />}
            >
              <option value="all">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </Select>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Router className="w-4 h-4" />
            <span>{routeCount} route{routeCount !== 1 ? 's' : ''} configured</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('add')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Route
            </Button>
            
            {routeCount > 0 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExport}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Export
                </Button>
                
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowClearDialog(true)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Clear All
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearAll}
        title="Clear All Routes"
        message="Are you sure you want to clear all interception routes? This action cannot be undone."
        confirmText="Clear All"
        variant="danger"
      />
    </>
  );
};

const TabContent: React.FC = () => {
  const { activeTab } = useAppStore();

  return (
    <div className="flex-1 overflow-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="p-6"
        >
          {activeTab === 'routes' && (
            <>
              <RouteControls />
              <div className="mt-6">
                <RouteList />
              </div>
            </>
          )}
          
          {activeTab === 'add' && <AddRouteForm />}
          
          {activeTab === 'templates' && <TemplatesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

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
          setRoutes(message.routes);
        }
      } else if (message.action === 'routesChanged') {
        // Always update routes when they change
        setRoutes(message.routes || {});
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