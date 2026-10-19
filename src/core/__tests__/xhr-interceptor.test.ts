import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupXHRInterceptor } from '../interceptors/xhr-interceptor';

const proto = XMLHttpRequest.prototype;
const native = { open: proto.open, send: proto.send, setRequestHeader: proto.setRequestHeader };

describe('XHR interceptor', () => {
  let open: ReturnType<typeof vi.fn>;
  let send: ReturnType<typeof vi.fn>;
  let setHeader: ReturnType<typeof vi.fn>;

  function install(routes: Record<string, any>) {
    open = vi.fn();
    send = vi.fn();
    setHeader = vi.fn();
    setupXHRInterceptor(
      { isActive: () => true, getRoutes: () => routes },
      () => {},
      open as any,
      send as any,
      setHeader as any
    );
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    Object.assign(proto, native);
    vi.useRealTimers();
  });

  it('sends each page header exactly once when not intercepted', () => {
    install({});
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://api.test/a');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send();
    expect(setHeader.mock.calls).toEqual([['Accept', 'application/json']]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('passthrough overrides and removes headers instead of appending', () => {
    install({
      'GET:https://api.test/a': {
        enabled: true,
        interceptionMode: 'passthrough',
        requestHeaders: { 'X-Env': 'staging' },
        removeRequestHeaders: ['authorization'],
      },
    });
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://api.test/a');
    xhr.setRequestHeader('Authorization', 'Bearer t');
    xhr.setRequestHeader('X-Env', 'prod');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send();
    expect(setHeader.mock.calls).toEqual([
      ['Accept', 'application/json'],
      ['X-Env', 'staging'],
    ]);
  });

  it('mock fires each handler once and serves headers case-insensitively', () => {
    install({
      'GET:https://api.test/a': {
        enabled: true,
        interceptionMode: 'mock',
        response: '{"ok":true}',
        responseHeaders: { 'X-Custom': '1' },
      },
    });
    const xhr = new XMLHttpRequest();
    const onload = vi.fn();
    const onreadystatechange = vi.fn();
    const listener = vi.fn();
    xhr.onload = onload;
    xhr.onreadystatechange = onreadystatechange;
    xhr.addEventListener('readystatechange', listener);
    xhr.open('GET', 'https://api.test/a');
    xhr.send();
    vi.runAllTimers();

    expect(onload).toHaveBeenCalledTimes(1);
    expect(onreadystatechange).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(xhr.responseText).toBe('{"ok":true}');
    expect(xhr.getResponseHeader('content-type')).toBe('application/json');
    expect(xhr.getResponseHeader('X-CUSTOM')).toBe('1');
    expect(send).not.toHaveBeenCalled();
  });

  it('block fires onerror once', () => {
    install({
      'GET:https://api.test/a': { enabled: true, interceptionMode: 'block' },
    });
    const xhr = new XMLHttpRequest();
    const onerror = vi.fn();
    xhr.onerror = onerror;
    xhr.open('GET', 'https://api.test/a');
    xhr.send();
    vi.runAllTimers();
    expect(onerror).toHaveBeenCalledTimes(1);
  });
});
