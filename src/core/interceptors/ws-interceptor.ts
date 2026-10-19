/**
 * WebSocket interceptor setup.
 * Wraps window.WebSocket to intercept connections and messages.
 */

import { urlMatches } from '../url-matching';
import { parseWebSocketKeyInline, escapeRegExp, type LogFn } from './interceptor-helpers';
import { pageToast } from '../notifications/page-toast';

export interface WSInterceptorState {
  getWebSocketRoutes: () => Record<string, any>;
}

/** Validate a WebSocket rule */
function validateWebSocketRule(rule: any): { valid: boolean; error?: string } {
  if (!rule || typeof rule !== 'object') {
    return { valid: false, error: 'Rule must be an object' };
  }
  if (!rule.match || rule.match.trim() === '') {
    return { valid: false, error: 'Match pattern is required' };
  }
  if (rule.type !== 'block' && (!rule.replacement || rule.replacement.trim() === '')) {
    return { valid: false, error: 'Replacement text is required for replace and inject rules' };
  }
  if (rule.matchType === 'regex') {
    try {
      new RegExp(rule.match, rule.flags || '');
    } catch (error) {
      return { valid: false, error: `Invalid regex pattern: ${error}` };
    }
  }
  return { valid: true };
}

/** Check if a rule matches a message */
function checkRuleMatch(message: string, rule: any, log: LogFn): boolean {
  switch (rule.matchType) {
    case 'exact':
      if (message === rule.match) return true;
      return message.includes(rule.match);
    case 'contains':
      return message.includes(rule.match);
    case 'regex':
      try {
        const flags = rule.flags || 'g';
        return new RegExp(rule.match, flags).test(message);
      } catch (error) {
        log(`Invalid regex in rule "${rule.description || rule.id}": ${error}`, 'error');
        return false;
      }
    default:
      return false;
  }
}

/** Apply rule replacement to a message */
function applyReplacement(message: string, rule: any, log: LogFn): string {
  switch (rule.matchType) {
    case 'exact':
      return message === rule.match ? (rule.replacement || '') : message;
    case 'contains':
      return message.replace(new RegExp(escapeRegExp(rule.match), 'g'), rule.replacement || '');
    case 'regex':
      try {
        return message.replace(new RegExp(rule.match, rule.flags || 'g'), rule.replacement || '');
      } catch (error) {
        log(`Error applying regex replacement: ${error}`, 'error');
        return message;
      }
    default:
      return message;
  }
}

/** Process a WebSocket message through rules */
export function processMessage(
  message: any,
  config: any,
  direction: 'incoming' | 'outgoing',
  log: LogFn
): { result: any; blocked: boolean; injected?: any } {
  if (!config) return { result: message, blocked: false };

  const rules = direction === 'incoming' ? config.incomingRules : config.outgoingRules;
  if (!rules || rules.length === 0) return { result: message, blocked: false };

  let processedMessage: string;
  let injectedMessage: any = null;

  // Rules match text. Binary frames are decoded only for matching and are
  // forwarded unchanged (still binary) unless a rule actually rewrites them.
  if (typeof message === 'string') {
    processedMessage = message;
  } else if (message instanceof ArrayBuffer || ArrayBuffer.isView(message)) {
    processedMessage = new TextDecoder().decode(message as ArrayBuffer | ArrayBufferView);
  } else if (message instanceof Blob) {
    return { result: message, blocked: false };
  } else {
    processedMessage = String(message);
  }
  let rewritten = false;

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const validation = validateWebSocketRule(rule);
    if (!validation.valid) {
      log(`Skipping invalid rule: ${validation.error}`, 'warn');
      continue;
    }

    try {
      if (checkRuleMatch(processedMessage, rule, log)) {
        switch (rule.type) {
          case 'replace':
            {
              const replaced = applyReplacement(processedMessage, rule, log);
              rewritten ||= replaced !== processedMessage;
              processedMessage = replaced;
            }
            log(`WebSocket ${direction} message replaced: ${rule.description || 'No description'}`);
            pageToast(`WS ${direction} replaced`, 'info', { detail: rule.description, event: 'websocket' });
            break;
          case 'block':
            log(`WebSocket ${direction} message blocked: ${rule.description || 'No description'}`);
            pageToast(`WS ${direction} blocked`, 'error', { detail: rule.description, event: 'websocket' });
            return { result: null, blocked: true };
          case 'inject':
            injectedMessage = rule.replacement;
            log(`WebSocket ${direction} message injection triggered: ${rule.description || 'No description'}`);
            pageToast(`WS ${direction} injected`, 'info', { detail: rule.description, event: 'websocket' });
            break;
        }
      }
    } catch (error) {
      log(`Error processing WebSocket rule "${rule.description || rule.id}": ${error}`, 'error');
    }
  }

  return {
    result: rewritten || typeof message === 'string' ? processedMessage : message,
    blocked: false,
    injected: injectedMessage,
  };
}

