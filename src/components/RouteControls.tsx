import React from 'react';
import { 
  Route,
  Search, 
  Filter,
  Download,
  Trash2,
  Zap,
  MessageSquare,
  BarChart3,
  ChevronDown,
  X
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi } from '@/lib/chrome-api';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';

const RouteControls: React.FC = () => {
  const { 
    routes, 
    filters, 
    setFilters,
    addNotification,
    clearRoutes 
  } = useAppStore();
  
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const [filtersExpanded, setFiltersExpanded] = React.useState(false);

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
  
  // Count routes by type
  const httpRoutes = Object.keys(routes).filter(key => !key.startsWith('WS:')).length;
  const wsRoutes = Object.keys(routes).filter(key => key.startsWith('WS:')).length;

  // Check if any filters are active
  const hasActiveFilters = filters.search || 
    (filters.routeType && filters.routeType !== 'all') || 
    (filters.method && filters.method !== 'all');

  const clearAllFilters = () => {
    setFilters({ 
      search: '', 
      routeType: 'all', 
      method: 'all' 
    });
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 shadow-sm">
        {/* Header Section with Stats */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Route Statistics */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  <BarChart3 className="w-4 h-4" />
                  <span>{routeCount} Total</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                {httpRoutes > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-md">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="font-medium">{httpRoutes}</span>
                    HTTP
                  </div>
                )}
                
                {wsRoutes > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="font-medium">{wsRoutes}</span>
                    WS
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {routeCount > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExport}
                  leftIcon={<Download className="w-4 h-4" />}
                  className="text-xs sm:text-sm"
                >
                  Export
                </Button>
                
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowClearDialog(true)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  className="text-xs sm:text-sm"
                >
                 Clear All
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search Section - Always Visible */}
        <div className="px-4 py-3">
          <div className="relative">
            <Input
              placeholder="Search routes by URL, method, or description..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              leftIcon={<Search className="w-4 h-4" />}
              className="pr-24"
            />
            
            {/* Filter Toggle Button */}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1.5 rounded-md transition-all duration-200 text-sm font-medium flex items-center gap-1.5 ${
                hasActiveFilters 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                filtersExpanded ? 'rotate-180' : ''
              }`} />
            </button>
          </div>
        </div>

        {/* Expandable Filters Section */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
          filtersExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="pt-4">
              {/* Active Filters Indicator */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Active filters:</span>
                    <div className="flex items-center gap-1">
                      {filters.search && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          "{filters.search}"
                        </span>
                      )}
                      {filters.routeType && filters.routeType !== 'all' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          {filters.routeType}
                        </span>
                      )}
                      {filters.method && filters.method !== 'all' && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          {filters.method}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    onClick={clearAllFilters}
                    leftIcon={<X className="w-3 h-3" />}
                  >
                    Clear all
                  </Button>
                </div>
              )}

              {/* Filter Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Route Type Filter */}
                <div className="space-y-2">
                  <Select
                    value={filters.routeType || 'all'}
                    onChange={(e) => setFilters({ routeType: e as any })}
                    leftIcon={<Route className="w-4 h-4" />}
                    className="w-full"
                    label='Route Type'
                  >
                    <option value="all">All Types</option>
                    <option value="http">HTTP/HTTPS</option>
                    <option value="websocket">WebSocket</option>
                  </Select>
                </div>
                
                {/* HTTP Method Filter */}
                {(filters.routeType === 'all' || filters.routeType === 'http' || !filters.routeType) && (
                  <div className="space-y-2">
                    <Select
                      value={filters.method}
                      onChange={(e) => setFilters({ method: e as any })}
                      leftIcon={<Filter className="w-4 h-4" />}
                      className="w-full"
                      label='HTTP Method'
                    >
                      <option value="all">All Methods</option>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </Select>
                  </div>
                )}
              </div>
            </div>
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

export default RouteControls;