// Injected script — thin IIFE shell that delegates to core interceptor modules.
// Vite inlines all imports at build time since this is a separate entry point.

import { setupFetchInterceptor } from './core/interceptors/fetch-interceptor';
import { setupXHRInterceptor } from './core/interceptors/xhr-interceptor';
import { setupWebSocketInterceptor } from './core/interceptors/ws-interceptor';
import { parseRouteKeyInline, parseWebSocketKeyInline } from './core/interceptors/interceptor-helpers';
import { serializeEventData } from './core/event-serialization';

(function() {
  // Store original methods
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  const originalWebSocket = window.WebSocket;

  const EVT_DEBUG = true;

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
        case 'enableEventMonitor': eventMonitorActive = true; log('EventBus monitor enabled'); break;
        case 'disableEventMonitor': eventMonitorActive = false; log('EventBus monitor disabled'); break;
      }
    }
  });

  console.log('[Request Interceptor] Complete script injected with HTTP, Headers-Only, and WebSocket support');

  // ================================================
  // EventBus Monitor — intercepts CustomEvent, postMessage, EventEmitter patterns
  // ================================================
  const EVENTBUS_CHANNEL = 'eventbus-monitor-channel';
  const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
  const originalWindowPostMessage = window.postMessage;
  let eventMonitorId = 0;
  let eventMonitorActive = false;

  function generateEventId() {
    return `evt_${Date.now()}_${++eventMonitorId}`;
  }

  function getEventStackTrace() {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(3, 8).join('\n') : '';
  }

  function sendEventToExtension(data: any) {
    if (!eventMonitorActive) return;
    if (EVT_DEBUG) {
      let bytes = 0;
      try { bytes = JSON.stringify(data).length; } catch (_e) { /* ignore */ }
      console.log('[EVT-2] injected:send', { category: data.category, eventType: data.eventType, payloadBytes: bytes });
    }
    originalWindowPostMessage.call(window, { type: EVENTBUS_CHANNEL, payload: data }, { targetOrigin: '*' });
  }

  // Patch dispatchEvent for CustomEvent interception
  EventTarget.prototype.dispatchEvent = function(event: Event) {
    if (EVT_DEBUG) console.log('[EVT-1] injected:dispatch', { trigger: 'dispatchEvent', type: event.type, active: eventMonitorActive });
    if (event instanceof CustomEvent ||
        (event.type && !event.type.startsWith('mouse') && !event.type.startsWith('key') &&
         !event.type.startsWith('pointer') && !event.type.startsWith('focus') &&
         !event.type.startsWith('blur') && !event.type.startsWith('scroll') &&
         !event.type.startsWith('touch'))) {
      sendEventToExtension({
        id: generateEventId(),
        timestamp: Date.now(),
        category: 'CustomEvent',
        eventType: event.type,
        data: serializeEventData(event),
        target: this === window ? 'window' : this === document ? 'document' : ((this as any).tagName || 'unknown'),
        stack: getEventStackTrace(),
      });
    }
    return originalDispatchEvent.call(this, event);
  };

  // Patch postMessage for cross-frame communication interception
  (window as any).postMessage = function(message: any, optionsOrOrigin?: any, transfer?: any) {
    if (EVT_DEBUG) console.log('[EVT-1] injected:dispatch', { trigger: 'postMessage', type: message?.type, active: eventMonitorActive });
    if (message && message.type !== EVENTBUS_CHANNEL && message.type !== 'REQUEST_INTERCEPTOR_COMMAND' && message.type !== 'REQUEST_INTERCEPTOR_LOG') {
      const target = typeof optionsOrOrigin === 'string' ? optionsOrOrigin : (optionsOrOrigin?.targetOrigin || '*');
      sendEventToExtension({
        id: generateEventId(),
        timestamp: Date.now(),
        category: 'postMessage',
        eventType: 'message',
        data: serializeEventData(message),
        target,
        stack: getEventStackTrace(),
      });
    }
    // Forward to original — use Function.prototype.apply to bypass strict TS overloads
    const args = transfer !== undefined ? [message, optionsOrOrigin, transfer] : optionsOrOrigin !== undefined ? [message, optionsOrOrigin] : [message];
    return (originalWindowPostMessage as Function).apply(this, args);
  };

  // Hook EventEmitter patterns on global objects
  function hookEventEmitter(obj: any, name: string) {
    if (!obj || typeof obj !== 'object') return;
    const emitMethods = ['emit', '$emit', 'trigger', 'fire', 'publish', 'dispatch', 'broadcast', 'send'];
    for (const method of emitMethods) {
      if (typeof obj[method] === 'function' && !obj[method].__eventbus_hooked) {
        const original = obj[method];
        obj[method] = function(eventName: string, ...args: any[]) {
          if (EVT_DEBUG) console.log('[EVT-1] injected:dispatch', { trigger: 'EventEmitter', type: eventName, active: eventMonitorActive });
          sendEventToExtension({
            id: generateEventId(),
            timestamp: Date.now(),
            category: 'EventEmitter',
            eventType: String(eventName),
            data: serializeEventData(args.length === 1 ? args[0] : args),
            target: name,
            stack: getEventStackTrace(),
          });
          return original.apply(this, [eventName, ...args]);
        };
        obj[method].__eventbus_hooked = true;
      }
    }
  }

  // Scan for global EventBus instances
  const busNames = ['EventBus', 'eventBus', 'bus', '$bus', 'emitter', 'EventEmitter', 'pubsub', 'PubSub', 'mediator', 'Mediator', 'dispatcher', 'Dispatcher'];
  function scanForBuses() {
    for (const name of busNames) {
      if ((window as any)[name]) hookEventEmitter((window as any)[name], name);
    }
    if ((window as any).Vue && (window as any).Vue.prototype) hookEventEmitter((window as any).Vue.prototype, 'Vue');
    if ((window as any).app && (window as any).app.$bus) hookEventEmitter((window as any).app.$bus, 'app.$bus');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanForBuses);
  } else {
    scanForBuses();
  }
  setTimeout(scanForBuses, 1000);
  setTimeout(scanForBuses, 3000);
  setTimeout(scanForBuses, 5000);

  // EventBus monitor patches are installed but inactive by default.
  // Activation is controlled via 'enableEventMonitor' command from content script.
})();

export {};
