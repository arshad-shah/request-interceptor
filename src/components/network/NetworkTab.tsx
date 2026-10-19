/**
 * NetworkTab Component
 * Main container for the Network Inspector feature tab
 * Enhanced with proper scrolling and DevTools-style layout
 */

import { useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import {
  useNetworkStore,
  useFilteredNetworkRequests,
  useSelectedRequest,
  useResponseBody,
  useIsRecording,
  useDebuggerAttached,
} from '../../stores/network-store';
import type { NetworkRequest } from '../../types/network';
import {
  clearRequests as clearNetworkRequests,
  exportHAR,
  downloadFile,
  getCurrentTabId,
} from '../../lib/network-api';
import NetworkStats from './NetworkStats';
import NetworkFilters from './NetworkFilters';
import NetworkRequestList from './NetworkRequestList';
import NetworkRequestDetails from './details/NetworkRequestDetails';
import { NetworkToolbar } from './NetworkToolbar';
import { PanelResizeHandle } from './PanelResizeHandle';
import { useSelectedWsFrames } from './hooks/useSelectedWsFrames';
import { useNetworkCapture } from './hooks/useNetworkCapture';
import { usePanelResize } from './hooks/usePanelResize';
import { useInterceptRequest } from './hooks/useInterceptRequest';

// ============================================================================
// Main Component
// ============================================================================

export function NetworkTab() {
  const {
    selectRequest,
    setResponseBody,
    clearRequests,
    toggleRecording,
  } = useNetworkStore();

  const filteredRequests = useFilteredNetworkRequests();
  const selectedRequest = useSelectedRequest();
  const responseBody = useResponseBody();
  const isRecording = useIsRecording();
  const debuggerAttached = useDebuggerAttached();

  // Track current tab ID
  const currentTabIdRef = useRef<number | null>(null);

  const detailsRequest = useSelectedWsFrames(selectedRequest, currentTabIdRef);
  useNetworkCapture(currentTabIdRef, isRecording);

  const {
    panelPosition,
    setPanelPosition,
    panelSize,
    isResizing,
    containerRef,
    handleResizeStart,
  } = usePanelResize();

  const handleInterceptRequest = useInterceptRequest(currentTabIdRef);

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
      <NetworkToolbar
        isRecording={isRecording}
        debuggerAttached={debuggerAttached}
        hasSelection={hasSelection}
        isBottomPanel={isBottomPanel}
        exportDisabled={filteredRequests.length === 0}
        onTogglePanelPosition={() => setPanelPosition(p => p === 'bottom' ? 'right' : 'bottom')}
        onToggleRecording={toggleRecording}
        onClear={handleClearRequests}
        onExport={handleExportHAR}
      />

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
            <PanelResizeHandle
              isBottomPanel={isBottomPanel}
              isResizing={isResizing}
              onMouseDown={handleResizeStart}
            />

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
