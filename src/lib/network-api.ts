/**
 * Network API Utilities
 * Functions for communicating with the background script for network monitoring
 */

import type {
  NetworkRequest,
  NetworkSettings,
  QueryParam,
  TimingPhase,
} from '../types/network';
import { NETWORK_PANEL_PORT } from '../types/network';
import { request } from './messaging';

// ============================================
// Network API (typed requests; see src/core/messaging/protocol.ts)
// ============================================

export async function getRequests(tabId: number) {
  const { requests, settings, attached } = await request('NETWORK_GET_REQUESTS', { tabId });
  return { requests, settings, debuggerAttached: attached };
}

export const getRequestDetails = (tabId: number, requestId: string) =>
  request('NETWORK_GET_REQUEST_DETAILS', { tabId, requestId });

export const getResponseBody = (tabId: number, requestId: string) =>
  request('NETWORK_GET_RESPONSE_BODY', { tabId, requestId });

export const clearRequests = (tabId: number) => request('NETWORK_CLEAR_REQUESTS', { tabId });

export const updateSettings = (settings: Partial<NetworkSettings>) => request('NETWORK_UPDATE_SETTINGS', { settings });


export const exportHAR = (tabId: number) => request('NETWORK_EXPORT_HAR', { tabId });

export const replayRequest = (networkRequest: NetworkRequest) =>
  request('NETWORK_REPLAY_REQUEST', { request: networkRequest });

export const attachDebugger = (tabId: number) => request('NETWORK_ATTACH_DEBUGGER', { tabId });

export const detachDebugger = (tabId: number) => request('NETWORK_DETACH_DEBUGGER', { tabId });

export const getDebuggerStatus = (tabId: number) => request('NETWORK_GET_DEBUGGER_STATUS', { tabId });

// ============================================
// Utility Functions
// ============================================

/**
 * Format bytes to human-readable size
 */
export function formatSize(bytes: number | undefined): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format milliseconds to human-readable time
 */
export function formatTime(ms: number | undefined): string {
  if (!ms || ms === 0) return '0 ms';
  if (ms < 1) return '<1 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 60000).toFixed(1)} m`;
}

/**
 * Get status code classification
 */
export function getStatusClass(
  statusCode: number | undefined,
  status: string
): string {
  if (status === 'pending') return 'pending';
  if (status === 'error') return 'error';
  if (!statusCode) return 'pending';
  if (statusCode >= 500) return 's5xx';
  if (statusCode >= 400) return 's4xx';
  if (statusCode >= 300) return 's3xx';
  return 's2xx';
}

/**
 * Get status text for status code
 */
export function getStatusText(code: number | undefined): string {
  if (!code) return '';
  const texts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return texts[code] || '';
}

/**
 * Parse query string to parameters
 */
export function parseQueryParams(query: string | undefined): QueryParam[] {
  if (!query || query === '?') return [];
  try {
    const params = new URLSearchParams(query);
    return Array.from(params.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  } catch {
    return [];
  }
}



/**
 * Check if string looks like JSON
 */
export function looksLikeJson(str: string): boolean {
  const trimmed = str.trim();
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  );
}


/**
 * Calculate timing phases for display
 */
export function calculateTimingPhases(
  timing: NetworkRequest['timing'],
  duration: number | undefined
): TimingPhase[] {
  const phases: TimingPhase[] = [];

  if (!timing) {
    if (duration && duration > 0) {
      phases.push({ name: 'Total', value: duration, className: 'wait' });
    }
    return phases;
  }

  // Blocked/Queued
  if (timing.sendStart && timing.startTime) {
    const blocked = (timing.sendStart - timing.startTime) * 1000;
    if (blocked > 0) {
      phases.push({ name: 'Blocked', value: blocked, className: 'blocked' });
    }
  }

  // DNS
  if (timing.dnsEnd && timing.dnsStart) {
    const dns = timing.dnsEnd - timing.dnsStart;
    if (dns > 0) {
      phases.push({ name: 'DNS Lookup', value: dns, className: 'dns' });
    }
  }

  // Connect
  if (timing.connectEnd && timing.connectStart) {
    const connect = timing.connectEnd - timing.connectStart;
    if (connect > 0) {
      phases.push({ name: 'Connect', value: connect, className: 'connect' });
    }
  }

  // SSL
  if (timing.sslEnd && timing.sslStart) {
    const ssl = timing.sslEnd - timing.sslStart;
    if (ssl > 0) {
      phases.push({ name: 'SSL', value: ssl, className: 'ssl' });
    }
  }

  // Waiting (TTFB)
  if (timing.responseStart && timing.sendEnd) {
    const wait = timing.responseStart - timing.sendEnd;
    if (wait > 0) {
      phases.push({ name: 'Waiting (TTFB)', value: wait, className: 'wait' });
    }
  }

  // Content Download
  if (timing.responseEnd && timing.responseStart) {
    const receive = timing.responseEnd - timing.responseStart;
    if (receive > 0) {
      phases.push({
        name: 'Content Download',
        value: receive,
        className: 'receive',
      });
    }
  }

  // Fallback if no timing data
  if (phases.length === 0 && duration && duration > 0) {
    phases.push({ name: 'Total', value: duration, className: 'wait' });
  }

  return phases;
}


/**
 * Download file with given content
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'application/json'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current active tab ID
 */
export async function getCurrentTabId(): Promise<number | null> {
  return new Promise((resolve) => {
    if (!chrome?.tabs?.query) {
      resolve(null);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]?.id || null);
    });
  });
}



/**
 * Hold the network-panel port open for the lifetime of the extension UI. The
 * background detaches the debugger once no panel is connected. Reconnects if
 * the service worker restarts (which drops the port).
 */
export function connectNetworkPanel(): () => void {
  let port: chrome.runtime.Port | null = null;
  let closed = false;
  const connect = () => {
    if (closed) return;
    port = chrome.runtime.connect({ name: NETWORK_PANEL_PORT });
    port.onDisconnect.addListener(() => {
      port = null;
      if (!closed) setTimeout(connect, 250);
    });
  };
  connect();
  return () => {
    closed = true;
    port?.disconnect();
  };
}
