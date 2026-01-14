/**
 * Network Background Service
 * Handles network monitoring via Chrome Debugger API
 */

// ============================================
// Types
// ============================================

interface NetworkHeader {
  name: string;
  value: string;
}

interface NetworkTiming {
  startTime?: number;
  dnsStart?: number;
  dnsEnd?: number;
  connectStart?: number;
  connectEnd?: number;
  sslStart?: number;
  sslEnd?: number;
  sendStart?: number;
  sendEnd?: number;
  receiveHeadersEnd?: number;
  responseStart?: number;
  responseEnd?: number;
}

interface NetworkRequest {
  requestId: string;
  tabId: number;
  frameId?: number;
  url: string;
  hostname: string;
  pathname: string;
  filename: string;
  query: string;
  method: string;
  type: string;
  resourceType?: string;
  initiator?: string;
  requestHeaders: NetworkHeader[];
  responseHeaders: NetworkHeader[];
  hasPostData?: boolean;
  postData?: string;
  statusCode?: number;
  statusLine?: string;
  mimeType?: string;
  contentType?: string;
  protocol?: string;
  size?: number;
  encodedSize?: number;
  encodedDataLength?: number;
  startTime: number;
  duration?: number;
  timing?: NetworkTiming;
  status: 'pending' | 'loading' | 'complete' | 'error';
  error?: string;
  fromCache?: boolean;
  fromServiceWorker?: boolean;
  ip?: string;
  remoteIPAddress?: string;
  remotePort?: number;
  redirectedTo?: string;
}

interface ResponseBody {
  body: string;
  base64Encoded: boolean;
  mimeType?: string;
  truncated?: boolean;
}

interface NetworkSettings {
  preserveLog: boolean;
  recording: boolean;
  disableCache: boolean;
  showWaterfall: boolean;
}

// ============================================
// Constants
// ============================================

const MAX_REQUESTS = 500;
const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB

const RESOURCE_TYPES: Record<string, string> = {
  Document: 'document',
  Stylesheet: 'stylesheet',
  Script: 'script',
  Image: 'image',
  Font: 'font',
  XHR: 'xhr',
  Fetch: 'xhr',
  Ping: 'other',
  Media: 'media',
  WebSocket: 'websocket',
  Manifest: 'other',
  Other: 'other',
};

// ============================================
// Network Manager Class
// ============================================

export class NetworkManager {
  private tabRequests: Map<number, Map<string, NetworkRequest>> = new Map();
  private requestBodies: Map<string, ResponseBody> = new Map();
  private debuggerAttached: Map<number, boolean> = new Map();
  private pendingBroadcasts: Map<number, ReturnType<typeof setTimeout>> = new Map();
  private settings: NetworkSettings = {
    preserveLog: false,
    recording: true,
    disableCache: false,
    showWaterfall: true,
  };

  constructor() {
    this.setupDebuggerHandlers();
    this.setupMessageHandlers();
    this.setupTabHandlers();
  }

  // ============================================
  // Initialization
  // ============================================

