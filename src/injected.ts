// Injected script — thin IIFE shell that delegates to core interceptor modules.
// Vite inlines all imports at build time since this is a separate entry point.

import { setupFetchInterceptor } from './core/interceptors/fetch-interceptor';
import { setupXHRInterceptor } from './core/interceptors/xhr-interceptor';
import { setupWebSocketInterceptor } from './core/interceptors/ws-interceptor';
import { parseRouteKeyInline, parseWebSocketKeyInline } from './core/interceptors/interceptor-helpers';

(function() {
  // Store original methods
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  const originalWebSocket = window.WebSocket;

  // Internal state
  let isActive = false;
  let interceptedRoutes: Record<string, any> = {};
  let interceptedWebSockets: Record<string, any> = {};
  const activeWebSockets: Map<WebSocket, any> = new Map();

  function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [Request Interceptor] ${message}`;

    switch (level) {
      case 'warn': console.warn(logMessage); break;
      case 'error': console.error(logMessage); break;
      default: console.log(logMessage);
    }

    window.postMessage({
      type: 'REQUEST_INTERCEPTOR_LOG',
      message,
      level,
      timestamp
    }, '*');
  }

  // State accessors for interceptor modules
  const fetchState = {
    isActive: () => isActive,
    getRoutes: () => interceptedRoutes
  };
  const xhrState = fetchState;
  const wsState = {
    getWebSocketRoutes: () => interceptedWebSockets
  };

  function init() {
    setupFetchInterceptor(fetchState, log, originalFetch);
    setupXHRInterceptor(xhrState, log, originalXHROpen, originalXHRSend, originalXHRSetRequestHeader);
    setupWebSocketInterceptor(wsState, log, originalWebSocket, activeWebSockets);
    log('Request Interceptor initialized with full support');
  }

  function destroy() {
    (window as any).fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXHROpen;
    XMLHttpRequest.prototype.send = originalXHRSend;
    XMLHttpRequest.prototype.setRequestHeader = originalXHRSetRequestHeader;
    (window as any).WebSocket = originalWebSocket;
    activeWebSockets.clear();
    isActive = false;
    log('Request Interceptor destroyed');
  }

  const RequestInterceptor = {
    initialize(routes: Record<string, any>) {
      interceptedRoutes = {};
      interceptedWebSockets = {};

      Object.keys(routes || {}).forEach(key => {
        if (key.startsWith('WS:')) {
          interceptedWebSockets[key] = routes[key];
        } else if (key.startsWith('INJ:')) {
          // Injection routes handled by content script
        } else {
          interceptedRoutes[key] = routes[key];
        }
      });

      isActive = true;
      init();

      const httpRoutes = Object.keys(interceptedRoutes).length;
      const wsRoutes = Object.keys(interceptedWebSockets).length;
      log(`Request Interceptor activated with ${httpRoutes} HTTP routes and ${wsRoutes} WebSocket routes`);

      // Debug logging
      Object.keys(interceptedRoutes).forEach(key => {
        const config = interceptedRoutes[key];
        const { method, url, name } = parseRouteKeyInline(key);
        const isEnabled = config.enabled === true || config.enabled === undefined || config.enabled !== false;
        const hasResponse = config.response !== undefined && config.response !== null && config.response !== '';
        const hasHeaders = (config.responseHeaders && Object.keys(config.responseHeaders).length > 0) ||
                          (config.requestHeaders && Object.keys(config.requestHeaders).length > 0) ||
                          (config.removeRequestHeaders && config.removeRequestHeaders.length > 0);
        const mode = config.interceptionMode || (config.headersOnly || (!hasResponse && hasHeaders) ? 'passthrough' : 'mock');
        log(`HTTP Route: ${method} ${url} ${name ? `(${name})` : ''} - ${isEnabled ? 'ENABLED' : 'DISABLED'} - Mode: ${mode}`);
      });

      Object.keys(interceptedWebSockets).forEach(key => {
        const config = interceptedWebSockets[key];
        try {
          const { url, name } = parseWebSocketKeyInline(key);
          const isEnabled = config.enabled === true || config.enabled === undefined || config.enabled !== false;
          const incomingRules = (config.incomingRules || []).filter((r: any) => r.enabled).length;
          const outgoingRules = (config.outgoingRules || []).filter((r: any) => r.enabled).length;
          log(`WebSocket Route: ${url} ${name ? `(${name})` : ''} - ${isEnabled ? 'ENABLED' : 'DISABLED'} - Rules: ${incomingRules} incoming, ${outgoingRules} outgoing`);
        } catch (error) {
          log(`Invalid WebSocket route key: ${key}`, 'error');
        }
      });
    },

    updateRoutes(routes: Record<string, any>) {
      this.initialize(routes);
    },

    enable() {
      isActive = true;
      log('Request Interceptor enabled');
    },

    disable() {
      isActive = false;
      log('Request Interceptor disabled');
    },

    destroy
  };

  (window as any).__requestInterceptor = RequestInterceptor;

  // Listen for commands from the content script
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'REQUEST_INTERCEPTOR_COMMAND') {
      const { command, routes } = event.data;

      switch (command) {
        case 'initialize': RequestInterceptor.initialize(routes); break;
        case 'updateRoutes': RequestInterceptor.updateRoutes(routes); break;
        case 'enable': RequestInterceptor.enable(); break;
        case 'disable': RequestInterceptor.disable(); break;
        case 'destroy': RequestInterceptor.destroy(); break;
      }
    }
  });

  console.log('[Request Interceptor] Complete script injected with HTTP, Headers-Only, and WebSocket support');
})();

export {};
