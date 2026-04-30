import { describe, it, expect } from 'vitest';
import { migrateHttpConfig, migrateWebSocketConfig, migrateRoutes } from '../route-migration';

describe('migrateHttpConfig', () => {
  it('adds missing fields', () => {
    const { config, changed } = migrateHttpConfig({ status: 200, response: '{}' });
    expect(changed).toBe(true);
    expect(config.responseHeaders).toEqual({});
    expect(config.requestHeaders).toEqual({});
    expect(config.removeRequestHeaders).toEqual([]);
    expect(config.headersOnly).toBe(false);
    expect(config.interceptionMode).toBe('mock');
    expect(config.queryParamRules).toEqual([]);
    expect(config.enabled).toBe(true);
  });

  it('migrates headersOnly to passthrough mode', () => {
    const { config } = migrateHttpConfig({ headersOnly: true });
    expect(config.interceptionMode).toBe('passthrough');
  });

  it('is idempotent', () => {
    const first = migrateHttpConfig({ status: 200, response: '{}' });
    const second = migrateHttpConfig(first.config);
    expect(second.changed).toBe(false);
    expect(second.config).toEqual(first.config);
  });
});

describe('migrateWebSocketConfig', () => {
  it('adds missing fields', () => {
    const { config, changed } = migrateWebSocketConfig({});
    expect(changed).toBe(true);
    expect(config.incomingRules).toEqual([]);
    expect(config.outgoingRules).toEqual([]);
    expect(config.delay).toBe(0);
    expect(config.enabled).toBe(true);
  });

  it('ensures rules have ids and defaults', () => {
    const { config, changed } = migrateWebSocketConfig({
      incomingRules: [{ match: 'hello' }],
      outgoingRules: []
    });
    expect(changed).toBe(true);
    expect(config.incomingRules[0].id).toBeTruthy();
    expect(config.incomingRules[0].enabled).toBe(true);
    expect(config.incomingRules[0].type).toBe('replace');
    expect(config.incomingRules[0].matchType).toBe('contains');
  });
});

describe('migrateRoutes', () => {
  it('migrates all route types', () => {
    const { routes, changed } = migrateRoutes({
      'GET:/api/users': { status: 200, response: '{}' },
      'WS:wss://example.com': {},
      'INJ:https://example.com/*': { scripts: ['code'] },
    });

    expect(changed).toBe(true);
    expect(routes['GET:/api/users']).toHaveProperty('interceptionMode');
    expect(routes['WS:wss://example.com']).toHaveProperty('incomingRules');
    expect(routes['INJ:https://example.com/*']).toHaveProperty('enabled', true);
  });

  it('returns changed=false when already migrated', () => {
    const first = migrateRoutes({
      'GET:/api/users': { status: 200, response: '{}' },
    });
    const second = migrateRoutes(first.routes);
    expect(second.changed).toBe(false);
  });
});
