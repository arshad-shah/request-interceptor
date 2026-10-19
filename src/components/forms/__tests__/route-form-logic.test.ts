import { describe, it, expect } from 'vitest';
import {
  buildRouteFromForm,
  routeSavedMessage,
  routeToFormData,
  validateRouteForm,
} from '../route-form-logic';
import { defaultFormData } from '@/constants/route-form';
import type {
  InjectionConfig,
  RouteConfig,
  RouteFormData,
  WebSocketConfig,
  WebSocketRule,
} from '@/types';

const form = (overrides: Partial<RouteFormData> = {}): RouteFormData => ({
  ...defaultFormData,
  url: '/api/users',
  ...overrides,
});

const rule = (overrides: Partial<WebSocketRule> = {}): WebSocketRule => ({
  id: 'r1',
  enabled: true,
  type: 'replace',
  matchType: 'contains',
  match: 'ping',
  replacement: 'pong',
  ...overrides,
});

describe('validateRouteForm', () => {
  it('accepts the default HTTP mock form once a URL is set', () => {
    expect(validateRouteForm(form())).toEqual({});
  });

  it('requires a non-blank URL and a non-negative delay', () => {
    expect(validateRouteForm(form({ url: '   ', delay: -1 }))).toEqual({
      url: 'URL is required',
      delay: 'Delay must be 0 or greater',
    });
  });

  it('rejects HTTP status codes outside 100-599', () => {
    expect(validateRouteForm(form({ status: 99 })).status).toBe(
      'Status code must be between 100 and 599'
    );
    expect(validateRouteForm(form({ status: 600 })).status).toBeDefined();
    expect(validateRouteForm(form({ status: 599 })).status).toBeUndefined();
  });

  describe('mock mode', () => {
    it('requires a response body', () => {
      expect(validateRouteForm(form({ response: '  ' })).response).toBe(
        'Response is required for mock mode'
      );
    });

    it('requires valid JSON only when the content type is JSON', () => {
      expect(validateRouteForm(form({ response: '{ nope' })).response).toBeTruthy();
      expect(
        validateRouteForm(form({ response: '{ nope', contentType: 'text/plain' }))
      ).toEqual({});
    });
  });

  describe('passthrough mode', () => {
    const passthrough = (overrides: Partial<RouteFormData> = {}) =>
      validateRouteForm(form({ interceptionMode: 'passthrough', response: '', ...overrides }));

    it('requires at least one modification', () => {
      expect(passthrough().responseHeaders).toBe(
        'At least one modification is required for passthrough mode'
      );
    });

    it.each<[string, Partial<RouteFormData>]>([
      ['response headers', { responseHeaders: { 'X-A': '1' } }],
      ['request headers', { requestHeaders: { Authorization: 'x' } }],
      ['removed headers', { removeRequestHeaders: ['Cookie'] }],
      ['request body', { requestBody: '{"a":1}' }],
      ['query param rules', { queryParamRules: [{ action: 'add', key: 'a', value: '1' }] }],
    ])('is satisfied by %s', (_label, overrides) => {
      expect(passthrough(overrides)).toEqual({});
    });
  });

  it('accepts block mode without a response body', () => {
    expect(validateRouteForm(form({ interceptionMode: 'block', response: '' }))).toEqual({});
  });

  it('requires a redirect URL in redirect mode', () => {
    expect(
      validateRouteForm(form({ interceptionMode: 'redirect', redirectUrl: ' ' })).redirectUrl
    ).toBe('Redirect URL is required');
    expect(
      validateRouteForm(form({ interceptionMode: 'redirect', redirectUrl: 'https://b.test' }))
    ).toEqual({});
  });

  it('requires an enabled WebSocket rule with a match and skips HTTP checks', () => {
    const ws = (overrides: Partial<RouteFormData>) =>
      validateRouteForm(form({ routeType: 'websocket', url: 'wss://x', status: 0, ...overrides }));
    const message = 'At least one message rule is required for WebSocket interception';

    expect(ws({}).incomingRules).toBe(message);
    expect(ws({ incomingRules: [rule({ enabled: false })] }).incomingRules).toBe(message);
    expect(ws({ incomingRules: [rule({ match: '  ' })] }).incomingRules).toBe(message);
    expect(ws({ incomingRules: [rule()] })).toEqual({});
    expect(ws({ outgoingRules: [rule()] })).toEqual({});
  });

  it('requires a non-blank script or stylesheet for injection routes', () => {
    const inj = (overrides: Partial<RouteFormData>) =>
      validateRouteForm(form({ routeType: 'injection', url: '*://a/*', ...overrides }));

    expect(inj({ scripts: ['  '], stylesheets: [''] }).scripts).toBe(
      'At least one script or stylesheet is required'
    );
    expect(inj({ scripts: ['console.log(1)'] })).toEqual({});
    expect(inj({ stylesheets: ['body{}'] })).toEqual({});
  });
});

