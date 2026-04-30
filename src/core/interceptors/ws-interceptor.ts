/**
 * WebSocket interceptor setup.
 * Wraps window.WebSocket to intercept connections and messages.
 */

import { urlMatches } from '../url-matching';
import { parseWebSocketKeyInline, escapeRegExp, type LogFn } from './interceptor-helpers';

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

  let processedMessage = message;
  let injectedMessage: any = null;

  // Convert to string for processing
  if (typeof processedMessage !== 'string') {
    if (processedMessage instanceof ArrayBuffer) {
      processedMessage = new TextDecoder().decode(processedMessage);
    } else if (processedMessage instanceof Blob) {
      return { result: processedMessage, blocked: false };
    } else if (typeof processedMessage === 'object') {
      try { processedMessage = JSON.stringify(processedMessage); } catch { processedMessage = String(processedMessage); }
    } else {
      processedMessage = String(processedMessage);
    }
  }

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
            processedMessage = applyReplacement(processedMessage, rule, log);
            log(`WebSocket ${direction} message replaced: ${rule.description || 'No description'}`);
            break;
          case 'block':
            log(`WebSocket ${direction} message blocked: ${rule.description || 'No description'}`);
            return { result: null, blocked: true };
          case 'inject':
            injectedMessage = rule.replacement;
            log(`WebSocket ${direction} message injection triggered: ${rule.description || 'No description'}`);
            break;
        }
      }
    } catch (error) {
      log(`Error processing WebSocket rule "${rule.description || rule.id}": ${error}`, 'error');
    }
  }

  return { result: processedMessage, blocked: false, injected: injectedMessage };
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

      // Proxy read-only properties
      ['url', 'readyState', 'bufferedAmount', 'extensions', 'protocol'].forEach(prop => {
        Object.defineProperty(interceptedWs, prop, {
          get() { return (realWs as any)[prop]; },
          configurable: true
        });
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
      ['onopen', 'onclose', 'onerror', 'onmessage'].forEach(prop => {
        Object.defineProperty(interceptedWs, prop, {
          get() { return (realWs as Record<string, any>)[prop]; },
          set(handler) {
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
      interceptedWs.addEventListener = function(type: string, listener: any, options?: any) {
        if (type === 'message' && listener) {
          return realWs.addEventListener(type, interceptIncomingMessage(listener), options);
        }
        return realWs.addEventListener(type, listener ? listener.bind(interceptedWs) : listener, options);
      };

      interceptedWs.removeEventListener = function(type: string, listener: any, options?: any) {
        return realWs.removeEventListener(type, listener, options);
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

  // Copy static properties
  (window as any).WebSocket.CONNECTING = 0;
  (window as any).WebSocket.OPEN = 1;
  (window as any).WebSocket.CLOSING = 2;
  (window as any).WebSocket.CLOSED = 3;
}
