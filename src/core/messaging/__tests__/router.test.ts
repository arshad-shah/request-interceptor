import { describe, it, expect, vi } from 'vitest';
import { MessageRouter } from '../router';
import { isEventMessage } from '../protocol';

const sender = {} as chrome.runtime.MessageSender;

function call(router: MessageRouter, message: unknown) {
  return new Promise<{ handled: boolean; response?: unknown }>((resolve) => {
    let handled = false;
    handled = router.listener(message, sender, (response) => resolve({ handled, response }));
    if (!handled) resolve({ handled });
  });
}

describe('MessageRouter', () => {
  it('answers registered requests with { ok, data }', async () => {
    const router = new MessageRouter().on('GET_EVENTS', ({ tabId }) => [{ id: String(tabId) } as never]);
    expect(await call(router, { type: 'GET_EVENTS', payload: { tabId: 7 } })).toEqual({
      handled: true,
      response: { ok: true, data: [{ id: '7' }] },
    });
  });

  it('turns handler errors into { ok: false, error } and reports them', async () => {
    const onError = vi.fn();
    const router = new MessageRouter({ onError }).on('CLEAR_ROUTES', async () => {
      throw new Error('storage full');
    });
    const { response } = await call(router, { type: 'CLEAR_ROUTES' });
    expect(response).toEqual({ ok: false, error: 'storage full' });
    expect(onError).toHaveBeenCalledWith('CLEAR_ROUTES', expect.any(Error));
  });

  it('leaves unknown types and broadcast events unanswered for other listeners', async () => {
    const router = new MessageRouter().on('GET_STATE', () => ({ enabled: true, routes: {}, eventMonitorEnabled: false }));
    expect((await call(router, { type: 'STATE_CHANGED', payload: {} })).handled).toBe(false);
    expect((await call(router, { action: 'getState' })).handled).toBe(false);
    expect((await call(router, null)).handled).toBe(false);
  });

  it('waits for readiness before running handlers', async () => {
    let release!: () => void;
    const ready = new Promise<void>((r) => (release = r));
    const handler = vi.fn(() => undefined);
    const router = new MessageRouter({ ready }).on('CLEAR_ROUTES', handler);
    const pending = call(router, { type: 'CLEAR_ROUTES' });
    await Promise.resolve();
    expect(handler).not.toHaveBeenCalled();
    release();
    expect((await pending).response).toEqual({ ok: true, data: null });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('rejects duplicate registrations', () => {
    const router = new MessageRouter().on('CLEAR_ROUTES', () => undefined);
    expect(() => router.on('CLEAR_ROUTES', () => undefined)).toThrow(/Duplicate/);
  });
});

describe('isEventMessage', () => {
  it('recognizes broadcast events only', () => {
    expect(isEventMessage({ type: 'STATE_CHANGED', payload: {} })).toBe(true);
    expect(isEventMessage({ type: 'GET_STATE' })).toBe(false);
    expect(isEventMessage(undefined)).toBe(false);
  });
});
