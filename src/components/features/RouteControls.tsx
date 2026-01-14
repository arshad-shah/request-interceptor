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
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { ConfirmDialog } from '../ui/Dialog';

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

        addNotification({
          title: 'Success',
          message: 'Routes exported and copied to clipboard',
          type: 'success',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'Failed to export routes',
        type: 'error',
        timestamp: Date.now()
      });
    }
  };

  const handleClearAll = async () => {
    try {
      await chromeApi.clearRoutes();
      clearRoutes();
      addNotification({
        title: 'Success',
        message: 'All routes cleared successfully',
        type: 'success',
        timestamp: Date.now()
      });
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'Failed to clear routes',
        type: 'error',
        timestamp: Date.now()
      });
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
      <div className="ds-panel">
        {/* Header */}
        <div className="ds-panel-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            {/* Route Statistics */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(99,102,241,0.15)] text-[var(--accent-indigo)] rounded-[var(--radius-sm)] text-[12px] font-medium">
                <BarChart3 size={14} />
                <span>{routeCount} Total</span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                {httpRoutes > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-[rgba(16,185,129,0.15)] text-[var(--accent-emerald)] rounded-[var(--radius-sm)]">
                    <Zap size={12} />
                    <span className="font-medium">{httpRoutes}</span>
                    <span>HTTP</span>
                  </div>
                )}

                {wsRoutes > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-[rgba(139,92,246,0.15)] text-[var(--accent-violet)] rounded-[var(--radius-sm)]">
                    <MessageSquare size={12} />
                    <span className="font-medium">{wsRoutes}</span>
                    <span>WS</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {routeCount > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExport}
                  leftIcon={<Download size={14} />}
                >
                  Export
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowClearDialog(true)}
                  leftIcon={<Trash2 size={14} />}
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="ds-panel-body">
          <div className="relative">
            <Input
              placeholder="Search routes by URL, method, or description..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              leftIcon={<Search size={14} />}
              className="pr-24"
            />

            {/* Filter Toggle Button */}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium flex items-center gap-1 transition-colors ${
                hasActiveFilters
                  ? 'bg-[rgba(99,102,241,0.15)] text-[var(--accent-indigo)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Filter size={12} />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <div className="w-1.5 h-1.5 bg-[var(--accent-indigo)] rounded-full" />
              )}
              <ChevronDown size={12} className={`transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expandable Filters Section */}
        {filtersExpanded && (
          <div className="ds-panel-body border-t border-[var(--border-subtle)]">
            {/* Active Filters Indicator */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                  <span className="font-medium">Active filters:</span>
                  <div className="flex items-center gap-1">
                    {filters.search && (
                      <span className="px-1.5 py-0.5 bg-[rgba(99,102,241,0.15)] text-[var(--accent-indigo)] rounded-[var(--radius-sm)]">
                        "{filters.search}"
                      </span>
                    )}
                    {filters.routeType && filters.routeType !== 'all' && (
                      <span className="px-1.5 py-0.5 bg-[rgba(16,185,129,0.15)] text-[var(--accent-emerald)] rounded-[var(--radius-sm)]">
                        {filters.routeType}
                      </span>
                    )}
                    {filters.method && filters.method !== 'all' && (
                      <span className="px-1.5 py-0.5 bg-[rgba(139,92,246,0.15)] text-[var(--accent-violet)] rounded-[var(--radius-sm)]">
                        {filters.method}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={clearAllFilters}
                  className="ds-btn text-[11px] px-2 py-1 flex items-center gap-1"
                >
                  <X size={10} />
                  Clear all
                </button>
              </div>
            )}

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Route Type Filter */}
              <Select
                value={filters.routeType || 'all'}
                onChange={(e) => setFilters({ routeType: e as 'all' | 'http' | 'websocket' })}
                leftIcon={<Route size={14} />}
                label="Route Type"
              >
                <option value="all">All Types</option>
                <option value="http">HTTP/HTTPS</option>
                <option value="websocket">WebSocket</option>
              </Select>

              {/* HTTP Method Filter */}
              {(filters.routeType === 'all' || filters.routeType === 'http' || !filters.routeType) && (
                <Select
                  value={filters.method}
                  onChange={(e) => setFilters({ method: e as 'all' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' })}
                  leftIcon={<Filter size={14} />}
                  label="HTTP Method"
                >
                  <option value="all">All Methods</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </Select>
              )}
            </div>
          </div>
        )}
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
