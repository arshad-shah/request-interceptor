/**
 * Pure parsing for the Templates tab: turns a user-supplied `{ routes: [...] }`
 * schema into validated route keys + configs, collecting per-route errors.
 */

import type {
  HeaderConfig,
  InjectionConfig,
  InterceptionMode,
  RouteConfig,
  RouteType,
  WebSocketConfig,
  WebSocketRule,
} from '@/types';
import type { AnyRouteConfig } from '@/core/messaging/protocol';
import {
  validateHttpConfig,
  validateInjectionConfig,
  validateWebSocketConfig,
} from '@/core/route-validation';
import { validateJson } from '@/lib/chrome-api';

/** A route as written in an imported schema. Every field is optional and unchecked. */
export interface RawTemplateRoute {
  routeType?: RouteType;
  id?: string;
  name?: string;
  url?: string;
  urlPattern?: string;
  method?: string;
  status?: number;
  delay?: number;
  enabled?: boolean;
  contentType?: string;
  response?: unknown;
  responseHeaders?: HeaderConfig;
  requestHeaders?: HeaderConfig;
  removeRequestHeaders?: string[];
  headersOnly?: boolean;
  interceptionMode?: InterceptionMode;
  redirectUrl?: string;
  requestBody?: string;
  queryParamRules?: RouteConfig['queryParamRules'];
  graphqlOperationName?: string;
  scripts?: string[];
  stylesheets?: string[];
  injectAt?: string;
  incomingRules?: Partial<WebSocketRule>[];
  outgoingRules?: Partial<WebSocketRule>[];
}

/** Schema route shown in the import preview, tagged with its computed key. */
export type PreviewRoute = RawTemplateRoute & { _builtKey?: string };

export interface BuiltRoute {
  raw: RawTemplateRoute;
  key: string;
  config: AnyRouteConfig;
  routeType: RouteType;
  label: string;
}

export interface BuildError {
  label: string;
  error: string;
  raw: RawTemplateRoute;
}

export type BuildResult = { ok: true; built: BuiltRoute } | { ok: false; error: BuildError };

export const inferRouteType = (route: RawTemplateRoute): RouteType => {
  if (route.routeType) return route.routeType;
  if (route.scripts || route.stylesheets || route.urlPattern || route.injectAt) return 'injection';
  if (route.incomingRules || route.outgoingRules) return 'websocket';
  return 'http';
};

const labelFor = (route: RawTemplateRoute, fallback: string | undefined): string =>
  route.name || fallback || 'Unnamed route';

