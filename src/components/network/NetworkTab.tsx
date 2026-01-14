/**
 * NetworkTab Component
 * Main container for the Network Inspector feature tab
 */

import { useEffect, useCallback } from 'react';
import {
  Circle,
  Trash2,
  Download,
  Settings,
  Activity,
} from 'lucide-react';
import {
  useNetworkStore,
  useFilteredNetworkRequests,
  useSelectedRequest,
  useResponseBody,
  useIsRecording,
  useDebuggerAttached,
} from '../../stores/network-store';
import { useAppStore } from '../../stores/app-store';
import type { NetworkRequest } from '../../types/network';
import type { RouteConfig } from '../../types';
import {
  getRequests,
  clearRequests as clearNetworkRequests,
  attachDebugger,
  exportHAR,
  downloadFile,
  addNetworkMessageListener,
  getCurrentTabId,
} from '../../lib/network-api';
import NetworkStats from './NetworkStats';
import NetworkFilters from './NetworkFilters';
import NetworkRequestList from './NetworkRequestList';
import NetworkRequestDetails from './NetworkRequestDetails';

export function NetworkTab() {
  const {
    setRequests,
    selectRequest,
    setResponseBody,
    clearRequests,
    toggleRecording,
    setDebuggerAttached,
    updateSettings,
  } = useNetworkStore();

  const filteredRequests = useFilteredNetworkRequests();
  const selectedRequest = useSelectedRequest();
  const responseBody = useResponseBody();
  const isRecording = useIsRecording();
  const debuggerAttached = useDebuggerAttached();
  const { setActiveTab, addRoute } = useAppStore();

  // Initialize network monitoring
  useEffect(() => {
    let currentTabId: number | null = null;

    const initialize = async () => {
      const tabId = await getCurrentTabId();
      if (!tabId) return;
      currentTabId = tabId;

      // Attach debugger
      const attached = await attachDebugger(tabId);
      setDebuggerAttached(attached);

      // Load existing requests
      const { requests, settings } = await getRequests(tabId);
      setRequests(requests);
      updateSettings(settings);
    };

    initialize();

    // Listen for updates from background
    const cleanup = addNetworkMessageListener((message) => {
      if (
        message.type === 'NETWORK_REQUESTS_UPDATED' &&
        message.tabId === currentTabId
      ) {
        setRequests(message.requests as NetworkRequest[]);
      }
      if (
        message.type === 'NETWORK_DEBUGGER_DETACHED' &&
        message.tabId === currentTabId
      ) {
        setDebuggerAttached(false);
      }
    });

    // Periodic tab check
    const interval = setInterval(async () => {
      const tabId = await getCurrentTabId();
      if (tabId && tabId !== currentTabId) {
        currentTabId = tabId;
        const attached = await attachDebugger(tabId);
        setDebuggerAttached(attached);
        const { requests } = await getRequests(tabId);
        setRequests(requests);
      }
    }, 1000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, []);

  // Handle clear requests
  const handleClearRequests = useCallback(async () => {
    const tabId = await getCurrentTabId();
    if (tabId) {
      await clearNetworkRequests(tabId);
      clearRequests();
    }
  }, [clearRequests]);

  // Handle export HAR
  const handleExportHAR = useCallback(async () => {
    const tabId = await getCurrentTabId();
    if (!tabId) return;

    if (filteredRequests.length === 0) {
      return; // No requests to export
    }

    const har = await exportHAR(tabId);
    const filename = `network-${new Date().toISOString().slice(0, 10)}.har`;
    downloadFile(har, filename);
  }, [filteredRequests.length]);

  // Handle intercept request - create a route from the request
  const handleInterceptRequest = useCallback(
    async (request: NetworkRequest) => {
      // Create a new route based on the request
      const routeKey = `${request.method}:${request.url}`;

      // Check if route already exists
      const routes = useAppStore.getState().routes;
      if (routes[routeKey]) {
        // Route already exists, switch to edit mode
        useAppStore.getState().setEditingRoute(routeKey);
        setActiveTab('add');
        return;
      }

      // Create new route config
      const newRoute: RouteConfig = {
        enabled: true,
        status: request.statusCode || 200,
        response: '',
        contentType: 'application/json',
        timestamp: Date.now(),
        responseHeaders: request.responseHeaders?.reduce((acc, h) => {
          acc[h.name] = h.value;
          return acc;
        }, {} as Record<string, string>) || {},
        requestHeaders: {},
        removeRequestHeaders: [],
        delay: 0,
        headersOnly: false,
      };

      // Add the route
      await addRoute(routeKey, newRoute);

      // Switch to the Add Route tab for editing
      useAppStore.getState().setEditingRoute(routeKey);
      setActiveTab('add');
    },
    [addRoute, setActiveTab]
  );

  // Handle select request
  const handleSelectRequest = useCallback(
    (request: NetworkRequest) => {
      selectRequest(request);
      setResponseBody(null);
    },
    [selectRequest, setResponseBody]
  );

  // Handle close details
  const handleCloseDetails = useCallback(() => {
    selectRequest(null);
    setResponseBody(null);
  }, [selectRequest, setResponseBody]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] dark-theme relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-[var(--accent-indigo)]" />
          <h1 className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
            Network
          </h1>
          <div
            className={`ds-status ${isRecording ? '' : 'paused'}`}
          >
            <span className="ds-status-dot" />
            <span>{isRecording ? 'Recording' : 'Paused'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Record/Pause Button */}
          <button
            onClick={toggleRecording}
            className={`ds-icon-btn ${isRecording ? 'recording' : ''}`}
            title={isRecording ? 'Pause Recording' : 'Resume Recording'}
          >
            <Circle
              size={16}
              fill={isRecording ? 'currentColor' : 'none'}
            />
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClearRequests}
            className="ds-icon-btn danger"
            title="Clear Requests"
          >
            <Trash2 size={16} />
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportHAR}
            className="ds-icon-btn"
            title="Export HAR"
            disabled={filteredRequests.length === 0}
          >
            <Download size={16} />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              // TODO: Open settings modal
            }}
            className="ds-icon-btn"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <NetworkStats />

      {/* Filters */}
      <NetworkFilters />

      {/* Request List */}
      <NetworkRequestList
        requests={filteredRequests}
        selectedRequest={selectedRequest}
        onSelectRequest={handleSelectRequest}
        onInterceptRequest={handleInterceptRequest}
      />

      {/* Details Panel */}
      {selectedRequest && (
        <NetworkRequestDetails
          request={selectedRequest}
          responseBody={responseBody}
          onClose={handleCloseDetails}
          onLoadResponseBody={setResponseBody}
        />
      )}

      {/* Debugger Status Warning */}
      {!debuggerAttached && (
        <div className="absolute bottom-4 left-4 right-4 p-3 bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] rounded-[var(--radius-md)] text-sm text-[var(--accent-amber)]">
          Network monitoring limited - debugger not attached
        </div>
      )}
    </div>
  );
}

export default NetworkTab;