/** Check if a WebSocket URL should be intercepted */
function shouldInterceptWebSocket(url: string, wsRoutes: Record<string, any>, log: LogFn): string | null {
  log(`Checking WebSocket interception for: ${url}`);

  const enabledRoutes = Object.keys(wsRoutes).filter(key => {
    const config = wsRoutes[key];
    return (config.enabled !== false) && key.startsWith('WS:');
  });

  log(`Enabled WebSocket routes: ${enabledRoutes.length}`);

  for (const routeKey of enabledRoutes) {
    try {
      const { url: routeUrl } = parseWebSocketKeyInline(routeKey);
      log(`Checking WebSocket route: ${routeUrl} (${routeKey})`);
      if (urlMatches(url, routeUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')) {
        log(`✓ Found matching WebSocket route: ${routeKey}`);
        return routeKey;
      }
    } catch (error) {
      log(`Error parsing WebSocket route key "${routeKey}": ${error}`, 'error');
    }
  }

  log(`No matching WebSocket route found for: ${url}`);
  return null;
}

/**
 * Set up WebSocket interception.
 */
export function setupWebSocketInterceptor(
  state: WSInterceptorState,
  log: LogFn,
  originalWebSocket: typeof WebSocket,
  activeWebSockets: Map<WebSocket, any>
): void {
  (window as any).WebSocket = function(url: string | URL, protocols?: string | string[]) {
    const wsUrl = String(url);
    const routeKey = shouldInterceptWebSocket(wsUrl, state.getWebSocketRoutes(), log);

    if (routeKey) {
      log(`✓ Intercepting WebSocket: ${wsUrl} with route: ${routeKey}`);
      const config = state.getWebSocketRoutes()[routeKey];

      const realWs = new originalWebSocket(wsUrl, protocols);
      const interceptedWs = Object.create(originalWebSocket.prototype);

      activeWebSockets.set(interceptedWs, { config, realWs, url: wsUrl });
      // Forget the socket however it closes (server, network or page)
      realWs.addEventListener('close', () => activeWebSockets.delete(interceptedWs));

      // Proxy read-only properties
      ['url', 'readyState', 'bufferedAmount', 'extensions', 'protocol'].forEach(prop => {
        Object.defineProperty(interceptedWs, prop, {
          get() { return (realWs as any)[prop]; },
          configurable: true
        });
      });

      Object.defineProperty(interceptedWs, 'binaryType', {
        get() { return realWs.binaryType; },
        set(value: BinaryType) { realWs.binaryType = value; },
        configurable: true
      });

      // Incoming message interceptor
      const interceptIncomingMessage = (originalHandler: (event: MessageEvent) => void) => {
        return function(event: MessageEvent) {
          log(`WebSocket incoming message: ${event.data}`);
          const result = processMessage(event.data, config, 'incoming', log);

          if (result.blocked) {
            log(`WebSocket incoming message blocked`);
            return;
          }

          if (result.injected) {
            log(`WebSocket injecting incoming message: ${result.injected}`);
            const injectedEvent = new MessageEvent('message', {
              data: result.injected,
              origin: event.origin,
              lastEventId: event.lastEventId,
              source: event.source,
              ports: [...event.ports]
            });
            originalHandler.call(interceptedWs, injectedEvent);
          }

          if (result.result !== null) {
            const newEvent = new MessageEvent('message', {
              data: result.result,
              origin: event.origin,
              lastEventId: event.lastEventId,
              source: event.source,
              ports: [...event.ports]
            });
            originalHandler.call(interceptedWs, newEvent);
          }
        };
      };

      // Proxy send
      interceptedWs.send = function(data: any) {
        log(`WebSocket outgoing message: ${data}`);
        const result = processMessage(data, config, 'outgoing', log);

        if (result.blocked) {
          log(`WebSocket outgoing message blocked`);
          return;
        }

        if (result.injected) {
          log(`WebSocket injecting outgoing message: ${result.injected}`);
          realWs.send(result.injected);
        }

        if (result.result !== null) {
          realWs.send(result.result);
        }
      };

      interceptedWs.close = function(code?: number, reason?: string) {
        activeWebSockets.delete(interceptedWs);
        return realWs.close(code, reason);
      };

      // Proxy event handlers
      const pageHandlers: Record<string, any> = {};
      ['onopen', 'onclose', 'onerror', 'onmessage'].forEach(prop => {
        Object.defineProperty(interceptedWs, prop, {
          get() { return pageHandlers[prop] ?? null; },
          set(handler) {
            pageHandlers[prop] = handler;
            if (prop === 'onmessage' && handler) {
              realWs[prop] = interceptIncomingMessage(handler);
            } else {
              (realWs as any)[prop] = handler ? handler.bind(interceptedWs) : handler;
            }
          },
          configurable: true
        });
      });

      // Proxy addEventListener/removeEventListener
      // Wrapped listeners are remembered per (listener, type) so removal works
      const wrappedListeners = new WeakMap<object, Map<string, any>>();
      const wrapListener = (type: string, listener: any) => {
        let byType = wrappedListeners.get(listener);
        if (!byType) {
          byType = new Map();
          wrappedListeners.set(listener, byType);
        }
        let wrapped = byType.get(type);
        if (!wrapped) {
          const call = typeof listener === 'function'
            ? (event: Event) => listener.call(interceptedWs, event)
            : (event: Event) => listener.handleEvent(event);
          wrapped = type === 'message' ? interceptIncomingMessage(call) : call;
          byType.set(type, wrapped);
        }
        return wrapped;
      };

      interceptedWs.addEventListener = function(type: string, listener: any, options?: any) {
        if (!listener) return realWs.addEventListener(type, listener, options);
        return realWs.addEventListener(type, wrapListener(type, listener), options);
      };

      interceptedWs.removeEventListener = function(type: string, listener: any, options?: any) {
        const wrapped = listener ? wrappedListeners.get(listener)?.get(type) : undefined;
        return realWs.removeEventListener(type, wrapped ?? listener, options);
      };

      interceptedWs.dispatchEvent = function(event: Event) {
        return realWs.dispatchEvent(event);
      };

      // Constants
      Object.defineProperty(interceptedWs, 'CONNECTING', { value: 0, writable: false });
      Object.defineProperty(interceptedWs, 'OPEN', { value: 1, writable: false });
      Object.defineProperty(interceptedWs, 'CLOSING', { value: 2, writable: false });
      Object.defineProperty(interceptedWs, 'CLOSED', { value: 3, writable: false });

      return interceptedWs;
    }

    log(`→ Not intercepting WebSocket: ${wsUrl}`);
    return new originalWebSocket(url, protocols);
  };

  // Keep `ws instanceof WebSocket` true for intercepted and native sockets
  (window as any).WebSocket.prototype = originalWebSocket.prototype;

  // Copy static properties
  (window as any).WebSocket.CONNECTING = 0;
  (window as any).WebSocket.OPEN = 1;
  (window as any).WebSocket.CLOSING = 2;
  (window as any).WebSocket.CLOSED = 3;
}
