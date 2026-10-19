/**
 * Creates (or opens) an interception route from a captured request
 */

import { useCallback, type MutableRefObject } from 'react';
import { useAppStore } from '../../../stores/app-store';
import type { NetworkRequest } from '../../../types/network';
import type { RouteConfig, WebSocketConfig } from '../../../types';
import { getResponseBody } from '../../../lib/network-api';

export function useInterceptRequest(currentTabIdRef: MutableRefObject<number | null>) {
  const { addRoute } = useAppStore();

  return useCallback(
    async (request: NetworkRequest) => {
      const isWebSocket = request.type === 'websocket';
      const routes = useAppStore.getState().routes;
      
      // Build route key based on request type
      let routeKey: string;
      if (isWebSocket) {
        // WebSocket routes use WS: prefix and can optionally have a name
        routeKey = `WS:${request.url}`;
      } else {
        routeKey = `${request.method}:${request.url}`;
      }
      
      // Check if route already exists
      if (routes[routeKey]) {
        useAppStore.getState().setEditingRoute(routeKey);
        return;
      }

      if (isWebSocket) {
        // Create WebSocket config
        const newRoute: WebSocketConfig = {
          enabled: true,
          timestamp: Date.now(),
          name: request.hostname,
          incomingRules: [],
          outgoingRules: [],
          delay: 0,
        };

        await addRoute(routeKey, newRoute);
      } else {
        // Create HTTP config
        const tabId = currentTabIdRef.current;
        const body = tabId ? await getResponseBody(tabId, request.requestId) : null;
        const responseContent = body && !body.base64Encoded ? body.body : '';
        const detectedContentType = request.mimeType || request.contentType || 'application/json';

        const newRoute: RouteConfig = {
          enabled: true,
          status: request.statusCode || 200,
          response: responseContent,
          contentType: detectedContentType,
          timestamp: Date.now(),
          responseHeaders: request.responseHeaders?.reduce((acc, h) => {
            acc[h.name] = h.value;
            return acc;
          }, {} as Record<string, string>) || {},
          requestHeaders: request.requestHeaders?.reduce((acc, h) => {
            acc[h.name] = h.value;
            return acc;
          }, {} as Record<string, string>) || {},
          removeRequestHeaders: [],
          delay: 0,
          headersOnly: false,
        };

        await addRoute(routeKey, newRoute);
      }

      useAppStore.getState().setEditingRoute(routeKey);
    },
    [addRoute, currentTabIdRef]
  );
}
