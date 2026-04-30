/**
 * Single source of truth for route key parsing and creation.
 * Route key formats:
 *   HTTP:      METHOD:URL  or  METHOD:URL|NAME
 *   WebSocket: WS:URL     or  WS:URL|NAME
 *   Injection: INJ:URL    or  INJ:URL|NAME
 */

export interface ParsedRouteKey {
  method: string;
  url: string;
  name: string;
}

export interface ParsedWebSocketKey {
  url: string;
  name: string;
}

export interface ParsedInjectionKey {
  urlPattern: string;
  name: string;
}

/** Parse an HTTP route key like "GET:/api/users" or "POST:/api/users|Create User" */
export function parseRouteKey(routeKey: string): ParsedRouteKey {
  const firstColonIndex = routeKey.indexOf(':');
  if (firstColonIndex === -1) {
    return { method: 'GET', url: routeKey, name: '' };
  }

  const method = routeKey.substring(0, firstColonIndex);
  const remaining = routeKey.substring(firstColonIndex + 1);

  const pipeIndex = remaining.indexOf('|');
  if (pipeIndex === -1) {
    return { method, url: remaining, name: '' };
  }

  const url = remaining.substring(0, pipeIndex);
  const name = remaining.substring(pipeIndex + 1);

  return { method, url, name };
}

/** Create an HTTP route key from components */
export function createRouteKey(method: string, url: string, name?: string): string {
  if (name) {
    return `${method}:${url}|${name}`;
  }
  return `${method}:${url}`;
}

/** Parse a WebSocket route key like "WS:wss://example.com" or "WS:wss://example.com|My WS" */
export function parseWebSocketKey(routeKey: string): ParsedWebSocketKey {
  if (!routeKey.startsWith('WS:')) {
    throw new Error('Invalid WebSocket route key: must start with "WS:"');
  }

  const remaining = routeKey.substring(3);
  const pipeIndex = remaining.indexOf('|');

  if (pipeIndex === -1) {
    return { url: remaining, name: '' };
  }

  const url = remaining.substring(0, pipeIndex);
  const name = remaining.substring(pipeIndex + 1);

  return { url, name };
}

/** Create a WebSocket route key from components */
export function createWebSocketKey(url: string, name?: string): string {
  if (name) {
    return `WS:${url}|${name}`;
  }
  return `WS:${url}`;
}

/** Parse an injection route key like "INJ:https://example.com/*" or "INJ:https://example.com/*|My Injection" */
export function parseInjectionKey(routeKey: string): ParsedInjectionKey {
  if (!routeKey.startsWith('INJ:')) {
    throw new Error('Invalid injection route key: must start with "INJ:"');
  }

  const remaining = routeKey.substring(4);
  const pipeIndex = remaining.indexOf('|');

  if (pipeIndex === -1) {
    return { urlPattern: remaining, name: '' };
  }

  const urlPattern = remaining.substring(0, pipeIndex);
  const name = remaining.substring(pipeIndex + 1);

  return { urlPattern, name };
}

/** Create an injection route key from components */
export function createInjectionKey(urlPattern: string, name?: string): string {
  if (name) {
    return `INJ:${urlPattern}|${name}`;
  }
  return `INJ:${urlPattern}`;
}

/** Check if a route key is a WebSocket route */
export function isWebSocketRoute(key: string): boolean {
  return key.startsWith('WS:');
}

/** Check if a route key is an injection route */
export function isInjectionRoute(key: string): boolean {
  return key.startsWith('INJ:');
}

/** Check if a route key is an HTTP route */
export function isHttpRoute(key: string): boolean {
  return !key.startsWith('WS:') && !key.startsWith('INJ:');
}
