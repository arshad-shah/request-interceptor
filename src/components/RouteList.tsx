import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Route,
  Search,
  X,
  Plus
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { parseRouteKey, chromeApi } from '@/lib/chrome-api';

import Button from './ui/Button';
import { ConfirmDialog } from './ui/Dialog';
import RouteItem from '@/components/RouteItem';
import { parseWebSocketKey } from '@/lib/utils';

// Empty state components
const EmptyState: React.FC<{ onAddRoute: () => void }> = ({ onAddRoute }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 mx-auto mb-4 bg-primary-50 rounded-full flex items-center justify-center">
      <Route className="w-8 h-8 text-primary-500" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No routes configured yet</h3>
    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
      Add your first route to start intercepting requests. You can intercept HTTP requests, 
      modify headers, or process WebSocket messages in real-time.
    </p>
    <Button variant="primary" onClick={onAddRoute} leftIcon={<Plus className="w-4 h-4" />}>
      Add Route
    </Button>
  </div>
);

const FilterEmptyState: React.FC<{ onClearFilters: () => void }> = ({ onClearFilters }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center">
      <Search className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No matching routes found</h3>
    <p className="text-gray-500 mb-6">
      Try adjusting your search or filter criteria.
    </p>
    <Button variant="secondary" onClick={onClearFilters} leftIcon={<X className="w-4 h-4" />}>
      Clear Filters
    </Button>
  </div>
);

// Main RouteList component
const RouteList: React.FC = () => {
  const { 
    routes, 
    filters, 
    setActiveTab, 
    setEditingRoute, 
    addNotification,
    removeRoute,
    toggleRoute,
    setFilters 
  } = useAppStore();
  
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; routeKey?: string }>({
    isOpen: false
  });

  // Filter routes based on search and method filter
  const filteredRoutes = Object.entries(routes).filter(([routeKey, config]) => {
    // Check route type filter
    if (filters.routeType && filters.routeType !== 'all') {
      const isWebSocket = routeKey.startsWith('WS:');
      if (filters.routeType === 'websocket' && !isWebSocket) return false;
      if (filters.routeType === 'http' && isWebSocket) return false;
    }
    
    // For WebSocket routes, skip method filter
    if (routeKey.startsWith('WS:')) {
      const { url, name } = parseWebSocketKey(routeKey);
      
      // Search filter for WebSocket
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          url.toLowerCase().includes(searchLower) ||
          name?.toLowerCase().includes(searchLower) ||
          'websocket'.includes(searchLower)
        );
      }
      return true;
    }
    
    // For HTTP routes
    const parsed = parseRouteKey(routeKey);
    if (!parsed) return false; // Safety check
    const { method, url, name } = parsed;
    
    // Method filter
    if (filters.method !== 'all' && method !== filters.method) {
      return false;
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        url.toLowerCase().includes(searchLower) ||
        method.toLowerCase().includes(searchLower) ||
        name?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const handleEditRoute = (routeKey: string) => {
    setEditingRoute(routeKey);
    setActiveTab('add');
  };

  const handleDeleteRoute = (routeKey: string) => {
    setDeleteDialog({ isOpen: true, routeKey });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.routeKey) return;
    
    try {
      await chromeApi.removeRoute(deleteDialog.routeKey);
      removeRoute(deleteDialog.routeKey);
      addNotification({
        title: 'Success',
        message: 'Route removed successfully',
        type: 'success',
        timestamp: Date.now()
      });
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'Failed to remove route',
        type: 'error',
        timestamp: Date.now()
      });
    }
    
    setDeleteDialog({ isOpen: false });
  };

  const handleToggleRoute = async (routeKey: string, enabled: boolean) => {
    try {
      // First update the background script
      await chromeApi.toggleRoute(routeKey, enabled);
      
      // Then update the local state using the store's toggleRoute method
      toggleRoute(routeKey, enabled);
      
      addNotification({
        title: 'Success',
        message: enabled ? 'Route enabled successfully' : 'Route disabled successfully',
        type: 'success',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to toggle route:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to toggle route',
        type: 'error',
        timestamp: Date.now()
      });
    }
  };

  const handleClearFilters = () => {
    setFilters({ search: '', method: 'all', routeType: 'all' });
  };

  if (Object.keys(routes).length === 0) {
    return <EmptyState onAddRoute={() => setActiveTab('add')} />;
  }

  if (filteredRoutes.length === 0 && (filters.search || filters.method !== 'all' || filters.routeType !== 'all')) {
    return <FilterEmptyState onClearFilters={handleClearFilters} />;
  }

  return (
    <>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredRoutes.map(([routeKey, config]) => (
            <RouteItem
              key={routeKey}
              routeKey={routeKey}
              config={config}
              onEdit={handleEditRoute}
              onDelete={handleDeleteRoute}
              onToggle={handleToggleRoute}
            />
          ))}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false })}
        onConfirm={confirmDelete}
        title="Delete Route"
        message={`Are you sure you want to delete this route? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
};

export default RouteList;