/**
 * Shared test fixtures for core module tests.
 */

import type { RouteConfig, WebSocketConfig, InjectionConfig, WebSocketRule } from '@/types';

export const mockHttpRoute: RouteConfig = {
  status: 200,
  delay: 0,
  response: '{"message":"hello"}',
  contentType: 'application/json',
  enabled: true,
  timestamp: Date.now(),
  name: 'Test Route',
  responseHeaders: {},
  requestHeaders: {},
  removeRequestHeaders: [],
  headersOnly: false,
  interceptionMode: 'mock',
  queryParamRules: [],
};

export const mockPassthroughRoute: RouteConfig = {
  status: 200,
  delay: 0,
  response: '',
  contentType: 'application/json',
  enabled: true,
  timestamp: Date.now(),
  interceptionMode: 'passthrough',
  responseHeaders: { 'X-Custom': 'value' },
  requestHeaders: { 'Authorization': 'Bearer test' },
  removeRequestHeaders: ['Cookie'],
  headersOnly: true,
  queryParamRules: [],
};

export const mockBlockRoute: RouteConfig = {
  status: 200,
  delay: 0,
  response: '',
  contentType: 'application/json',
  enabled: true,
  timestamp: Date.now(),
  interceptionMode: 'block',
};

export const mockRedirectRoute: RouteConfig = {
  status: 200,
  delay: 0,
  response: '',
  contentType: 'application/json',
  enabled: true,
  timestamp: Date.now(),
  interceptionMode: 'redirect',
  redirectUrl: 'https://other.example.com/api/users',
};

export function makeWsRule(overrides: Partial<WebSocketRule> = {}): WebSocketRule {
  return {
    id: 'rule-1',
    enabled: true,
    type: 'replace',
    matchType: 'contains',
    match: 'hello',
    replacement: 'world',
    ...overrides,
  };
}

export const mockWebSocketConfig: WebSocketConfig = {
  enabled: true,
  timestamp: Date.now(),
  name: 'Test WS',
  incomingRules: [makeWsRule()],
  outgoingRules: [],
  delay: 0,
};

export const mockInjectionConfig: InjectionConfig = {
  enabled: true,
  timestamp: Date.now(),
  name: 'Test Injection',
  scripts: ['console.log("injected")'],
  stylesheets: ['body { color: red; }'],
  injectAt: 'document_end',
  urlPattern: 'https://example.com/*',
};

export const mockRoutesMap: Record<string, RouteConfig | WebSocketConfig | InjectionConfig> = {
  'GET:/api/users': mockHttpRoute,
  'GET:/api/users|Named Route': { ...mockHttpRoute, name: 'Named Route' },
  'POST:/api/users': { ...mockHttpRoute, interceptionMode: 'mock' },
  'WS:wss://example.com/ws': mockWebSocketConfig,
  'WS:wss://example.com/ws|Named WS': { ...mockWebSocketConfig, name: 'Named WS' },
  'INJ:https://example.com/*': mockInjectionConfig,
  'INJ:https://example.com/*|Named Injection': { ...mockInjectionConfig, name: 'Named Injection' },
};
