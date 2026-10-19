/**
 * Route export/import logic.
 */

import type { RouteConfig, WebSocketConfig, InjectionConfig } from '@/types';
import { isWebSocketRoute, isInjectionRoute, parseRouteKey, parseWebSocketKey, parseInjectionKey } from './route-keys';

export interface ExportedRoute {
  routeType: 'http' | 'websocket' | 'injection';
  [key: string]: unknown;
}

/**
 * Export routes to a portable format for JSON serialization.
 */
export function exportRoutes(routes: Record<string, RouteConfig | WebSocketConfig | InjectionConfig>): { routes: ExportedRoute[] } {
  return {
    routes: Object.entries(routes).map(([key, config]) => {
      if (isWebSocketRoute(key)) {
        const { url, name: parsedName } = parseWebSocketKey(key);
        const wsConfig = config as WebSocketConfig;
        return {
          routeType: 'websocket' as const,
          url,
          name: parsedName || config.name || '',
          enabled: config.enabled !== false,
          delay: wsConfig.delay || 0,
          incomingRules: wsConfig.incomingRules || [],
          outgoingRules: wsConfig.outgoingRules || []
        };
      } else if (isInjectionRoute(key)) {
        const { urlPattern, name: parsedName } = parseInjectionKey(key);
        const injConfig = config as InjectionConfig;
        return {
          routeType: 'injection' as const,
          urlPattern,
          name: parsedName || config.name || '',
          enabled: injConfig.enabled !== false,
          scripts: injConfig.scripts || [],
          stylesheets: injConfig.stylesheets || [],
          injectAt: injConfig.injectAt || 'document_end'
        };
      } else {
        const { method, url, name: parsedName } = parseRouteKey(key);
        const httpConfig = config as RouteConfig;
        return {
          routeType: 'http' as const,
          method,
          url,
          name: parsedName || config.name || '',
          status: httpConfig.status || 200,
          delay: httpConfig.delay || 0,
          contentType: httpConfig.contentType,
          response: httpConfig.response,
          enabled: config.enabled !== false,
          responseHeaders: httpConfig.responseHeaders || {},
          requestHeaders: httpConfig.requestHeaders || {},
          removeRequestHeaders: httpConfig.removeRequestHeaders || [],
          headersOnly: httpConfig.headersOnly || false,
          interceptionMode: httpConfig.interceptionMode || (httpConfig.headersOnly ? 'passthrough' : 'mock'),
          redirectUrl: httpConfig.redirectUrl || '',
          requestBody: httpConfig.requestBody || '',
          queryParamRules: httpConfig.queryParamRules || [],
          graphqlOperationName: httpConfig.graphqlOperationName || ''
        };
      }
    })
  };
}
