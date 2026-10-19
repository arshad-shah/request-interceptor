/**
 * Network capture via the Chrome Debugger API.
 *
 * Thin service-worker shell: chrome.debugger / tabs / port wiring, the bounded
 * body cache, broadcasting and router registration. Request state is updated
 * by the pure reducer in `src/core/network/`.
 */
import { BodyCache, bodyKey, hasFetchableBody, toRequestSummary } from '@/core/network-buffers';
import { listRequests, reduceNetworkEvent, type TabRequests } from '@/core/network/reducer';
import { buildHar } from '@/core/network/har';
import { buildReplayRequest } from '@/core/network/replay';
import type { MessageRouter } from '@/core/messaging/router';
import { logger } from '@/lib/logger';
import { emit } from '@/lib/messaging';
import {
  NETWORK_PANEL_PORT,
  type NetworkRequest,
  type NetworkSettings,
  type ReplayResult,
  type ResponseBody,
} from '@/types/network';

const log = logger.child('network');

/** Bodies above this are truncated in the cache. */
const MAX_BODY_CHARS = 2 * 1024 * 1024;
const BROADCAST_DEBOUNCE_MS = 100;

export interface NetworkLimits {
  maxRequests: number;
  bodyCacheMB: number;
  webSocketFrames: number;
}

export class NetworkManager {
  private tabRequests = new Map<number, TabRequests>();
  // Limits come from user settings (see configure); defaults match DEFAULT_SETTINGS
  private limits = { maxRequests: 500, webSocketFrames: 500 };
  private requestBodies = new BodyCache({ maxTotalChars: 32 * 1024 * 1024, maxEntryChars: MAX_BODY_CHARS });
  private debuggerAttached = new Map<number, boolean>();
  private pendingBroadcasts = new Map<number, ReturnType<typeof setTimeout>>();
  private settings: NetworkSettings = {
    preserveLog: false,
    recording: true,
    disableCache: false,
    showWaterfall: true,
  };

  constructor() {
    this.setupDebuggerHandlers();
    this.setupTabHandlers();
    this.setupPanelConnections();
  }

  /** Apply capture limits from settings. */
  configure(network: NetworkLimits): void {
    this.limits = { maxRequests: network.maxRequests, webSocketFrames: network.webSocketFrames };
    this.requestBodies.setMaxTotalChars(network.bodyCacheMB * 1024 * 1024);
  }

  // ============================================
  // Chrome wiring
  // ============================================

