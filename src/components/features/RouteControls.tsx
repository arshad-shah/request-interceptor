import React from 'react';
import { Search, Download, Trash2, Plus } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi } from '@/lib/chrome-api';
import Input from '../ui/Input';
import Select, { type SelectOption } from '../ui/Select';
import Button from '../ui/Button';
import { ConfirmDialog } from '../ui/Dialog';

const methodFilterOptions: SelectOption[] = [
  { value: 'all', label: 'All methods' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' }
];

const RouteControls: React.FC = () => {
  const {
    routes,
    filters,
    setFilters,
    addNotification,
    clearRoutes,
    openForm
  } = useAppStore();

  const [showClearDialog, setShowClearDialog] = React.useState(false);

  const handleExport = async () => {
    try {
      const response = await chromeApi.exportRoutes();
      if (response.success) {
        const jsonString = JSON.stringify(response.data, null, 2);

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
  const showMethodFilter = !filters.routeType || filters.routeType === 'all' || filters.routeType === 'http';

  return (
    <>
      <div className="ds-panel">
        <div className="ds-panel-header">
          <div className="flex items-center flex-wrap gap-2 w-full">
            
            {routeCount > 0 && (
              <>
            <Button
              variant="primary"
              size="sm"
              onClick={openForm}
              leftIcon={<Plus size={14} />}
            >
              Add Route
            </Button>

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
              </>
            )}
          </div>
        </div>

        <div className="ds-panel-body">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <Input
                placeholder="Search routes by URL, method, or description..."
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                leftIcon={<Search />}
                clearable
                onClear={() => setFilters({ search: '' })}
              />
            </div>

            {showMethodFilter && (
              <div className="w-36 shrink-0">
                <Select
                  value={filters.method}
                  onChange={(value) =>
                    setFilters({ method: value as 'all' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' })
                  }
                  options={methodFilterOptions}
                />
              </div>
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

export default RouteControls;
