import React, { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { parseRouteKey, chromeApi } from '@/lib/chrome-api';
import { ConfirmDialog } from '../ui/Dialog';
import RouteItem from './RouteItem';
import { parseWebSocketKey } from '@/lib/utils';
import EmptyState from '@/components/common/EmptyState';
import FilterEmptyState from '@/components/common/FilterEmptyState';

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