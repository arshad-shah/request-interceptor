import { useMemo } from 'react';
import { parseRouteKey } from '@/lib/chrome-api';
import {
  getContentTypeDisplay,
  formatResponsePreview,
  getRouteDescription,
  parseWebSocketKey,
  parseInjectionKey,
} from '@/lib/utils';
import {
  RouteConfig,
  WebSocketConfig,
  InjectionConfig,
  InterceptionMode,
} from '@/types';

export interface RouteInfo {
  isWebSocket: boolean;
  isInjection: boolean;
  isHttp: boolean;
  isEnabled: boolean;
  method: string;
  url: string;
  name: string;
  timestamp: string;
  // HTTP
  interceptionMode: InterceptionMode;
  isHeadersOnly: boolean;
  responsePreview: string;
  contentTypeName: string;
  description: string;
  parsedResponse: any;
  hasResponseHeaders: boolean;
  hasRequestHeaders: boolean;
  hasRemoveHeaders: boolean;
  hasAnyHeaders: boolean;
  httpConfig: RouteConfig;
  // WebSocket
  wsConfig: WebSocketConfig;
  totalRules: number;
  // Injection
  injConfig: InjectionConfig;
}

export function useRouteInfo(
  routeKey: string,
  config: RouteConfig | WebSocketConfig | InjectionConfig
): RouteInfo {
  return useMemo(() => {
    const isWebSocket = routeKey.startsWith('WS:');
    const isInjection = routeKey.startsWith('INJ:');
    const isHttp = !isWebSocket && !isInjection;
    const isEnabled = config.enabled ?? true;

    let method = '', url = '', name = '';
    if (isWebSocket) {
      const parsed = parseWebSocketKey(routeKey);
      url = parsed.url;
      name = parsed.name;
    } else if (isInjection) {
      const parsed = parseInjectionKey(routeKey);
      url = parsed.urlPattern;
      name = parsed.name;
    } else {
      const parsed = parseRouteKey(routeKey);
      if (!parsed) {
        method = 'GET';
        url = routeKey;
      } else {
        method = parsed.method;
        url = parsed.url;
        name = parsed.name;
      }
    }

    const httpConfig = config as RouteConfig;
    const wsConfig = config as WebSocketConfig;
    const injConfig = config as InjectionConfig;

    const interceptionMode: InterceptionMode = isHttp
      ? (httpConfig.interceptionMode || (httpConfig.headersOnly ? 'passthrough' : 'mock'))
      : 'mock';

    const isHeadersOnly = isHttp && interceptionMode === 'passthrough';
    const responsePreview = isHttp ? formatResponsePreview(httpConfig.response) : '';
    const contentTypeName = isHttp ? getContentTypeDisplay(httpConfig.contentType) : '';
    const description = isInjection
      ? 'Script/CSS injection'
      : isWebSocket
      ? 'WebSocket message interception'
      : getRouteDescription(method as any, url);

    const timestamp = config.timestamp ? new Date(config.timestamp).toLocaleDateString() : 'N/A';

    const hasResponseHeaders = isHttp && !!httpConfig.responseHeaders && Object.keys(httpConfig.responseHeaders).length > 0;
    const hasRequestHeaders = isHttp && !!httpConfig.requestHeaders && Object.keys(httpConfig.requestHeaders).length > 0;
    const hasRemoveHeaders = isHttp && !!httpConfig.removeRequestHeaders && httpConfig.removeRequestHeaders.length > 0;
    const hasAnyHeaders = hasResponseHeaders || hasRequestHeaders || hasRemoveHeaders;

    const totalRules = isWebSocket
      ? (wsConfig.incomingRules?.length || 0) + (wsConfig.outgoingRules?.length || 0)
      : 0;

    let parsedResponse = null;
    if (isHttp && httpConfig.response) {
      try {
        parsedResponse = typeof httpConfig.response === 'object'
          ? httpConfig.response
          : JSON.parse(String(httpConfig.response));
      } catch {
        // not JSON
      }
    }

    return {
      isWebSocket,
      isInjection,
      isHttp,
      isEnabled,
      method,
      url,
      name,
      timestamp,
      interceptionMode,
      isHeadersOnly,
      responsePreview,
      contentTypeName,
      description,
      parsedResponse,
      hasResponseHeaders,
      hasRequestHeaders,
      hasRemoveHeaders,
      hasAnyHeaders,
      httpConfig,
      wsConfig,
      injConfig,
      totalRules,
    };
  }, [routeKey, config]);
}
