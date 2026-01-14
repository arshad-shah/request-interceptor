/**
 * Network API Utilities
 * Functions for communicating with the background script for network monitoring
 */

import type {
  NetworkRequest,
  NetworkSettings,
  NetworkMessageResponse,
  ResponseBody,
  ReplayResult,
  NetworkHeader,
  QueryParam,
  HAR,
  TimingPhase,
  STATUS_TEXTS,
} from '../types/network';

// ============================================
// Chrome Message Helpers
// ============================================

async function sendNetworkMessage<T extends NetworkMessageResponse>(
  message: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime?.sendMessage) {
      reject(new Error('Chrome runtime not available'));
      return;
    }

    chrome.runtime.sendMessage(message, (response: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// ============================================
// Network API Functions
// ============================================

/**
 * Get all captured requests for a tab
 */
export async function getRequests(
  tabId: number
): Promise<{ requests: NetworkRequest[]; settings: NetworkSettings; debuggerAttached: boolean }> {
  const response = await sendNetworkMessage<NetworkMessageResponse>({
    type: 'NETWORK_GET_REQUESTS',
    tabId,
  });
  return {
    requests: response.requests || [],
    settings: response.settings || {
      preserveLog: false,
      recording: true,
      disableCache: false,
      showWaterfall: true,
    },
    debuggerAttached: response.attached || false,
  };
}

/**
 * Get detailed info for a specific request
 */
export async function getRequestDetails(
  tabId: number,
  requestId: string
): Promise<{ request: NetworkRequest | null; responseBody: ResponseBody | null }> {
  const response = await sendNetworkMessage<NetworkMessageResponse>({
    type: 'NETWORK_GET_REQUEST_DETAILS',
    tabId,
    requestId,
  });
  return {
    request: response.request || null,
    responseBody: response.responseBody || null,
  };
}

/**
 * Get response body for a request
 */
export async function getResponseBody(
  tabId: number,
  requestId: string
): Promise<ResponseBody | null> {
  const response = await sendNetworkMessage<NetworkMessageResponse>({
    type: 'NETWORK_GET_RESPONSE_BODY',
    tabId,
    requestId,
  });
  return response.responseBody || null;
}

/**
 * Clear all requests for a tab
 */
export async function clearRequests(tabId: number): Promise<boolean> {
  const response = await sendNetworkMessage<NetworkMessageResponse>({
    type: 'NETWORK_CLEAR_REQUESTS',
    tabId,
  });
  return response.success || false;
}

/**
 * Update network settings
 */
export async function updateSettings(
  settings: Partial<NetworkSettings>
): Promise<NetworkSettings> {
  const response = await sendNetworkMessage<NetworkMessageResponse>({
    type: 'NETWORK_UPDATE_SETTINGS',
    settings,
  });
  return (
    response.settings || {
      preserveLog: false,
      recording: true,
      disableCache: false,
      showWaterfall: true,
    }
  );
}

/**
 * Get current settings
 */
export async function getSettings(): Promise<NetworkSettings> {
  const response = await sendNetworkMessage<NetworkMessageResponse>({
    type: 'NETWORK_GET_SETTINGS',
  });
  return (
    response.settings || {
      preserveLog: false,
      recording: true,
      disableCache: false,
      showWaterfall: true,
    }
  );
}

/**
 * Export requests as HAR format
 */
export async function exportHAR(tabId: number): Promise<string> {
  const response = await sendNetworkMessage<NetworkMessageResponse>({
    type: 'NETWORK_EXPORT_HAR',
    tabId,
  });
  return response.har || '';
}

/**
 * Replay a request
 */
export async function replayRequest(
  request: NetworkRequest
): Promise<ReplayResult> {
  const response = await sendNetworkMessage<NetworkMessageResponse>({
    type: 'NETWORK_REPLAY_REQUEST',
    request,
  });
  return response.result || { error: 'Unknown error' };
}

/**
 * Attach debugger to tab for network monitoring
 */
export async function attachDebugger(tabId: number): Promise<boolean> {
  const response = await sendNetworkMessage<NetworkMessageResponse>({
    type: 'NETWORK_ATTACH_DEBUGGER',
    tabId,
  });
  return response.attached || false;
}

/**
 * Detach debugger from tab
 */
export async function detachDebugger(tabId: number): Promise<boolean> {
  const response = await sendNetworkMessage<NetworkMessageResponse>({
    type: 'NETWORK_DETACH_DEBUGGER',
    tabId,
  });
  return response.success || false;
}

/**
 * Get debugger status
 */
export async function getDebuggerStatus(tabId: number): Promise<boolean> {
  const response = await sendNetworkMessage<NetworkMessageResponse>({
    type: 'NETWORK_GET_DEBUGGER_STATUS',
    tabId,
  });
  return response.attached || false;
}

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
 * Escape HTML for safe rendering
 */
export function escapeHtml(str: string | undefined): string {
  if (typeof str !== 'string') return String(str || '');
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Syntax highlight JSON string
 */
export function syntaxHighlightJson(json: string): string {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }

  const escaped = escapeHtml(json);

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
          match = match.slice(0, -1) + '</span><span class="json-colon">:</span>';
          return `<span class="${cls}">${match}`;
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
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
 * Format XML with indentation
 */
export function formatXml(xml: string): string {
  let formatted = '';
  let indent = 0;
  const parts = xml.replace(/>\s*</g, '><').split(/(<[^>]+>)/);

  parts.forEach((part) => {
    if (!part) return;

    if (part.match(/^<\//)) {
      indent--;
    }

    formatted += '  '.repeat(Math.max(0, indent)) + part + '\n';

    if (part.match(/^<[^/]/) && !part.match(/\/>$/) && !part.match(/^<\?/)) {
      indent++;
    }
  });

  return formatted.trim();
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
 * Generate cURL command from request
 */
export function generateCurl(request: NetworkRequest): string {
  let curl = `curl '${request.url}'`;

  if (request.method !== 'GET') {
    curl += ` \\\n  -X ${request.method}`;
  }

  // Add headers
  (request.requestHeaders || []).forEach((h) => {
    const lowerName = h.name.toLowerCase();
    // Skip headers that curl handles automatically
    if (
      !['host', 'content-length', 'connection', 'accept-encoding'].includes(
        lowerName
      )
    ) {
      curl += ` \\\n  -H '${h.name}: ${h.value.replace(/'/g, "'\\''")}'`;
    }
  });

  // Add body if present
  if (request.postData) {
    curl += ` \\\n  --data-raw '${request.postData.replace(/'/g, "'\\''")}'`;
  }

  return curl;
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
 * Add message listener with cleanup
 */
export function addNetworkMessageListener(
  callback: (message: Record<string, unknown>) => void
): () => void {
  if (!chrome?.runtime?.onMessage) {
    return () => {};
  }

  const listener = (message: Record<string, unknown>) => {
    callback(message);
  };

  chrome.runtime.onMessage.addListener(listener);

  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}

/**
 * Convert request to interceptable route format
 */
export function requestToRoute(request: NetworkRequest): {
  method: string;
  url: string;
  statusCode: number;
  headers: { name: string; value: string }[];
  body?: string;
} {
  return {
    method: request.method,
    url: request.url,
    statusCode: request.statusCode || 200,
    headers: request.responseHeaders || [],
    body: undefined, // Will be populated with response body if available
  };
}
