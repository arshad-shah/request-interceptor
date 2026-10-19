import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupFetchInterceptor } from '../interceptors/fetch-interceptor';
import { modifyResponseHeaders, type InterceptRoutes } from '../interceptors/interceptor-helpers';

const noopLog = () => {};

describe('fetch interceptor forwarding', () => {
  const nativeFetch = window.fetch;
  let originalFetch: ReturnType<typeof vi.fn>;

  function install(routes: InterceptRoutes) {
    originalFetch = vi.fn(async () => new Response('ok'));
    setupFetchInterceptor(
      { isActive: () => true, getRoutes: () => routes },
      noopLog,
      originalFetch as unknown as typeof window.fetch
    );
  }

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    window.fetch = nativeFetch;
    vi.useRealTimers();
  });

  it('passthrough keeps a Request object’s own headers when adding headers', async () => {
    install({
      'GET:https://api.test/items': {
        enabled: true,
        interceptionMode: 'passthrough',
        requestHeaders: { 'X-Added': '1' },
      },
    });

    await window.fetch(
      new Request('https://api.test/items', { headers: { Authorization: 'Bearer t' } })
    );

    const [, init] = originalFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('Bearer t');
    expect(headers.get('x-added')).toBe('1');
  });

  it('redirect keeps a Request object’s method and body', async () => {
    install({
      'POST:https://api.test/items': {
        enabled: true,
        interceptionMode: 'redirect',
        redirectUrl: 'https://staging.test/items',
      },
    });

    await window.fetch(
      new Request('https://api.test/items', { method: 'POST', body: '{"a":1}' })
    );

    const [url, init] = originalFetch.mock.calls[0];
    expect(url).toBe('https://staging.test/items');
    expect(init.method).toBe('POST');
    expect(new TextDecoder().decode(init.body)).toBe('{"a":1}');
  });

  it('keeps a page-set referrer policy and referrer', async () => {
    install({
      'GET:https://api.test/items': { enabled: true, interceptionMode: 'passthrough', requestHeaders: { 'X-A': '1' } },
    });
    await window.fetch('https://api.test/items', { referrer: '', referrerPolicy: 'no-referrer' });
    const [, init] = originalFetch.mock.calls[0];
    expect(init.referrer).toBe('');
    expect(init.referrerPolicy).toBe('no-referrer');
  });

  it('does not reroute requests without a matching route', async () => {
    install({});
    await window.fetch('https://api.test/other', { method: 'GET' });
    expect(originalFetch).toHaveBeenCalledWith('https://api.test/other', { method: 'GET' });
  });
});

describe('modifyResponseHeaders', () => {
  it('returns opaque/status-0 responses unchanged instead of throwing', () => {
    const opaque = { status: 0, type: 'opaque', headers: new Headers(), body: null } as unknown as Response;
    expect(() => modifyResponseHeaders(opaque, { responseHeaders: { 'X-A': '1' } }, noopLog)).not.toThrow();
    expect(modifyResponseHeaders(opaque, { responseHeaders: { 'X-A': '1' } }, noopLog)).toBe(opaque);
  });

  it('sets headers on normal responses', () => {
    const res = modifyResponseHeaders(new Response('x', { status: 201 }), { responseHeaders: { 'X-A': '1' } }, noopLog);
    expect(res.status).toBe(201);
    expect(res.headers.get('x-a')).toBe('1');
  });
});