/** Validate one schema route. Note: records the inferred routeType on `route`. */
export const buildRoute = (route: RawTemplateRoute): BuildResult => {
  const routeType = inferRouteType(route);
  route.routeType = routeType;

  if (routeType === 'injection') {
    const urlPattern = route.urlPattern || route.url;
    const label = labelFor(route, urlPattern);
    if (!urlPattern || !String(urlPattern).trim()) {
      return { ok: false, error: { label, error: 'Injection route must have a URL pattern', raw: route } };
    }
    const config: InjectionConfig = {
      enabled: route.enabled !== false,
      timestamp: Date.now(),
      name: route.name,
      urlPattern,
      scripts: Array.isArray(route.scripts) ? route.scripts : [],
      stylesheets: Array.isArray(route.stylesheets) ? route.stylesheets : [],
      injectAt: route.injectAt === 'document_start' ? 'document_start' : 'document_end',
    };
    const result = validateInjectionConfig(config);
    if (!result.valid) {
      return { ok: false, error: { label, error: result.error || 'Invalid injection route', raw: route } };
    }
    const key = route.name ? `INJ:${urlPattern}|${route.name}` : `INJ:${urlPattern}`;
    return { ok: true, built: { raw: route, key, config, routeType, label } };
  }

  if (routeType === 'websocket') {
    const label = labelFor(route, route.url);
    if (!route.url || !String(route.url).trim()) {
      return { ok: false, error: { label, error: 'WebSocket route must have a URL', raw: route } };
    }
    const processRules = (rules: Partial<WebSocketRule>[] = []): WebSocketRule[] =>
      rules.map((rule, index) => ({
        id: rule.id || `rule-${Date.now()}-${index}`,
        enabled: rule.enabled !== false,
        type: rule.type || 'replace',
        matchType: rule.matchType || 'contains',
        match: rule.match || '',
        replacement: rule.replacement || '',
        flags: rule.flags || '',
        description: rule.description || '',
      }));
    const config: WebSocketConfig = {
      enabled: route.enabled !== false,
      timestamp: Date.now(),
      name: route.name,
      incomingRules: processRules(route.incomingRules),
      outgoingRules: processRules(route.outgoingRules),
      delay: route.delay || 0,
    };
    const result = validateWebSocketConfig(config);
    if (!result.valid) {
      return { ok: false, error: { label, error: result.error || 'Invalid WebSocket route', raw: route } };
    }
    const key = route.name ? `WS:${route.url}|${route.name}` : `WS:${route.url}`;
    return { ok: true, built: { raw: route, key, config, routeType, label } };
  }

  // HTTP
  const label = labelFor(route, `${route.method || '?'} ${route.url || ''}`.trim());
  if (!route.method || !String(route.method).trim()) {
    return { ok: false, error: { label, error: 'HTTP route must have a method', raw: route } };
  }
  if (!route.url || !String(route.url).trim()) {
    return { ok: false, error: { label, error: 'HTTP route must have a URL', raw: route } };
  }
  if (route.status !== undefined && (route.status < 100 || route.status > 599)) {
    return { ok: false, error: { label, error: 'Status code must be between 100 and 599', raw: route } };
  }

  const headersOnly = route.headersOnly === true || route.interceptionMode === 'passthrough';
  const interceptionMode = route.interceptionMode || (headersOnly ? 'passthrough' : 'mock');

  const config: RouteConfig = {
    status: route.status ?? 200,
    delay: route.delay || 0,
    contentType: route.contentType || 'application/json',
    response: route.response,
    enabled: route.enabled !== false,
    timestamp: Date.now(),
    name: route.name,
    responseHeaders: route.responseHeaders || {},
    requestHeaders: route.requestHeaders || {},
    removeRequestHeaders: route.removeRequestHeaders || [],
    headersOnly,
    interceptionMode,
    redirectUrl: route.redirectUrl || '',
    requestBody: route.requestBody || '',
    queryParamRules: Array.isArray(route.queryParamRules) ? route.queryParamRules : [],
    graphqlOperationName: route.graphqlOperationName || '',
  };
  const result = validateHttpConfig(config);
  if (!result.valid) {
    return { ok: false, error: { label, error: result.error || 'Invalid HTTP route', raw: route } };
  }
  const key = route.name ? `${route.method}:${route.url}|${route.name}` : `${route.method}:${route.url}`;
  return { ok: true, built: { raw: route, key, config, routeType, label } };
};

export type SchemaParseResult =
  | { ok: false; message: string }
  | { ok: true; valid: BuiltRoute[]; errors: BuildError[] };

/** Parse schema text; schema-level problems fail outright, route-level ones are collected. */
export function parseTemplateSchema(input: string): SchemaParseResult {
  if (!input.trim()) {
    return { ok: false, message: 'Please enter a JSON schema' };
  }

  const validation = validateJson(input);
  if (!validation.isValid) {
    return { ok: false, message: `Invalid JSON: ${validation.error}` };
  }

  const schema = validation.parsed as { routes?: unknown } | null;
  if (!schema || !schema.routes || !Array.isArray(schema.routes)) {
    return { ok: false, message: 'Schema must contain a "routes" array' };
  }

  const valid: BuiltRoute[] = [];
  const errors: BuildError[] = [];
  (schema.routes as unknown[]).forEach((route) => {
    if (!route || typeof route !== 'object' || Array.isArray(route)) {
      errors.push({ label: 'Unnamed route', error: 'Route must be an object', raw: {} });
      return;
    }
    const result = buildRoute(route as RawTemplateRoute);
    if (result.ok) {
      valid.push(result.built);
    } else {
      errors.push(result.error);
    }
  });
  return { ok: true, valid, errors };
}