  private setupDebuggerHandlers(): void {
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (!this.settings.recording) return;
      this.handleDebuggerEvent(source.tabId!, method, params);
    });

    chrome.debugger.onDetach.addListener((source, reason) => {
      const tabId = source.tabId!;
      this.debuggerAttached.set(tabId, false);
      console.log(`[NetworkManager] Debugger detached from tab ${tabId}: ${reason}`);

      // Notify UI
      this.sendMessage({
        type: 'NETWORK_DEBUGGER_DETACHED',
        tabId,
        reason,
      });
    });
  }

  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message.type?.startsWith('NETWORK_')) return false;
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  private setupTabHandlers(): void {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'loading' && !this.settings.preserveLog) {
        this.clearTabRequests(tabId);
      }
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabRequests.delete(tabId);
      this.debuggerAttached.delete(tabId);
      const pending = this.pendingBroadcasts.get(tabId);
      if (pending) {
        clearTimeout(pending);
        this.pendingBroadcasts.delete(tabId);
      }
    });
  }

  // ============================================
  // Debugger API
  // ============================================

  async attachDebugger(tabId: number): Promise<boolean> {
    if (this.debuggerAttached.get(tabId)) return true;

    try {
      await chrome.debugger.attach({ tabId }, '1.3');
      this.debuggerAttached.set(tabId, true);

      // Enable Network domain
      await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {
        maxTotalBufferSize: 10 * 1024 * 1024,
        maxResourceBufferSize: 5 * 1024 * 1024,
      });

      // Enable cache control if needed
      if (this.settings.disableCache) {
        await chrome.debugger.sendCommand({ tabId }, 'Network.setCacheDisabled', {
          cacheDisabled: true,
        });
      }

      console.log(`[NetworkManager] Debugger attached to tab ${tabId}`);
      return true;
    } catch (e) {
      console.error(`[NetworkManager] Failed to attach debugger to tab ${tabId}:`, e);
      this.debuggerAttached.set(tabId, false);
      return false;
    }
  }

  async detachDebugger(tabId: number): Promise<void> {
    if (!this.debuggerAttached.get(tabId)) return;

    try {
      await chrome.debugger.detach({ tabId });
      this.debuggerAttached.set(tabId, false);
      console.log(`[NetworkManager] Debugger detached from tab ${tabId}`);
    } catch (e) {
      console.warn(`[NetworkManager] Failed to detach debugger from tab ${tabId}:`, e);
    }
  }

  // ============================================
  // Debugger Event Handling
  // ============================================

  private handleDebuggerEvent(tabId: number, method: string, params: any): void {
    switch (method) {
      case 'Network.requestWillBeSent':
        this.handleRequestWillBeSent(tabId, params);
        break;
      case 'Network.requestWillBeSentExtraInfo':
        this.handleRequestExtraInfo(tabId, params);
        break;
      case 'Network.responseReceived':
        this.handleResponseReceived(tabId, params);
        break;
      case 'Network.responseReceivedExtraInfo':
        this.handleResponseExtraInfo(tabId, params);
        break;
      case 'Network.loadingFinished':
        this.handleLoadingFinished(tabId, params);
        break;
      case 'Network.loadingFailed':
        this.handleLoadingFailed(tabId, params);
        break;
      case 'Network.dataReceived':
        this.handleDataReceived(tabId, params);
        break;
    }
  }

  private handleRequestWillBeSent(tabId: number, params: any): void {
    const { requestId, request, timestamp, type, initiator, frameId, redirectResponse } = params;

    // Handle redirect
    if (redirectResponse) {
      this.upsertRequest(tabId, requestId, {
        statusCode: redirectResponse.status,
        statusLine: redirectResponse.statusText,
        responseHeaders: this.headersToArray(redirectResponse.headers),
        mimeType: redirectResponse.mimeType,
        redirectedTo: request.url,
      });
    }

    // Parse URL
    let hostname = '',
      pathname = '',
      filename = '',
      query = '';
    try {
      const urlObj = new URL(request.url);
      hostname = urlObj.hostname;
      pathname = urlObj.pathname;
      filename = urlObj.pathname.split('/').pop() || urlObj.hostname;
      query = urlObj.search;
      if (!filename || filename === '/') filename = hostname;
    } catch {
      hostname = request.url.substring(0, 50);
      filename = hostname;
    }

    const requestData: Partial<NetworkRequest> = {
      requestId,
      url: request.url,
      method: request.method,
      type: RESOURCE_TYPES[type] || type?.toLowerCase() || 'other',
      resourceType: type,
      tabId,
      frameId,
      startTime: timestamp * 1000,
      status: 'pending',
      requestHeaders: this.headersToArray(request.headers),
      responseHeaders: [],
      hostname,
      pathname,
      filename,
      query,
      initiator: initiator?.url || initiator?.type || '',
      hasPostData: request.hasPostData || false,
      postData: request.postData || undefined,
      timing: {
        startTime: timestamp * 1000,
      },
    };

    this.upsertRequest(tabId, requestId, requestData);
  }

  private handleRequestExtraInfo(tabId: number, params: any): void {
    const { requestId, headers } = params;
    this.upsertRequest(tabId, requestId, {
      requestHeaders: this.headersToArray(headers),
    });
  }

  private handleResponseReceived(tabId: number, params: any): void {
    const { requestId, response, timestamp, type } = params;

    const updates: Partial<NetworkRequest> = {
      statusCode: response.status,
      statusLine: response.statusText,
      responseHeaders: this.headersToArray(response.headers),
      mimeType: response.mimeType,
      contentType: response.headers?.['content-type'] || response.mimeType,
      protocol: response.protocol,
      remoteIPAddress: response.remoteIPAddress,
      remotePort: response.remotePort,
      fromCache: response.fromDiskCache || response.fromPrefetchCache || false,
      fromServiceWorker: response.fromServiceWorker || false,
      encodedDataLength: response.encodedDataLength || 0,
      status: response.status >= 400 ? 'error' : 'loading',
      ip: response.remoteIPAddress,
    };

    if (response.timing) {
      updates.timing = {
        dnsStart: response.timing.dnsStart,
        dnsEnd: response.timing.dnsEnd,
        connectStart: response.timing.connectStart,
        connectEnd: response.timing.connectEnd,
        sslStart: response.timing.sslStart,
        sslEnd: response.timing.sslEnd,
        sendStart: response.timing.sendStart,
        sendEnd: response.timing.sendEnd,
        receiveHeadersEnd: response.timing.receiveHeadersEnd,
        responseStart: timestamp * 1000,
      };
    }

    this.upsertRequest(tabId, requestId, updates);
  }

  private handleResponseExtraInfo(tabId: number, params: any): void {
    const { requestId, headers, statusCode } = params;
    this.upsertRequest(tabId, requestId, {
      responseHeaders: this.headersToArray(headers),
      statusCode,
    });
  }

  private handleDataReceived(tabId: number, params: any): void {
    const { requestId, dataLength, encodedDataLength } = params;

    const requestMap = this.tabRequests.get(tabId);
    if (!requestMap) return;

    const existing = requestMap.get(requestId);
    if (existing) {
      this.upsertRequest(tabId, requestId, {
        size: (existing.size || 0) + dataLength,
        encodedSize: (existing.encodedSize || 0) + encodedDataLength,
      });
    }
  }

  private async handleLoadingFinished(tabId: number, params: any): Promise<void> {
    const { requestId, timestamp, encodedDataLength } = params;

    const requestMap = this.tabRequests.get(tabId);
    const request = requestMap?.get(requestId);

    if (request) {
      const duration = timestamp * 1000 - request.startTime;

      this.upsertRequest(tabId, requestId, {
        status: request.statusCode && request.statusCode >= 400 ? 'error' : 'complete',
        encodedSize: encodedDataLength || request.encodedSize,
        duration,
        timing: {
          ...request.timing,
          responseEnd: timestamp * 1000,
        },
      });

      // Fetch response body in background
      this.fetchResponseBody(tabId, requestId, request.mimeType);
    }
  }

  private handleLoadingFailed(tabId: number, params: any): void {
    const { requestId, timestamp, errorText, canceled } = params;

    const requestMap = this.tabRequests.get(tabId);
    const request = requestMap?.get(requestId);

    const duration = request ? timestamp * 1000 - request.startTime : 0;

    this.upsertRequest(tabId, requestId, {
      status: 'error',
      error: canceled ? 'Request canceled' : errorText,
      duration,
      timing: {
        ...request?.timing,
        responseEnd: timestamp * 1000,
      },
    });
  }

  // ============================================
  // Request Management
  // ============================================

  private initTab(tabId: number): void {
    if (!this.tabRequests.has(tabId)) {
      this.tabRequests.set(tabId, new Map());
    }
  }

  private upsertRequest(tabId: number, requestId: string, data: Partial<NetworkRequest>): void {
    if (tabId < 0) return;

    this.initTab(tabId);
    const requestMap = this.tabRequests.get(tabId)!;

    const existing = requestMap.get(requestId) || ({} as NetworkRequest);
    const updated = { ...existing, ...data, requestId } as NetworkRequest;

    requestMap.set(requestId, updated);

    // Limit stored requests
    if (requestMap.size > MAX_REQUESTS) {
      const oldest = Array.from(requestMap.keys())[0];
      requestMap.delete(oldest);
      this.requestBodies.delete(oldest);
    }

    this.debouncedBroadcast(tabId);
  }

  private clearTabRequests(tabId: number): void {
    const requestMap = this.tabRequests.get(tabId);
    if (requestMap) {
      for (const reqId of requestMap.keys()) {
        this.requestBodies.delete(reqId);
      }
      requestMap.clear();
    }
    this.broadcastUpdate(tabId);
  }

  private getRequestsArray(tabId: number): NetworkRequest[] {
    const requestMap = this.tabRequests.get(tabId);
    if (!requestMap) return [];
    return Array.from(requestMap.values()).sort((a, b) => a.startTime - b.startTime);
  }

  // ============================================
  // Response Body
  // ============================================

  private async fetchResponseBody(
    tabId: number,
    requestId: string,
    mimeType?: string
  ): Promise<void> {
    if (!this.debuggerAttached.get(tabId)) return;

    try {
      const result = await chrome.debugger.sendCommand(
        { tabId },
        'Network.getResponseBody',
        { requestId }
      ) as { body: string; base64Encoded: boolean };

      if (result) {
        const body: ResponseBody = {
          body: result.body,
          base64Encoded: result.base64Encoded,
          mimeType,
        };

        // Truncate if too large
        if (result.body.length <= MAX_BODY_SIZE) {
          this.requestBodies.set(requestId, body);
        } else {
          this.requestBodies.set(requestId, {
            body: result.body.substring(0, 10000) + '\n\n... [Truncated - Response too large]',
            base64Encoded: false,
            mimeType,
            truncated: true,
          });
        }
      }
    } catch {
      // Body might not be available for some requests
    }
  }

  // ============================================
  // Broadcasting
  // ============================================

  private debouncedBroadcast(tabId: number): void {
    const pending = this.pendingBroadcasts.get(tabId);
    if (pending) {
      clearTimeout(pending);
    }

    this.pendingBroadcasts.set(
      tabId,
      setTimeout(() => {
        this.broadcastUpdate(tabId);
        this.pendingBroadcasts.delete(tabId);
      }, 100)
    );
  }

  private broadcastUpdate(tabId: number): void {
    this.sendMessage({
      type: 'NETWORK_REQUESTS_UPDATED',
      tabId,
      requests: this.getRequestsArray(tabId),
    });
  }

  private sendMessage(message: any): void {
    chrome.runtime.sendMessage(message).catch(() => {
      // UI might not be open
    });
  }

  // ============================================
  // Message Handling
  // ============================================

  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'NETWORK_GET_REQUESTS':
          sendResponse({
            requests: this.getRequestsArray(message.tabId),
            settings: this.settings,
            attached: this.debuggerAttached.get(message.tabId) || false,
          });
          break;

        case 'NETWORK_GET_REQUEST_DETAILS':
          await this.handleGetRequestDetails(message, sendResponse);
          break;

        case 'NETWORK_GET_RESPONSE_BODY':
          await this.handleGetResponseBody(message, sendResponse);
          break;

        case 'NETWORK_CLEAR_REQUESTS':
          this.clearTabRequests(message.tabId);
          sendResponse({ success: true });
          break;

        case 'NETWORK_UPDATE_SETTINGS':
          this.settings = { ...this.settings, ...message.settings };
          if ('disableCache' in message.settings) {
            await this.updateCacheSettings();
          }
          sendResponse({ success: true, settings: this.settings });
          break;

        case 'NETWORK_GET_SETTINGS':
          sendResponse({ settings: this.settings });
          break;

        case 'NETWORK_EXPORT_HAR':
          const har = this.generateHAR(message.tabId);
          sendResponse({ har });
          break;

        case 'NETWORK_REPLAY_REQUEST':
          const result = await this.replayRequest(message.request);
          sendResponse({ result });
          break;

        case 'NETWORK_ATTACH_DEBUGGER':
          const attached = await this.attachDebugger(message.tabId);
          sendResponse({ success: attached, attached });
          break;

        case 'NETWORK_DETACH_DEBUGGER':
          await this.detachDebugger(message.tabId);
          sendResponse({ success: true });
          break;

        case 'NETWORK_GET_DEBUGGER_STATUS':
          sendResponse({ attached: this.debuggerAttached.get(message.tabId) || false });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[NetworkManager] Error handling message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleGetRequestDetails(message: any, sendResponse: (r: any) => void): Promise<void> {
    const requestMap = this.tabRequests.get(message.tabId);
    const request = requestMap?.get(message.requestId);

    let responseBody = this.requestBodies.get(message.requestId);

    if (!responseBody && request && this.debuggerAttached.get(message.tabId)) {
      await this.fetchResponseBody(message.tabId, message.requestId, request.mimeType);
      responseBody = this.requestBodies.get(message.requestId);
    }

    sendResponse({
      request: request || null,
      responseBody: responseBody || null,
    });
  }

  private async handleGetResponseBody(message: any, sendResponse: (r: any) => void): Promise<void> {
    let responseBody = this.requestBodies.get(message.requestId);

    if (!responseBody && this.debuggerAttached.get(message.tabId)) {
      const requestMap = this.tabRequests.get(message.tabId);
      const request = requestMap?.get(message.requestId);

      if (request) {
        await this.fetchResponseBody(message.tabId, message.requestId, request.mimeType);
        responseBody = this.requestBodies.get(message.requestId);
      }
    }

    sendResponse({ responseBody: responseBody || null });
  }

  private async updateCacheSettings(): Promise<void> {
    for (const [tabId, attached] of this.debuggerAttached) {
      if (attached) {
        try {
          await chrome.debugger.sendCommand({ tabId }, 'Network.setCacheDisabled', {
            cacheDisabled: this.settings.disableCache,
          });
        } catch {
          // Tab might be closed
        }
      }
    }
  }

  // ============================================
  // HAR Export
  // ============================================

  private generateHAR(tabId: number): string {
    const requests = this.getRequestsArray(tabId);

    const har = {
      log: {
        version: '1.2',
        creator: { name: 'Request Interceptor', version: '1.0.0' },
        browser: { name: 'Chrome', version: '' },
        pages: [],
        entries: requests.map((req) => {
          const timing = req.timing || {};
          const body = this.requestBodies.get(req.requestId);

          return {
            startedDateTime: new Date(req.startTime).toISOString(),
            time: req.duration || 0,
            request: {
              method: req.method,
              url: req.url,
              httpVersion: req.protocol || 'HTTP/1.1',
              cookies: [],
              headers: req.requestHeaders || [],
              queryString: this.parseQueryString(req.query),
              headersSize: -1,
              bodySize: req.postData ? req.postData.length : 0,
              postData: req.postData
                ? {
                    mimeType:
                      req.requestHeaders?.find(
                        (h) => h.name.toLowerCase() === 'content-type'
                      )?.value || '',
                    text: req.postData,
                  }
                : undefined,
            },
            response: {
              status: req.statusCode || 0,
              statusText: req.statusLine || this.getStatusText(req.statusCode),
              httpVersion: req.protocol || 'HTTP/1.1',
              cookies: [],
              headers: req.responseHeaders || [],
              content: {
                size: req.size || 0,
                mimeType: req.mimeType || 'application/octet-stream',
                compression: (req.size || 0) - (req.encodedSize || 0),
                text: body?.body || '',
              },
              redirectURL: req.redirectedTo || '',
              headersSize: -1,
              bodySize: req.encodedSize || 0,
            },
            cache: {},
            timings: {
              blocked: timing.dnsStart && timing.dnsStart > 0 ? timing.dnsStart : -1,
              dns:
                timing.dnsEnd && timing.dnsStart
                  ? timing.dnsEnd - timing.dnsStart
                  : -1,
              connect:
                timing.connectEnd && timing.connectStart
                  ? timing.connectEnd - timing.connectStart
                  : -1,
              ssl:
                timing.sslEnd && timing.sslStart
                  ? timing.sslEnd - timing.sslStart
                  : -1,
              send:
                timing.sendEnd && timing.sendStart
                  ? timing.sendEnd - timing.sendStart
                  : -1,
              wait:
                timing.receiveHeadersEnd && timing.sendEnd
                  ? timing.receiveHeadersEnd - timing.sendEnd
                  : -1,
              receive:
                req.duration && timing.receiveHeadersEnd
                  ? req.duration - timing.receiveHeadersEnd
                  : -1,
            },
            serverIPAddress: req.ip || '',
            connection: '',
          };
        }),
      },
    };

    return JSON.stringify(har, null, 2);
  }

  private parseQueryString(query: string | undefined): Array<{ name: string; value: string }> {
    if (!query || query === '?') return [];
    try {
      const params = new URLSearchParams(query);
      return Array.from(params.entries()).map(([name, value]) => ({ name, value }));
    } catch {
      return [];
    }
  }

  private getStatusText(code: number | undefined): string {
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
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return texts[code] || '';
  }

  // ============================================
  // Request Replay
  // ============================================

  private async replayRequest(request: NetworkRequest): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      (request.requestHeaders || []).forEach((h) => {
        const name = h.name.toLowerCase();
        if (!['host', 'content-length', 'connection', 'accept-encoding'].includes(name)) {
          headers[h.name] = h.value;
        }
      });

      const options: RequestInit = {
        method: request.method,
        headers,
        mode: 'cors',
        credentials: 'include',
      };

      if (request.postData && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        options.body = request.postData;
      }

      const response = await fetch(request.url, options);
      const text = await response.text();

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: text.substring(0, 50000),
        truncated: text.length > 50000,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ============================================
  // Utilities
  // ============================================

  private headersToArray(headers: any): NetworkHeader[] {
    if (!headers) return [];
    if (Array.isArray(headers)) return headers;
    return Object.entries(headers).map(([name, value]) => ({
      name,
      value: String(value),
    }));
  }
}

// Create and export singleton instance
export const networkManager = new NetworkManager();
