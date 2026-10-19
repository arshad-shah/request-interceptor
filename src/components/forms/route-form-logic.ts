/**
 * Pure helpers behind AddRouteForm: loading a saved route into form state,
 * validating the form, and turning it back into a route key + config.
 */

import type {
  HttpMethod,
  InjectionConfig,
  InterceptionMode,
  RouteConfig,
  RouteFormData,
  WebSocketConfig,
} from '@/types';
import type { AnyRouteConfig } from '@/core/messaging/protocol';
import {
  createInjectionKey,
  createRouteKey,
  parseInjectionKey,
  parseRouteKey,
  parseWebSocketKey,
} from '@/core/route-keys';
import { formatJson, validateJson } from '@/lib/chrome-api';
import { defaultFormData } from '@/constants/route-form';

export type RouteFormErrors = Partial<Record<keyof RouteFormData, string>>;

export type FieldChangeHandler = <K extends keyof RouteFormData>(
  field: K,
  value: RouteFormData[K]
) => void;

/** Form state for an existing route, keyed by its route-key prefix. */
export function routeToFormData(routeKey: string, routeConfig: AnyRouteConfig): RouteFormData {
  if (routeKey.startsWith('WS:')) {
    const { url, name } = parseWebSocketKey(routeKey);
    const ws = routeConfig as WebSocketConfig;
    return {
      ...defaultFormData,
      routeType: 'websocket',
      name: name || '',
      url,
      delay: ws.delay || 0,
      incomingRules: ws.incomingRules || [],
      outgoingRules: ws.outgoingRules || [],
    };
  }

  if (routeKey.startsWith('INJ:')) {
    const { urlPattern, name } = parseInjectionKey(routeKey);
    const inj = routeConfig as InjectionConfig;
    return {
      ...defaultFormData,
      routeType: 'injection',
      name: name || '',
      url: urlPattern,
      scripts: inj.scripts || [],
      stylesheets: inj.stylesheets || [],
      injectAt: inj.injectAt || 'document_end',
    };
  }

  const { method, url, name } = parseRouteKey(routeKey);
  const rc = routeConfig as RouteConfig;
  const mode: InterceptionMode =
    rc.interceptionMode || (rc.headersOnly ? 'passthrough' : 'mock');
  return {
    ...defaultFormData,
    routeType: 'http',
    name: name || '',
    url,
    method: method as HttpMethod,
    status: rc.status,
    delay: rc.delay ?? 0,
    contentType: rc.contentType,
    response:
      typeof rc.response === 'object'
        ? formatJson(rc.response)
        : String(rc.response ?? ''),
    responseHeaders: rc.responseHeaders || {},
    requestHeaders: rc.requestHeaders || {},
    removeRequestHeaders: rc.removeRequestHeaders || [],
    headersOnly: rc.headersOnly || false,
    interceptionMode: mode,
    redirectUrl: rc.redirectUrl || '',
    requestBody: rc.requestBody || '',
    queryParamRules: rc.queryParamRules || [],
    graphqlOperationName: rc.graphqlOperationName || '',
  };
}

