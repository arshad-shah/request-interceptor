import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request, onEvent, MessageError } from '../messaging';

type Responder = (message: any, callback: (response?: unknown) => void) => void;

function installChrome(responder: Responder) {
  const listeners = new Set<(m: unknown) => void>();
  const runtime: any = {
    id: 'ext',
    lastError: undefined,
    sendMessage: vi.fn((message: any, callback: (r?: unknown) => void) => responder(message, callback)),
    onMessage: {
      addListener: (l: any) => listeners.add(l),
      removeListener: (l: any) => listeners.delete(l),
    },
  };
  (globalThis as any).chrome = { runtime };
  return { runtime, dispatch: (m: unknown) => listeners.forEach((l) => l(m)) };
}

describe('request', () => {
  afterEach(() => {
    delete (globalThis as any).chrome;
    vi.useRealTimers();
  });

  it('sends { type, payload } and resolves data', async () => {
    const { runtime } = installChrome((_m, cb) => cb({ ok: true, data: [1] }));
    await expect(request('GET_EVENTS', { tabId: 3 })).resolves.toEqual([1]);
    expect(runtime.sendMessage.mock.calls[0][0]).toEqual({ type: 'GET_EVENTS', payload: { tabId: 3 } });
  });

  it('throws a failed MessageError with the handler message', async () => {
    installChrome((_m, cb) => cb({ ok: false, error: 'Route not found: x' }));
    const error = await request('REMOVE_ROUTE', { route: 'x' }).catch((e) => e);
    expect(error).toBeInstanceOf(MessageError);
    expect(error).toMatchObject({ code: 'failed', message: 'Route not found: x', requestType: 'REMOVE_ROUTE' });
  });

  it('reports a missing receiver as unavailable', async () => {
    const { runtime } = installChrome((_m, cb) => {
      runtime.lastError = { message: 'Could not establish connection. Receiving end does not exist.' };
      cb(undefined);
      runtime.lastError = undefined;
    });
    await expect(request('GET_STATE')).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('times out when nothing answers', async () => {
    vi.useFakeTimers();
    installChrome(() => {});
    const pending = request('GET_STATE').catch((e) => e);
    vi.advanceTimersByTime(15_001);
    expect(await pending).toMatchObject({ code: 'timeout' });
  });

  it('fails fast when the extension context is gone', async () => {
    const { runtime } = installChrome(() => {});
    runtime.id = undefined;
    await expect(request('GET_STATE')).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('onEvent', () => {
  let dispatch: (m: unknown) => void;
  beforeEach(() => {
    ({ dispatch } = installChrome(() => {}));
  });

  it('delivers matching events until unsubscribed', () => {
    const cb = vi.fn();
    const off = onEvent('EVENT_MONITOR_CHANGED', cb);
    dispatch({ type: 'EVENT_MONITOR_CHANGED', payload: { enabled: true } });
    dispatch({ type: 'STATE_CHANGED', payload: { enabled: true, routes: {} } });
    off();
    dispatch({ type: 'EVENT_MONITOR_CHANGED', payload: { enabled: false } });
    expect(cb.mock.calls).toEqual([[{ enabled: true }]]);
  });
});
