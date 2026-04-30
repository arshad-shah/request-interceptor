import { describe, it, expect } from 'vitest';
import {
  parseRouteKey,
  createRouteKey,
  parseWebSocketKey,
  createWebSocketKey,
  parseInjectionKey,
  createInjectionKey,
  isWebSocketRoute,
  isInjectionRoute,
  isHttpRoute,
} from '../route-keys';

describe('parseRouteKey', () => {
  it('parses simple route key', () => {
    expect(parseRouteKey('GET:/api/users')).toEqual({ method: 'GET', url: '/api/users', name: '' });
  });

  it('parses route key with name', () => {
    expect(parseRouteKey('POST:/api/users|Create User')).toEqual({ method: 'POST', url: '/api/users', name: 'Create User' });
  });

  it('handles key without colon', () => {
    expect(parseRouteKey('/api/users')).toEqual({ method: 'GET', url: '/api/users', name: '' });
  });

  it('handles URL with port (multiple colons)', () => {
    expect(parseRouteKey('GET:http://localhost:3000/api')).toEqual({ method: 'GET', url: 'http://localhost:3000/api', name: '' });
  });

  it('handles URL with port and name', () => {
    expect(parseRouteKey('GET:http://localhost:3000/api|Test')).toEqual({ method: 'GET', url: 'http://localhost:3000/api', name: 'Test' });
  });
});

describe('createRouteKey', () => {
  it('creates simple route key', () => {
    expect(createRouteKey('GET', '/api/users')).toBe('GET:/api/users');
  });

  it('creates named route key', () => {
    expect(createRouteKey('POST', '/api/users', 'Create User')).toBe('POST:/api/users|Create User');
  });

  it('ignores empty name', () => {
    expect(createRouteKey('GET', '/api/users', '')).toBe('GET:/api/users');
  });
});

describe('parseWebSocketKey', () => {
  it('parses simple WS key', () => {
    expect(parseWebSocketKey('WS:wss://example.com/ws')).toEqual({ url: 'wss://example.com/ws', name: '' });
  });

  it('parses named WS key', () => {
    expect(parseWebSocketKey('WS:wss://example.com/ws|My WS')).toEqual({ url: 'wss://example.com/ws', name: 'My WS' });
  });

  it('throws for invalid prefix', () => {
    expect(() => parseWebSocketKey('GET:/api')).toThrow('must start with "WS:"');
  });
});

describe('createWebSocketKey', () => {
  it('creates simple WS key', () => {
    expect(createWebSocketKey('wss://example.com/ws')).toBe('WS:wss://example.com/ws');
  });

  it('creates named WS key', () => {
    expect(createWebSocketKey('wss://example.com/ws', 'My WS')).toBe('WS:wss://example.com/ws|My WS');
  });
});

describe('parseInjectionKey', () => {
  it('parses simple injection key', () => {
    expect(parseInjectionKey('INJ:https://example.com/*')).toEqual({ urlPattern: 'https://example.com/*', name: '' });
  });

  it('parses named injection key', () => {
    expect(parseInjectionKey('INJ:https://example.com/*|My Injection')).toEqual({ urlPattern: 'https://example.com/*', name: 'My Injection' });
  });

  it('throws for invalid prefix', () => {
    expect(() => parseInjectionKey('GET:/api')).toThrow('must start with "INJ:"');
  });
});

describe('createInjectionKey', () => {
  it('creates simple injection key', () => {
    expect(createInjectionKey('https://example.com/*')).toBe('INJ:https://example.com/*');
  });

  it('creates named injection key', () => {
    expect(createInjectionKey('https://example.com/*', 'My Inj')).toBe('INJ:https://example.com/*|My Inj');
  });
});

describe('route type checks', () => {
  it('isWebSocketRoute', () => {
    expect(isWebSocketRoute('WS:wss://example.com')).toBe(true);
    expect(isWebSocketRoute('GET:/api')).toBe(false);
    expect(isWebSocketRoute('INJ:https://example.com')).toBe(false);
  });

  it('isInjectionRoute', () => {
    expect(isInjectionRoute('INJ:https://example.com')).toBe(true);
    expect(isInjectionRoute('GET:/api')).toBe(false);
    expect(isInjectionRoute('WS:wss://example.com')).toBe(false);
  });

  it('isHttpRoute', () => {
    expect(isHttpRoute('GET:/api')).toBe(true);
    expect(isHttpRoute('WS:wss://example.com')).toBe(false);
    expect(isHttpRoute('INJ:https://example.com')).toBe(false);
  });
});
