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
  AlertTriangle,
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
import type { NetworkRequest, WebSocketFrame } from '../../types/network';
import type { RouteConfig, WebSocketConfig } from '../../types';
import {
  getRequests,
  clearRequests as clearNetworkRequests,
  attachDebugger,
  detachDebugger,
  exportHAR,
  downloadFile,
  addNetworkMessageListener,
  getCurrentTabId,
  getDebuggerStatus,
  getRequestDetails,
  getResponseBody,
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

const MIN_PANEL_SIZE = 150;
const DEFAULT_PANEL_SIZE_BOTTOM = 280;
const DEFAULT_PANEL_SIZE_RIGHT = 380;
/** Minimum interval between WebSocket frame refreshes for the selected socket. */
const WS_FRAMES_REFRESH_MS = 500;

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
  const { addRoute } = useAppStore();

  // Panel state
  const [panelPosition, setPanelPosition] = useState<PanelPosition>('right');
  const [panelSize, setPanelSize] = useState(DEFAULT_PANEL_SIZE_RIGHT);
  const [isResizing, setIsResizing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ size: number; clientPos: number } | null>(null);

  // Track current tab ID
  const currentTabIdRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  // List updates omit WebSocket frames; load them for the selected socket only.
  const [selectedWsFrames, setSelectedWsFrames] = useState<{
    requestId: string;
    frames: WebSocketFrame[];
  } | null>(null);
  const wsFramesFetchRef = useRef<{ requestId: string; at: number } | null>(null);
  const selectedId = selectedRequest?.requestId;
  const selectedIsWebSocket = selectedRequest?.type === 'websocket';
  const selectedFrameCount =
    (selectedRequest?.wsFramesSent || 0) + (selectedRequest?.wsFramesReceived || 0);

  useEffect(() => {
    if (!selectedId || !selectedIsWebSocket) {
      setSelectedWsFrames(null);
      return;
    }
    let cancelled = false;
    const last = wsFramesFetchRef.current;
    const wait =
      last?.requestId === selectedId
        ? Math.max(0, WS_FRAMES_REFRESH_MS - (Date.now() - last.at))
        : 0;
    const timer = setTimeout(async () => {
      const tabId = currentTabIdRef.current;
      if (!tabId) return;
      wsFramesFetchRef.current = { requestId: selectedId, at: Date.now() };
      const { request } = await getRequestDetails(tabId, selectedId);
      if (!cancelled) {
        setSelectedWsFrames({ requestId: selectedId, frames: request?.wsFrames || [] });
      }
    }, wait);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedId, selectedIsWebSocket, selectedFrameCount]);

  const detailsRequest =
    selectedRequest && selectedWsFrames?.requestId === selectedRequest.requestId
      ? { ...selectedRequest, wsFrames: selectedWsFrames.frames }
      : selectedRequest;

  // ─── Initialize on mount ───────────────────────────────────────────────────
  useEffect(() => {
    const initialize = async () => {
      const tabId = await getCurrentTabId();
      if (!tabId) return;
      currentTabIdRef.current = tabId;

      const { requests, settings } = await getRequests(tabId);
      setRequests(requests);
      updateSettings(settings);

      // Reflect ground truth: ask the background whether the debugger is currently attached.
      // If recording is on but the debugger isn't attached (e.g. service-worker restart, prior
      // session left it detached), attempt to attach now so the UI matches reality.
      const recording = useNetworkStore.getState().settings.recording;
      const realAttached = await getDebuggerStatus(tabId);

      if (recording && !realAttached) {
        const attached = await attachDebugger(tabId);
        setDebuggerAttached(attached);
      } else {
        setDebuggerAttached(realAttached);
      }

      isInitializedRef.current = true;
    };

    initialize();
  }, [setRequests, updateSettings, setDebuggerAttached]);

  // ─── Handle Recording State Changes (after initialization) ─────────────────
  useEffect(() => {
    // Skip during initial mount - initialization effect handles that
    if (!isInitializedRef.current) return;

    const handleRecordingChange = async () => {
      const tabId = currentTabIdRef.current || await getCurrentTabId();
      if (!tabId) return;
      currentTabIdRef.current = tabId;

      if (isRecording) {
        // Attach debugger when starting to record
        const attached = await attachDebugger(tabId);
        setDebuggerAttached(attached);
      } else {
        // Detach debugger when pausing
        await detachDebugger(tabId);
        setDebuggerAttached(false);
      }
    };

    handleRecordingChange();
  }, [isRecording, setDebuggerAttached]);

  // ─── Listen for Network Updates ────────────────────────────────────────────
  useEffect(() => {
    const cleanup = addNetworkMessageListener((message) => {
      // Only process updates if we're recording
      if (
        message.type === 'NETWORK_REQUESTS_UPDATED' &&
        message.tabId === currentTabIdRef.current &&
        isRecording
      ) {
        setRequests(message.requests as NetworkRequest[]);
      }
      if (
        message.type === 'NETWORK_DEBUGGER_ATTACHED' &&
        message.tabId === currentTabIdRef.current
      ) {
        setDebuggerAttached(true);
      }
      if (
        message.type === 'NETWORK_DEBUGGER_DETACHED' &&
        message.tabId === currentTabIdRef.current
      ) {
        setDebuggerAttached(false);
      }
    });

    return cleanup;
  }, [isRecording, setRequests, setDebuggerAttached]);

  // ─── Handle Tab Changes ────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const tabId = await getCurrentTabId();
      if (tabId && tabId !== currentTabIdRef.current) {
        const previousTabId = currentTabIdRef.current;
        currentTabIdRef.current = tabId;

        // Only attach if recording; release the tab we're leaving
        if (isRecording) {
          if (previousTabId) await detachDebugger(previousTabId);
          const attached = await attachDebugger(tabId);
          setDebuggerAttached(attached);
        }
        
        const { requests } = await getRequests(tabId);
        setRequests(requests);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, setRequests, setDebuggerAttached]);

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
      const isWebSocket = request.type === 'websocket';
      const routes = useAppStore.getState().routes;
      
      // Build route key based on request type
      let routeKey: string;
      if (isWebSocket) {
        // WebSocket routes use WS: prefix and can optionally have a name
        routeKey = `WS:${request.url}`;
      } else {
        routeKey = `${request.method}:${request.url}`;
      }
      
      // Check if route already exists
      if (routes[routeKey]) {
        useAppStore.getState().setEditingRoute(routeKey);
        return;
      }

      if (isWebSocket) {
        // Create WebSocket config
        const newRoute: WebSocketConfig = {
          enabled: true,
          timestamp: Date.now(),
          name: request.hostname,
          incomingRules: [],
          outgoingRules: [],
          delay: 0,
        };

        await addRoute(routeKey, newRoute);
      } else {
        // Create HTTP config
        const tabId = currentTabIdRef.current;
        const body = tabId ? await getResponseBody(tabId, request.requestId) : null;
        const responseContent = body && !body.base64Encoded ? body.body : '';
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
      }

      useAppStore.getState().setEditingRoute(routeKey);
    },
    [addRoute]
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
      className="h-full w-full flex flex-col bg-[var(--bg-base)] dark-theme"
      style={{ overflow: 'hidden' }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          TOOLBAR - Fixed at top
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-none flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <div className={clsx('ds-status', !isRecording && 'paused')}>
            <span className="ds-status-dot" />
            <span>{isRecording ? 'Recording' : 'Paused'}</span>
          </div>
          {/* Only warn when recording is on but debugger detached unexpectedly. */}
          {isRecording && !debuggerAttached && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] rounded text-[11px] text-[var(--accent-amber)]">
              <AlertTriangle size={12} />
              <span>Debugger not attached</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hasSelection && (
            <button
              onClick={() => setPanelPosition(p => p === 'bottom' ? 'right' : 'bottom')}
              className="ds-icon-btn"
              title={`Switch to ${isBottomPanel ? 'side' : 'bottom'} panel`}
            >
              {isBottomPanel ? <PanelRightClose size={14} /> : <PanelBottomClose size={14} />}
            </button>
          )}

          <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />

          <button
            onClick={toggleRecording}
            className={clsx('ds-icon-btn', isRecording && 'recording')}
            title={isRecording ? 'Pause Recording' : 'Resume Recording'}
          >
            <Circle size={14} fill={isRecording ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={handleClearRequests}
            className="ds-icon-btn danger"
            title="Clear Requests"
          >
            <Trash2 size={14} />
          </button>

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

      {/* ═══════════════════════════════════════════════════════════════════════
          STATS & FILTERS - Fixed below toolbar
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-none">
        <NetworkStats />
        <NetworkFilters />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN SPLIT PANEL AREA
          Takes ALL remaining space, contains list + details
          ═══════════════════════════════════════════════════════════════════════ */}
      <div 
        className={clsx(
          'flex-1 flex',
          isBottomPanel ? 'flex-col' : 'flex-row'
        )}
        style={{ minHeight: 0, minWidth: 0, overflow: 'hidden' }}
      >
        {/* ─── Request List Pane ──────────────────────────────────────────── */}
        <div 
          className="overflow-hidden"
          style={
            hasSelection
              ? {
                  [isBottomPanel ? 'height' : 'width']: `calc(100% - ${panelSize}px - 4px)`,
                  [isBottomPanel ? 'minHeight' : 'minWidth']: 0,
                  flexShrink: 0,
                  flexGrow: 0,
                }
              : {
                  flex: '1 1 auto',
                  minHeight: 0,
                  minWidth: 0,
                }
          }
        >
          <NetworkRequestList
            requests={filteredRequests}
            selectedRequest={selectedRequest}
            onSelectRequest={handleSelectRequest}
            onInterceptRequest={handleInterceptRequest}
          />
        </div>

        {/* ─── Resize Handle + Details Panel ──────────────────────────────── */}
        {hasSelection && detailsRequest && (
          <>
            {/* Resize Handle */}
            <div
              className={clsx(
                'relative group flex-shrink-0',
                isBottomPanel 
                  ? 'h-[5px] cursor-row-resize bg-[var(--bg-elevated)] border-y border-[var(--border-default)]'
                  : 'w-[5px] cursor-col-resize bg-[var(--bg-elevated)] border-x border-[var(--border-default)]'
              )}
              onMouseDown={handleResizeStart}
            >
              {/* Larger invisible hit area */}
              <div
                className={clsx(
                  'absolute z-10',
                  isBottomPanel
                    ? '-top-2 -bottom-2 left-0 right-0'
                    : '-left-2 -right-2 top-0 bottom-0'
                )}
              />
              {/* Center dots indicator */}
              <div
                className={clsx(
                  'absolute inset-0 flex items-center justify-center',
                  isBottomPanel ? 'flex-row gap-1' : 'flex-col gap-1'
                )}
              >
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={clsx(
                      'rounded-full bg-[var(--text-tertiary)] transition-colors',
                      'w-1 h-1',
                      'group-hover:bg-[var(--accent-blue)]',
                      isResizing && 'bg-[var(--accent-blue)]'
                    )}
                  />
                ))}
              </div>
              {/* Highlight on hover/drag */}
              <div
                className={clsx(
                  'absolute inset-0 transition-colors pointer-events-none',
                  isResizing 
                    ? 'bg-[var(--accent-blue)]/30' 
                    : 'group-hover:bg-[var(--accent-blue)]/20'
                )}
              />
            </div>

            {/* Details Panel */}
            <div
              className="overflow-hidden bg-[var(--bg-base)] flex-shrink-0"
              style={{
                [isBottomPanel ? 'height' : 'width']: panelSize,
                minHeight: 0,
                minWidth: 0,
              }}
            >
              <NetworkRequestDetails
                request={detailsRequest}
                responseBody={responseBody}
                onClose={handleCloseDetails}
                onLoadResponseBody={setResponseBody}
              />
            </div>
          </>
        )}
      </div>

      {/* Resize overlay */}
      {isResizing && (
        <div 
          className={clsx(
            'fixed inset-0 z-50',
            isBottomPanel ? 'cursor-row-resize' : 'cursor-col-resize'
          )} 
        />
      )}
    </div>
  );
}

export default NetworkTab;