describe('buildRouteFromForm', () => {
  const NOW = 1_700_000_000_000;

  it('builds an HTTP mock route with a parsed JSON body', () => {
    const { routeKey, routeConfig } = buildRouteFromForm(
      form({ method: 'POST', response: '{"ok":true}', status: 201, delay: 50 }),
      NOW
    );
    expect(routeKey).toBe('POST:/api/users');
    expect(routeConfig).toMatchObject({
      status: 201,
      delay: 50,
      response: { ok: true },
      contentType: 'application/json',
      enabled: true,
      timestamp: NOW,
      interceptionMode: 'mock',
      headersOnly: false,
    });
  });

  it('keeps non-JSON mock bodies as text and appends the name to the key', () => {
    const { routeKey, routeConfig } = buildRouteFromForm(
      form({ name: 'Plain', contentType: 'text/plain', response: 'hello' }),
      NOW
    );
    expect(routeKey).toBe('GET:/api/users|Plain');
    expect((routeConfig as RouteConfig).response).toBe('hello');
    expect((routeConfig as RouteConfig).name).toBe('Plain');
  });

  it('marks passthrough routes headersOnly and nulls an empty body', () => {
    const { routeConfig } = buildRouteFromForm(
      form({ interceptionMode: 'passthrough', response: '  ', requestHeaders: { A: '1' } }),
      NOW
    );
    expect(routeConfig).toMatchObject({
      headersOnly: true,
      interceptionMode: 'passthrough',
      response: null,
      requestHeaders: { A: '1' },
    });
  });

  it('keeps redirect URL and block mode settings', () => {
    const redirect = buildRouteFromForm(
      form({ interceptionMode: 'redirect', redirectUrl: 'https://b.test' }),
      NOW
    ).routeConfig as RouteConfig;
    expect(redirect).toMatchObject({ interceptionMode: 'redirect', redirectUrl: 'https://b.test' });

    const block = buildRouteFromForm(form({ method: 'DELETE', interceptionMode: 'block' }), NOW);
    expect(block.routeKey).toBe('DELETE:/api/users');
    expect(block.routeConfig).toMatchObject({ interceptionMode: 'block', headersOnly: false });
  });

  it('builds a WebSocket route with and without a name', () => {
    const base = form({ routeType: 'websocket', url: 'wss://x', incomingRules: [rule()], delay: 5 });
    expect(buildRouteFromForm(base, NOW)).toEqual({
      routeKey: 'WS:wss://x',
      routeConfig: {
        enabled: true,
        timestamp: NOW,
        name: '',
        incomingRules: [rule()],
        outgoingRules: [],
        delay: 5,
      },
    });
    expect(buildRouteFromForm({ ...base, name: 'Chat' }, NOW).routeKey).toBe('WS:wss://x|Chat');
  });

  it('builds an injection route, dropping blank scripts and stylesheets', () => {
    const { routeKey, routeConfig } = buildRouteFromForm(
      form({
        routeType: 'injection',
        url: '*://a/*',
        name: 'Debug',
        scripts: ['console.log(1)', '  '],
        stylesheets: [''],
        injectAt: 'document_start',
      }),
      NOW
    );
    expect(routeKey).toBe('INJ:*://a/*|Debug');
    expect(routeConfig).toEqual({
      enabled: true,
      timestamp: NOW,
      name: 'Debug',
      scripts: ['console.log(1)'],
      stylesheets: [],
      injectAt: 'document_start',
      urlPattern: '*://a/*',
    });
  });
});

describe('routeToFormData', () => {
  it('round-trips an HTTP mock route', () => {
    const original = form({ method: 'PUT', name: 'Update', status: 202, response: '{"a":1}' });
    const { routeKey, routeConfig } = buildRouteFromForm(original);
    const loaded = routeToFormData(routeKey, routeConfig);
    expect(loaded).toMatchObject({
      routeType: 'http',
      method: 'PUT',
      url: '/api/users',
      name: 'Update',
      status: 202,
      interceptionMode: 'mock',
    });
    expect(JSON.parse(loaded.response)).toEqual({ a: 1 });
  });

  it('maps legacy headersOnly routes without a mode to passthrough', () => {
    const legacy: RouteConfig = {
      status: 200,
      delay: 0,
      response: 'text body',
      contentType: 'text/plain',
      enabled: true,
      timestamp: 1,
      headersOnly: true,
      requestHeaders: { A: '1' },
    };
    const loaded = routeToFormData('GET:/legacy', legacy);
    expect(loaded.interceptionMode).toBe('passthrough');
    expect(loaded.response).toBe('text body');
    expect(loaded.requestHeaders).toEqual({ A: '1' });
    expect(loaded.redirectUrl).toBe('');
  });

  it('defaults routes without mode or headersOnly to mock', () => {
    const loaded = routeToFormData('GET:/x', {
      status: 200,
      delay: 0,
      response: undefined,
      contentType: 'text/plain',
      enabled: true,
      timestamp: 1,
    });
    expect(loaded.interceptionMode).toBe('mock');
    expect(loaded.response).toBe('');
  });

  it('round-trips a WebSocket route', () => {
    const config: WebSocketConfig = {
      enabled: true,
      timestamp: 1,
      incomingRules: [rule()],
      outgoingRules: [],
      delay: 10,
    };
    expect(routeToFormData('WS:wss://x|Chat', config)).toMatchObject({
      routeType: 'websocket',
      url: 'wss://x',
      name: 'Chat',
      delay: 10,
      incomingRules: [rule()],
      outgoingRules: [],
    });
  });

  it('round-trips an injection route', () => {
    const config: InjectionConfig = {
      enabled: true,
      timestamp: 1,
      scripts: ['a()'],
      stylesheets: ['b{}'],
      injectAt: 'document_start',
      urlPattern: '*://a/*',
    };
    expect(routeToFormData('INJ:*://a/*', config)).toMatchObject({
      routeType: 'injection',
      url: '*://a/*',
      name: '',
      scripts: ['a()'],
      stylesheets: ['b{}'],
      injectAt: 'document_start',
    });
  });
});

describe('routeSavedMessage', () => {
  it('describes the route type, mode and add-vs-update', () => {
    expect(routeSavedMessage(form({ interceptionMode: 'block' }), false)).toBe(
      'Route added successfully (block)'
    );
    expect(routeSavedMessage(form({ routeType: 'websocket' }), true)).toBe(
      'Route updated successfully WebSocket'
    );
    expect(routeSavedMessage(form({ routeType: 'injection' }), false)).toBe(
      'Route added successfully Injection'
    );
  });
});
