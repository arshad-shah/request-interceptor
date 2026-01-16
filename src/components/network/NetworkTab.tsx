/**
 * NetworkTab Component
 * Main container for the Network Inspector feature tab
 * Enhanced with proper scrolling and DevTools-style layout
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Circle,
  Trash2,
  Download,
  PanelBottomClose,
  PanelRightClose,
  GripHorizontal,
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

// ============================================================================
// Types
// ============================================================================

type PanelPosition = 'bottom' | 'right';

// ============================================================================
// Constants
// ============================================================================

const MIN_PANEL_SIZE = 200;
const DEFAULT_PANEL_SIZE_BOTTOM = 350;
const DEFAULT_PANEL_SIZE_RIGHT = 450;

// ============================================================================
// Main Component
// ============================================================================

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

  // Panel state
  const [panelPosition, setPanelPosition] = useState<PanelPosition>('bottom');
  const [panelSize, setPanelSize] = useState(DEFAULT_PANEL_SIZE_BOTTOM);
  const [isResizing, setIsResizing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ size: number; clientPos: number } | null>(null);

  // ─── Initialize Network Monitoring ─────────────────────────────────────────
  useEffect(() => {
    let currentTabId: number | null = null;

    const initialize = async () => {
      const tabId = await getCurrentTabId();
      if (!tabId) return;
      currentTabId = tabId;

      const attached = await attachDebugger(tabId);
      setDebuggerAttached(attached);

      const { requests, settings } = await getRequests(tabId);
      setRequests(requests);
      updateSettings(settings);
    };

    initialize();

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

  // ─── Panel Position Change Handler ─────────────────────────────────────────
  useEffect(() => {
    // Reset panel size when position changes
    setPanelSize(
      panelPosition === 'bottom' 
        ? DEFAULT_PANEL_SIZE_BOTTOM 
        : DEFAULT_PANEL_SIZE_RIGHT
    );
  }, [panelPosition]);

  // ─── Resize Handlers ───────────────────────────────────────────────────────
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      size: panelSize,
      clientPos: panelPosition === 'bottom' ? e.clientY : e.clientX,
    };
  }, [panelSize, panelPosition]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newSize: number;

      if (panelPosition === 'bottom') {
        const delta = resizeStartRef.current.clientPos - e.clientY;
        newSize = Math.max(
          MIN_PANEL_SIZE,
          Math.min(resizeStartRef.current.size + delta, containerRect.height - 150)
        );
      } else {
        const delta = resizeStartRef.current.clientPos - e.clientX;
        newSize = Math.max(
          MIN_PANEL_SIZE,
          Math.min(resizeStartRef.current.size + delta, containerRect.width - 300)
        );
      }

      setPanelSize(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, panelPosition]);

  // ─── Action Handlers ───────────────────────────────────────────────────────
  const handleClearRequests = useCallback(async () => {
    const tabId = await getCurrentTabId();
    if (tabId) {
      await clearNetworkRequests(tabId);
      clearRequests();
    }
  }, [clearRequests]);

  const handleExportHAR = useCallback(async () => {
    const tabId = await getCurrentTabId();
    if (!tabId || filteredRequests.length === 0) return;

    const har = await exportHAR(tabId);
    const filename = `network-${new Date().toISOString().slice(0, 10)}.har`;
    downloadFile(har, filename);
  }, [filteredRequests.length]);

  const handleInterceptRequest = useCallback(
    async (request: NetworkRequest) => {
      const routeKey = `${request.method}:${request.url}`;
      const routes = useAppStore.getState().routes;
      
      if (routes[routeKey]) {
        useAppStore.getState().setEditingRoute(routeKey);
        setActiveTab('add');
        return;
      }

      // Use the response body from the request itself (fetched when request completed)
      const responseContent = request.responseBody?.body || '';
      const detectedContentType = request.mimeType || request.contentType || 'application/json';

      const newRoute: RouteConfig = {
        enabled: true,
        status: request.statusCode || 200,
        response: responseContent,
        contentType: detectedContentType,
        timestamp: Date.now(),
        responseHeaders: request.responseHeaders?.reduce((acc, h) => {
          acc[h.name] = h.value;
          return acc;
        }, {} as Record<string, string>) || {},
        requestHeaders: request.requestHeaders?.reduce((acc, h) => {
          acc[h.name] = h.value;
          return acc;
        }, {} as Record<string, string>) || {},
        removeRequestHeaders: [],
        delay: 0,
        headersOnly: false,
      };

      await addRoute(routeKey, newRoute);
      useAppStore.getState().setEditingRoute(routeKey);
      setActiveTab('add');
    },
    [addRoute, setActiveTab]
  );

  const handleSelectRequest = useCallback(
    (request: NetworkRequest) => {
      selectRequest(request);
      setResponseBody(null);
    },
    [selectRequest, setResponseBody]
  );

  const handleCloseDetails = useCallback(() => {
    selectRequest(null);
    setResponseBody(null);
  }, [selectRequest, setResponseBody]);

  // ─── Render ────────────────────────────────────────────────────────────────
  const isBottomPanel = panelPosition === 'bottom';
  const hasSelection = !!selectedRequest;

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full bg-[var(--bg-base)] dark-theme overflow-hidden"
    >
      {/* ─── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={clsx('ds-status', !isRecording && 'paused')}>
            <span className="ds-status-dot" />
            <span>{isRecording ? 'Recording' : 'Paused'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Panel Position Toggle */}
          {hasSelection && (
            <button
              onClick={() => setPanelPosition(p => p === 'bottom' ? 'right' : 'bottom')}
              className="ds-icon-btn"
              title={`Switch to ${isBottomPanel ? 'side' : 'bottom'} panel`}
            >
              {isBottomPanel ? (
                <PanelRightClose size={14} />
              ) : (
                <PanelBottomClose size={14} />
              )}
            </button>
          )}

          <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />

          {/* Record/Pause Button */}
          <button
            onClick={toggleRecording}
            className={clsx('ds-icon-btn', isRecording && 'recording')}
            title={isRecording ? 'Pause Recording' : 'Resume Recording'}
          >
            <Circle size={14} fill={isRecording ? 'currentColor' : 'none'} />
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClearRequests}
            className="ds-icon-btn danger"
            title="Clear Requests"
          >
            <Trash2 size={14} />
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportHAR}
            className="ds-icon-btn"
            title="Export HAR"
            disabled={filteredRequests.length === 0}
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* ─── Stats Bar ────────────────────────────────────────────────────── */}
      <NetworkStats />

      {/* ─── Filters ──────────────────────────────────────────────────────── */}
      <NetworkFilters />

      {/* ─── Main Content Area ────────────────────────────────────────────── */}
      <div 
        className={clsx(
          'flex-1 min-h-0 flex relative',
          isBottomPanel ? 'flex-col' : 'flex-row'
        )}
      >
        {/* Request List Container */}
        <div 
          className={clsx(
            'flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden',
            // When panel is open, constrain the list
            hasSelection && isBottomPanel && 'flex-shrink-0',
            hasSelection && !isBottomPanel && 'flex-shrink-0'
          )}
          style={
            hasSelection
              ? isBottomPanel
                ? { height: `calc(100% - ${panelSize}px)` }
                : { width: `calc(100% - ${panelSize}px)` }
              : undefined
          }
        >
          <NetworkRequestList
            requests={filteredRequests}
            selectedRequest={selectedRequest}
            onSelectRequest={handleSelectRequest}
            onInterceptRequest={handleInterceptRequest}
          />
        </div>

        {/* ─── Details Panel ────────────────────────────────────────────── */}
        {hasSelection && (
          <>
            {/* Resize Handle */}
            <div
              className={clsx(
                'flex-shrink-0 z-20 group',
                isBottomPanel 
                  ? 'h-1.5 cursor-row-resize hover:bg-[var(--accent-blue)]/20'
                  : 'w-1.5 cursor-col-resize hover:bg-[var(--accent-blue)]/20',
                isResizing && 'bg-[var(--accent-blue)]/30'
              )}
              onMouseDown={handleResizeStart}
            >
              <div
                className={clsx(
                  'flex items-center justify-center',
                  isBottomPanel 
                    ? 'h-full w-12 mx-auto' 
                    : 'w-full h-12 my-auto'
                )}
              >
                <GripHorizontal 
                  size={12} 
                  className={clsx(
                    'text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity',
                    !isBottomPanel && 'rotate-90'
                  )} 
                />
              </div>
            </div>

            {/* Details Panel */}
            <div
              className={clsx(
                'flex-shrink-0 bg-[var(--bg-base)] overflow-hidden',
                isBottomPanel 
                  ? 'border-t border-[var(--border-default)]' 
                  : 'border-l border-[var(--border-default)]'
              )}
              style={
                isBottomPanel
                  ? { height: panelSize }
                  : { width: panelSize }
              }
            >
              <NetworkRequestDetails
                request={selectedRequest}
                responseBody={responseBody}
                onClose={handleCloseDetails}
                onLoadResponseBody={setResponseBody}
              />
            </div>
          </>
        )}
      </div>

      {/* ─── Debugger Status Warning ──────────────────────────────────────── */}
      {!debuggerAttached && (
        <div className="absolute bottom-4 left-4 right-4 p-3 bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] rounded-[var(--radius-md)] text-sm text-[var(--accent-amber)] z-30">
          Network monitoring limited - debugger not attached
        </div>
      )}

      {/* Resize Overlay (prevents iframe/selection issues while dragging) */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-row-resize" />
      )}
    </div>
  );
}

export default NetworkTab;