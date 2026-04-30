import React, { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { parseRouteKey, chromeApi } from '@/lib/chrome-api';
import { ConfirmDialog } from '../ui/Dialog';
import RouteItem from './RouteItem';
import { parseWebSocketKey, parseInjectionKey } from '@/lib/utils';
import { RoutesEmptyState } from '@/components/common/EmptyState';
import FilterEmptyState from '@/components/common/FilterEmptyState';

// Main RouteList component
const RouteList: React.FC = () => {
  const {
    routes,
    filters,
    openForm,
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
  const filteredRoutes = Object.entries(routes).filter(([routeKey, _config]) => {
    const isWebSocket = routeKey.startsWith('WS:');
    const isInjection = routeKey.startsWith('INJ:');

    // Check route type filter
    if (filters.routeType && filters.routeType !== 'all') {
      if (filters.routeType === 'websocket' && !isWebSocket) return false;
      if (filters.routeType === 'http' && (isWebSocket || isInjection)) return false;
      if (filters.routeType === 'injection' && !isInjection) return false;
    }

    // Injection routes
    if (isInjection) {
      const { urlPattern, name } = parseInjectionKey(routeKey);
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          urlPattern.toLowerCase().includes(searchLower) ||
          name?.toLowerCase().includes(searchLower) ||
          'injection'.includes(searchLower)
        );
      }
      return true;
    }

    // WebSocket routes
    if (isWebSocket) {
      const { url, name } = parseWebSocketKey(routeKey);
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

    // HTTP routes
    const parsed = parseRouteKey(routeKey);
    if (!parsed) return false;
    const { method, url, name } = parsed;

    if (filters.method !== 'all' && method !== filters.method) {
      return false;
    }

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
    return <RoutesEmptyState onAddRoute={openForm} />;
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