/** Field errors for the form; an empty object means it is valid. */
export function validateRouteForm(formData: RouteFormData): RouteFormErrors {
  const newErrors: RouteFormErrors = {};

  if (!formData.url.trim()) {
    newErrors.url = 'URL is required';
  }

  if (formData.delay < 0) {
    newErrors.delay = 'Delay must be 0 or greater';
  }

  if (formData.routeType === 'http') {
    if (formData.status < 100 || formData.status > 599) {
      newErrors.status = 'Status code must be between 100 and 599';
    }

    switch (formData.interceptionMode) {
      case 'mock':
        if (!formData.response.trim()) {
          newErrors.response = 'Response is required for mock mode';
        } else if (formData.contentType === 'application/json') {
          const jsonValidation = validateJson(formData.response);
          if (!jsonValidation.isValid) {
            newErrors.response = jsonValidation.error;
          }
        }
        break;
      case 'passthrough': {
        const hasResponseHeaders = Object.keys(formData.responseHeaders).length > 0;
        const hasRequestHeaders = Object.keys(formData.requestHeaders).length > 0;
        const hasRemoveHeaders = formData.removeRequestHeaders.length > 0;
        const hasRequestBody = formData.requestBody.trim().length > 0;
        const hasQueryParams = formData.queryParamRules.length > 0;

        if (
          !hasResponseHeaders &&
          !hasRequestHeaders &&
          !hasRemoveHeaders &&
          !hasRequestBody &&
          !hasQueryParams
        ) {
          newErrors.responseHeaders =
            'At least one modification is required for passthrough mode';
        }
        break;
      }
      case 'block':
        break;
      case 'redirect':
        if (!formData.redirectUrl.trim()) {
          newErrors.redirectUrl = 'Redirect URL is required';
        }
        break;
    }
  } else if (formData.routeType === 'websocket') {
    const hasIncomingRules = formData.incomingRules.some(
      (rule) => rule.enabled && rule.match.trim()
    );
    const hasOutgoingRules = formData.outgoingRules.some(
      (rule) => rule.enabled && rule.match.trim()
    );

    if (!hasIncomingRules && !hasOutgoingRules) {
      newErrors.incomingRules =
        'At least one message rule is required for WebSocket interception';
    }
  } else if (formData.routeType === 'injection') {
    const hasScripts = formData.scripts.some((s) => s.trim());
    const hasStylesheets = formData.stylesheets.some((s) => s.trim());

    if (!hasScripts && !hasStylesheets) {
      newErrors.scripts = 'At least one script or stylesheet is required';
    }
  }

  return newErrors;
}

/** Route key and config to save for a (valid) form. */
export function buildRouteFromForm(
  formData: RouteFormData,
  now: number = Date.now()
): { routeKey: string; routeConfig: AnyRouteConfig } {
  if (formData.routeType === 'websocket') {
    const routeConfig: WebSocketConfig = {
      enabled: true,
      timestamp: now,
      name: formData.name,
      incomingRules: formData.incomingRules,
      outgoingRules: formData.outgoingRules,
      delay: formData.delay,
    };
    return {
      routeKey: formData.name ? `WS:${formData.url}|${formData.name}` : `WS:${formData.url}`,
      routeConfig,
    };
  }

  if (formData.routeType === 'injection') {
    const routeConfig: InjectionConfig = {
      enabled: true,
      timestamp: now,
      name: formData.name,
      scripts: formData.scripts.filter((s) => s.trim()),
      stylesheets: formData.stylesheets.filter((s) => s.trim()),
      injectAt: formData.injectAt,
      urlPattern: formData.url,
    };
    return { routeKey: createInjectionKey(formData.url, formData.name), routeConfig };
  }

  let responseBody: unknown;
  if (formData.interceptionMode === 'mock') {
    if (formData.contentType === 'application/json') {
      responseBody = validateJson(formData.response).parsed;
    } else {
      responseBody = formData.response;
    }
  } else {
    responseBody = formData.response.trim() || null;
  }

  const routeConfig: RouteConfig = {
    status: formData.status,
    delay: formData.delay,
    response: responseBody,
    contentType: formData.contentType,
    enabled: true,
    timestamp: now,
    name: formData.name,
    responseHeaders: formData.responseHeaders,
    requestHeaders: formData.requestHeaders,
    removeRequestHeaders: formData.removeRequestHeaders,
    headersOnly: formData.interceptionMode === 'passthrough',
    interceptionMode: formData.interceptionMode,
    redirectUrl: formData.redirectUrl,
    requestBody: formData.requestBody,
    queryParamRules: formData.queryParamRules,
    graphqlOperationName: formData.graphqlOperationName,
  };
  return {
    routeKey: createRouteKey(formData.method, formData.url, formData.name),
    routeConfig,
  };
}

/** Success toast text, e.g. "Route added successfully WebSocket" or "... (mock)". */
export function routeSavedMessage(formData: RouteFormData, isEditing: boolean): string {
  const typeText =
    formData.routeType === 'websocket'
      ? ' WebSocket'
      : formData.routeType === 'injection'
      ? ' Injection'
      : '';
  const modeText =
    formData.routeType === 'http' ? ` (${formData.interceptionMode})` : '';
  return (isEditing ? 'Route updated successfully' : 'Route added successfully') + typeText + modeText;
}
