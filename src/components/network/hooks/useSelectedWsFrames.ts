/**
 * Loads WebSocket frames for the selected socket.
 * List updates omit frames, so they are fetched on demand (throttled) and merged
 * into the request handed to the details panel.
 */

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { NetworkRequest, WebSocketFrame } from '../../../types/network';
import { getRequestDetails } from '../../../lib/network-api';

/** Minimum interval between WebSocket frame refreshes for the selected socket. */
const WS_FRAMES_REFRESH_MS = 500;

export function useSelectedWsFrames(
  selectedRequest: NetworkRequest | null,
  currentTabIdRef: MutableRefObject<number | null>
): NetworkRequest | null {
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
  }, [selectedId, selectedIsWebSocket, selectedFrameCount, currentTabIdRef]);

  const detailsRequest =
    selectedRequest && selectedWsFrames?.requestId === selectedRequest.requestId
      ? { ...selectedRequest, wsFrames: selectedWsFrames.frames }
      : selectedRequest;

  return detailsRequest;
}
