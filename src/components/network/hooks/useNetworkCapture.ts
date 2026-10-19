/**
 * Keeps the network panel in sync with the background capture:
 * initial load, debugger attach/detach on recording changes, live updates,
 * and following the active browser tab.
 */

import { useEffect, useRef, type MutableRefObject } from 'react';
import { useNetworkStore } from '../../../stores/network-store';
import {
  getRequests,
  attachDebugger,
  detachDebugger,
  getCurrentTabId,
  getDebuggerStatus,
} from '../../../lib/network-api';
import { onEvent } from '../../../lib/messaging';

export function useNetworkCapture(
  currentTabIdRef: MutableRefObject<number | null>,
  isRecording: boolean
): void {
  const { setRequests, setDebuggerAttached, updateSettings } = useNetworkStore();
  const isInitializedRef = useRef(false);

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
  }, [currentTabIdRef, setRequests, updateSettings, setDebuggerAttached]);

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
  }, [currentTabIdRef, isRecording, setDebuggerAttached]);

  // ─── Listen for Network Updates ────────────────────────────────────────────
  useEffect(() => {
    const isCurrentTab = (tabId: number) => tabId === currentTabIdRef.current;
    const offs = [
      onEvent('NETWORK_REQUESTS_UPDATED', ({ tabId, requests }) => {
        // Only process updates while recording
        if (isCurrentTab(tabId) && isRecording) setRequests(requests);
      }),
      onEvent('NETWORK_DEBUGGER_ATTACHED', ({ tabId }) => {
        if (isCurrentTab(tabId)) setDebuggerAttached(true);
      }),
      onEvent('NETWORK_DEBUGGER_DETACHED', ({ tabId }) => {
        if (isCurrentTab(tabId)) setDebuggerAttached(false);
      }),
    ];
    const cleanup = () => offs.forEach((off) => off());

    return cleanup;
  }, [currentTabIdRef, isRecording, setRequests, setDebuggerAttached]);

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
  }, [currentTabIdRef, isRecording, setRequests, setDebuggerAttached]);
}
