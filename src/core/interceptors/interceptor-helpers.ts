/**
 * Shared helper functions for fetch/XHR/WebSocket interceptors.
 * These run in the page context (injected script).
 */

import { urlMatches } from '../url-matching';
import { matchesGraphqlOperation } from '../graphql';
import { applyQueryParamRules as applyQPRules } from '../query-params';
import type { QueryParamRule } from '@/types';

// Re-export for use in injected.ts
export { applyQPRules as applyQueryParamRules };

export type InterceptionMode = 'mock' | 'passthrough' | 'block' | 'redirect';

export type LogFn = (message: string, level?: 'info' | 'warn' | 'error') => void;

export interface InterceptResult {
  routeKey: string;
  mode: InterceptionMode;
}

/**
 * Parse a route key into method, url, name — inline version for injected context.
 */
export function parseRouteKeyInline(routeKey: string): { method: string; url: string; name?: string } {
  const firstColonIndex = routeKey.indexOf(':');
  if (firstColonIndex === -1) return { method: 'GET', url: routeKey };

  const method = routeKey.substring(0, firstColonIndex);
  const remaining = routeKey.substring(firstColonIndex + 1);

  const pipeIndex = remaining.indexOf('|');
  if (pipeIndex === -1) {
    return { method, url: remaining };
  }

  return {
    method,
    url: remaining.substring(0, pipeIndex),
    name: remaining.substring(pipeIndex + 1)
  };
}

/**
 * Parse a WebSocket route key — inline version for injected context.
 */
export function parseWebSocketKeyInline(routeKey: string): { url: string; name: string } {
  if (!routeKey.startsWith('WS:')) {
    throw new Error('Invalid WebSocket route key');
  }
  const remaining = routeKey.substring(3);
  const pipeIndex = remaining.indexOf('|');
  if (pipeIndex === -1) {
    return { url: remaining, name: '' };
  }
  return {
    url: remaining.substring(0, pipeIndex),
    name: remaining.substring(pipeIndex + 1)
  };
}

/**
 * Check if a request should be intercepted based on configured routes.
 */
export function shouldIntercept(
  method: string,
  url: string,
  routes: Record<string, any>,
  log: LogFn,
  requestBody?: any
): InterceptResult | null {
  const normalizedMethod = method.toUpperCase();

  log(`Checking interception for: ${normalizedMethod} ${url}`);
  log(`Available routes: ${Object.keys(routes).length}`);

  const enabledRoutes = Object.keys(routes).filter(key => {
    const config = routes[key];
    return config.enabled === true || config.enabled === undefined || config.enabled !== false;
  });

  log(`Enabled routes: ${enabledRoutes.length} of ${Object.keys(routes).length}`);

  const matchingRoutes: string[] = [];

  for (const routeKey of enabledRoutes) {
    const { method: routeMethod, url: routeUrl } = parseRouteKeyInline(routeKey);

    if (routeMethod !== normalizedMethod) continue;

    if (urlMatches(url, routeUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')) {
      const config = routes[routeKey];

      if (config.graphqlOperationName) {
        if (!matchesGraphqlOperation(requestBody, config.graphqlOperationName)) {
          log(`GraphQL operation name mismatch for route: ${routeKey}`);
          continue;
        }
      }

      log(`✓ URL matches for route: ${routeKey}`);
      matchingRoutes.push(routeKey);
    }
  }

  if (matchingRoutes.length === 0) {
    log(`No matching route found for: ${normalizedMethod} ${url}`);
    return null;
  }

  // Prefer named routes over simple routes
  let selectedRoute: string;
  if (matchingRoutes.length > 1) {
    const namedRoutes = matchingRoutes.filter(key => key.includes('|'));
    selectedRoute = namedRoutes.length > 0 ? namedRoutes[0] : matchingRoutes[0];
    log(`✓ Selected route: ${selectedRoute}`);
  } else {
    selectedRoute = matchingRoutes[0];
    log(`✓ Found matching route: ${selectedRoute}`);
  }

  const config = routes[selectedRoute];

  let mode: InterceptionMode;
  if (config.interceptionMode) {
    mode = config.interceptionMode;
  } else {
    const hasResponse = config.response !== undefined && config.response !== null && config.response !== '';
    const hasHeaders = (config.responseHeaders && Object.keys(config.responseHeaders).length > 0) ||
                      (config.requestHeaders && Object.keys(config.requestHeaders).length > 0) ||
                      (config.removeRequestHeaders && config.removeRequestHeaders.length > 0);
    mode = config.headersOnly || (!hasResponse && hasHeaders) ? 'passthrough' : 'mock';
  }

  log(`Interception mode: ${mode}`);
  return { routeKey: selectedRoute, mode };
}

/** Get status text for a status code */
export function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error'
  };
  return statusTexts[status] || 'Unknown';
}

/** Create a mock Response object */
export function createMockResponse(body: any, config: any, log: LogFn): Response {
  let responseBody: string;
  let contentType: string;

  if (typeof body === 'string') {
    responseBody = body;
    if (!config.contentType) {
      if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
        contentType = 'application/json';
      } else if (body.trim().startsWith('<')) {
        contentType = 'text/html';
      } else {
        contentType = 'text/plain';
      }
    } else {
      contentType = config.contentType;
    }
  } else {
    try {
      responseBody = JSON.stringify(body);
      contentType = config.contentType || 'application/json';
    } catch {
      responseBody = String(body);
      contentType = 'text/plain';
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'X-Request-Intercepted': 'true'
  };

  if (config.responseHeaders && typeof config.responseHeaders === 'object') {
    Object.entries(config.responseHeaders).forEach(([key, value]) => {
      headers[key] = value as string;
      log(`Added response header: ${key} = ${value}`);
    });
  }

  const status = config.status || 200;
  const isNullBodyStatus = status === 101 || status === 204 || status === 205 || status === 304;

  return new Response(isNullBodyStatus ? null : responseBody, {
    status,
    statusText: getStatusText(status),
    headers: new Headers(headers),
  });
}

/** Apply request header modifications */
export function modifyRequestHeaders(headers: Headers, config: any, log: LogFn): Headers {
  const modifiedHeaders = new Headers(headers);

  if (config.removeRequestHeaders && Array.isArray(config.removeRequestHeaders)) {
    config.removeRequestHeaders.forEach((headerName: string) => {
      modifiedHeaders.delete(headerName);
      log(`Removed request header: ${headerName}`);
    });
  }

  if (config.requestHeaders && typeof config.requestHeaders === 'object') {
    Object.entries(config.requestHeaders).forEach(([key, value]) => {
      modifiedHeaders.set(key, value as string);
      log(`Set request header: ${key} = ${value}`);
    });
  }

  return modifiedHeaders;
}

/** Apply response header modifications to a real response */
export function modifyResponseHeaders(response: Response, config: any, log: LogFn): Response {
  if (!config.responseHeaders || Object.keys(config.responseHeaders).length === 0) {
    return response;
  }

  const newHeaders = new Headers(response.headers);

  Object.entries(config.responseHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value as string);
    log(`Added response header: ${key} = ${value}`);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/** Escape string for use in regex */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