  private setupDebuggerHandlers(): void {
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (!this.settings.recording || source.tabId === undefined) return;
      this.handleDebuggerEvent(source.tabId, method, params);
    });

    chrome.debugger.onDetach.addListener((source, reason) => {
      const tabId = source.tabId!;
      // delete (not set false): onDetach also fires after tabs.onRemoved
      this.debuggerAttached.delete(tabId);
      log.debug('Debugger detached', { tabId, reason });
      emit('NETWORK_DEBUGGER_DETACHED', { tabId, reason });
    });
  }

  /**
   * The network panel holds a port open while mounted. When the last panel
   * closes, detach so tabs aren't left with a debugger infobar and capture.
   */
  private setupPanelConnections(): void {
    let openPanels = 0;
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name !== NETWORK_PANEL_PORT) return;
      openPanels++;
      port.onDisconnect.addListener(() => {
        openPanels--;
        if (openPanels > 0) return;
        for (const [tabId, attached] of this.debuggerAttached) {
          if (attached) void this.detachDebugger(tabId);
        }
      });
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
      this.requestBodies.deleteTab(tabId);
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

      await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {
        maxTotalBufferSize: 10 * 1024 * 1024,
        maxResourceBufferSize: 5 * 1024 * 1024,
      });

      if (this.settings.disableCache) {
        await chrome.debugger.sendCommand({ tabId }, 'Network.setCacheDisabled', { cacheDisabled: true });
      }

      log.debug('Debugger attached', { tabId });
      emit('NETWORK_DEBUGGER_ATTACHED', { tabId });
      return true;
    } catch (e) {
      log.error('Failed to attach debugger', { tabId, error: String(e) });
      this.debuggerAttached.set(tabId, false);
      emit('NETWORK_DEBUGGER_DETACHED', { tabId, reason: String(e) });
      return false;
    }
  }

  async detachDebugger(tabId: number): Promise<void> {
    if (!this.debuggerAttached.get(tabId)) return;

    // Keep bodies of listed requests: once detached they can't be fetched
    await this.prefetchListedBodies(tabId);
    // Cleared before awaiting so a quick re-attach isn't mistaken for "still attached"
    this.debuggerAttached.set(tabId, false);

    try {
      await chrome.debugger.detach({ tabId });
      log.debug('Debugger detached', { tabId });
    } catch (e) {
      log.warn('Failed to detach debugger', { tabId, error: String(e) });
    }
  }

  private async updateCacheSettings(): Promise<void> {
    for (const [tabId, attached] of this.debuggerAttached) {
      if (!attached) continue;
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Network.setCacheDisabled', {
          cacheDisabled: this.settings.disableCache,
        });
      } catch {
        // Tab might be closed
      }
    }
  }

  // ============================================
  // Request state
  // ============================================

  private handleDebuggerEvent(tabId: number, method: string, params: unknown): void {
    if (tabId < 0) return;
    const store = this.tabRequests.get(tabId) ?? new Map<string, NetworkRequest>();
    const result = reduceNetworkEvent(store, tabId, method, params, this.limits);
    if (!result.changed) return;

    if (!this.tabRequests.has(tabId)) this.tabRequests.set(tabId, store);
    for (const requestId of result.evicted) {
      this.requestBodies.delete(bodyKey(tabId, requestId));
    }
    this.debouncedBroadcast(tabId);
    if (result.prefetch) {
      void this.fetchResponseBody(tabId, result.prefetch.requestId, result.prefetch.mimeType);
    }
  }

  private clearTabRequests(tabId: number): void {
    this.tabRequests.get(tabId)?.clear();
    this.requestBodies.deleteTab(tabId);
    this.broadcastUpdate(tabId);
  }

  /** Request list for the UI: bodies and WebSocket frames are fetched on demand. */
  private getRequestSummaries(tabId: number): NetworkRequest[] {
    return listRequests(this.tabRequests.get(tabId)).map((request) => toRequestSummary(request) as NetworkRequest);
  }

  // ============================================
  // Response bodies
  // ============================================

  private async fetchResponseBody(
    tabId: number,
    requestId: string,
    mimeType?: string
  ): Promise<ResponseBody | undefined> {
    if (!this.debuggerAttached.get(tabId)) return undefined;

    try {
      const result = (await chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', { requestId })) as
        | { body: string; base64Encoded: boolean }
        | undefined;

      // The request may have been cleared or evicted while the body was loading
      if (result && this.tabRequests.get(tabId)?.has(requestId)) {
        // Stored once, in the bounded cache; never embedded in the request object
        return this.requestBodies.set(bodyKey(tabId, requestId), {
          body: result.body,
          base64Encoded: result.base64Encoded,
          mimeType,
        });
      }
    } catch {
      // Body might not be available for some requests
    }
    return undefined;
  }

  private async getOrFetchBody(tabId: number, requestId: string): Promise<ResponseBody | undefined> {
    const cached = this.requestBodies.get(bodyKey(tabId, requestId));
    if (cached) return cached;
    const request = this.tabRequests.get(tabId)?.get(requestId);
    // WebSockets have frames, not a response body
    if (!request || request.type === 'websocket') return undefined;
    return this.fetchResponseBody(tabId, requestId, request.mimeType);
  }

  /** Fetch not-yet-cached bodies for this tab's text-like requests (bounded by the cache). */
  private async prefetchListedBodies(tabId: number): Promise<void> {
    for (const request of listRequests(this.tabRequests.get(tabId))) {
      if (!hasFetchableBody(request)) continue;
      if (this.requestBodies.has(bodyKey(tabId, request.requestId))) continue;
      await this.fetchResponseBody(tabId, request.requestId, request.mimeType);
    }
  }

  // ============================================
  // HAR export & replay
  // ============================================

  private async exportHar(tabId: number): Promise<string> {
    const requests = listRequests(this.tabRequests.get(tabId));
    const bodies = new Map<string, ResponseBody | undefined>();
    for (const req of requests) {
      // Cached bodies for everything; fetch only text-like ones (not images/fonts/media)
      const cached = this.requestBodies.get(bodyKey(tabId, req.requestId));
      bodies.set(
        req.requestId,
        cached ?? (hasFetchableBody(req) ? await this.getOrFetchBody(tabId, req.requestId) : undefined)
      );
    }
    return JSON.stringify(buildHar(requests, bodies), null, 2);
  }

  private async replayRequest(request: NetworkRequest): Promise<ReplayResult> {
    try {
      const { url, init } = buildReplayRequest(request);
      const response = await fetch(url, init);
      const text = await response.text();
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: text,
        truncated: false,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ============================================
  // Broadcasting & messages
  // ============================================

  /**
   * Coalesce updates into at most one broadcast per interval. An already
   * scheduled broadcast is kept (not reset), so constant traffic can't
   * starve the UI of updates.
   */
  private debouncedBroadcast(tabId: number): void {
    if (this.pendingBroadcasts.has(tabId)) return;

    this.pendingBroadcasts.set(
      tabId,
      setTimeout(() => {
        this.broadcastUpdate(tabId);
        this.pendingBroadcasts.delete(tabId);
      }, BROADCAST_DEBOUNCE_MS)
    );
  }

  private broadcastUpdate(tabId: number): void {
    emit('NETWORK_REQUESTS_UPDATED', { tabId, requests: this.getRequestSummaries(tabId) });
  }

  /** Register this manager's requests on the background router. */
  register(router: MessageRouter): void {
    router
      .on('NETWORK_GET_REQUESTS', ({ tabId }) => ({
        requests: this.getRequestSummaries(tabId),
        settings: this.settings,
        attached: this.debuggerAttached.get(tabId) || false,
      }))
      .on('NETWORK_GET_REQUEST_DETAILS', async ({ tabId, requestId }) => {
        const request = this.tabRequests.get(tabId)?.get(requestId);
        const responseBody = request ? await this.getOrFetchBody(tabId, requestId) : undefined;
        return { request: request ?? null, responseBody: responseBody ?? null };
      })
      .on('NETWORK_GET_RESPONSE_BODY', async ({ tabId, requestId }) => (await this.getOrFetchBody(tabId, requestId)) ?? null)
      .on('NETWORK_CLEAR_REQUESTS', ({ tabId }) => this.clearTabRequests(tabId))
      .on('NETWORK_UPDATE_SETTINGS', async ({ settings }) => {
        this.settings = { ...this.settings, ...settings };
        if ('disableCache' in settings) await this.updateCacheSettings();
        return this.settings;
      })
      .on('NETWORK_GET_SETTINGS', () => this.settings)
      .on('NETWORK_EXPORT_HAR', ({ tabId }) => this.exportHar(tabId))
      .on('NETWORK_REPLAY_REQUEST', ({ request }) => this.replayRequest(request))
      .on('NETWORK_ATTACH_DEBUGGER', ({ tabId }) => this.attachDebugger(tabId))
      .on('NETWORK_DETACH_DEBUGGER', ({ tabId }) => this.detachDebugger(tabId))
      .on('NETWORK_GET_DEBUGGER_STATUS', ({ tabId }) => this.debuggerAttached.get(tabId) || false);
  }
}

export const networkManager = new NetworkManager();
