import { describe, it, expect } from 'vitest';
import { exportRoutes } from '../route-export';
import { mockHttpRoute, mockWebSocketConfig, mockInjectionConfig } from './fixtures';

describe('exportRoutes', () => {
  it('exports HTTP routes', () => {
    const result = exportRoutes({ 'GET:/api/users': mockHttpRoute });
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].routeType).toBe('http');
    expect(result.routes[0].method).toBe('GET');
    expect(result.routes[0].url).toBe('/api/users');
  });

  it('exports named HTTP routes', () => {
    const result = exportRoutes({ 'GET:/api/users|Test': mockHttpRoute });
    expect(result.routes[0].name).toBe('Test');
    expect(result.routes[0].url).toBe('/api/users');
  });

  it('exports WebSocket routes', () => {
    const result = exportRoutes({ 'WS:wss://example.com/ws': mockWebSocketConfig });
    expect(result.routes[0].routeType).toBe('websocket');
    expect(result.routes[0].url).toBe('wss://example.com/ws');
  });

  it('exports injection routes', () => {
    const result = exportRoutes({ 'INJ:https://example.com/*': mockInjectionConfig });
    expect(result.routes[0].routeType).toBe('injection');
    expect(result.routes[0].urlPattern).toBe('https://example.com/*');
  });

  it('exports mixed routes', () => {
    const result = exportRoutes({
      'GET:/api/users': mockHttpRoute,
      'WS:wss://example.com/ws': mockWebSocketConfig,
      'INJ:https://example.com/*': mockInjectionConfig,
    });
    expect(result.routes).toHaveLength(3);
    const types = result.routes.map(r => r.routeType);
    expect(types).toContain('http');
    expect(types).toContain('websocket');
    expect(types).toContain('injection');
  });

  it('includes all HTTP config fields', () => {
    const result = exportRoutes({ 'GET:/api/users': mockHttpRoute });
    const route = result.routes[0];
    expect(route).toHaveProperty('status');
    expect(route).toHaveProperty('delay');
    expect(route).toHaveProperty('response');
    expect(route).toHaveProperty('interceptionMode');
    expect(route).toHaveProperty('responseHeaders');
    expect(route).toHaveProperty('requestHeaders');
  });
});
