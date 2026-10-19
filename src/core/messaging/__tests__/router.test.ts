import { describe, it, expect, vi } from 'vitest';
import { MessageRouter } from '../router';
import { isEventMessage } from '../protocol';

const self = { id: 'ext-id', baseUrl: 'chrome-extension://ext-id/' };
const sender = { id: 'ext-id', url: 'chrome-extension://ext-id/ui/sidepanel/index.html' } as chrome.runtime.MessageSender;
const contentSender = { id: 'ext-id', url: 'https://shop.test/', tab: { id: 7 } } as chrome.runtime.MessageSender;

function call(router: MessageRouter, message: unknown, from: chrome.runtime.MessageSender = sender) {
  return new Promise<{ handled: boolean; response?: unknown }>((resolve) => {
    let handled = false;
    handled = router.listener(message, from, (response) => resolve({ handled, response }));
    if (!handled) resolve({ handled });
  });
}

describe('MessageRouter', () => {
  it('answers registered requests with { ok, data }', async () => {
    const router = new MessageRouter({ self }).on('GET_EVENTS', ({ tabId }) => [{ id: String(tabId) } as never]);
    expect(await call(router, { type: 'GET_EVENTS', payload: { tabId: 7 } })).toEqual({
      handled: true,
      response: { ok: true, data: [{ id: '7' }] },
    });
  });

  it('turns handler errors into { ok: false, error } and reports them', async () => {
    const onError = vi.fn();
    const router = new MessageRouter({ onError, self }).on('CLEAR_ROUTES', async () => {
      throw new Error('storage full');
    });
    const { response } = await call(router, { type: 'CLEAR_ROUTES' });
    expect(response).toEqual({ ok: false, error: 'storage full' });
    expect(onError).toHaveBeenCalledWith('CLEAR_ROUTES', expect.any(Error));
  });

  it('leaves unknown types and broadcast events unanswered for other listeners', async () => {
    const router = new MessageRouter({ self }).on('GET_STATE', () => ({ enabled: true, routes: {}, eventMonitorEnabled: false }));
    expect((await call(router, { type: 'STATE_CHANGED', payload: {} })).handled).toBe(false);
    expect((await call(router, { action: 'getState' })).handled).toBe(false);
    expect((await call(router, null)).handled).toBe(false);
  });

  it('waits for readiness before running handlers', async () => {
    let release!: () => void;
    const ready = new Promise<void>((r) => (release = r));
    const handler = vi.fn(() => undefined);
    const router = new MessageRouter({ ready, self }).on('CLEAR_ROUTES', handler);
    const pending = call(router, { type: 'CLEAR_ROUTES' });
    await Promise.resolve();
    expect(handler).not.toHaveBeenCalled();
    release();
    expect((await pending).response).toEqual({ ok: true, data: null });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('rejects duplicate registrations', () => {
    const router = new MessageRouter({ self }).on('CLEAR_ROUTES', () => undefined);
    expect(() => router.on('CLEAR_ROUTES', () => undefined)).toThrow(/Duplicate/);
  });
});

describe('sender authorization', () => {
  it('extension-only by default: content scripts are refused', async () => {
    const handler = vi.fn(() => undefined);
    const router = new MessageRouter({ self }).on('CLEAR_ROUTES', handler);
    expect((await call(router, { type: 'CLEAR_ROUTES' }, contentSender)).response).toEqual({ ok: false, error: 'Forbidden sender' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('extension pages opened in a tab still count as extension pages', async () => {
    const router = new MessageRouter({ self }).on('CLEAR_ROUTES', () => undefined);
    const inTab = { ...sender, tab: { id: 3 } } as chrome.runtime.MessageSender;
    expect((await call(router, { type: 'CLEAR_ROUTES' }, inTab)).response).toEqual({ ok: true, data: null });
  });

  it('content-only requests refuse extension pages and accept tabs', async () => {
    const router = new MessageRouter({ self }).on('EVENT_CAPTURED', () => undefined, { from: 'content' });
    const payload = { event: {}, tabUrl: 'https://shop.test/' };
    expect((await call(router, { type: 'EVENT_CAPTURED', payload }, sender)).response).toMatchObject({ ok: false });
    expect((await call(router, { type: 'EVENT_CAPTURED', payload }, contentSender)).response).toEqual({ ok: true, data: null });
  });

  it("'any' accepts both, but never another extension or an unknown sender", async () => {
    const router = new MessageRouter({ self }).on('GET_SETTINGS', () => ({}) as never, { from: 'any' });
    expect((await call(router, { type: 'GET_SETTINGS' }, sender)).response).toMatchObject({ ok: true });
    expect((await call(router, { type: 'GET_SETTINGS' }, contentSender)).response).toMatchObject({ ok: true });
    const other = { id: 'other-ext', url: 'chrome-extension://other-ext/x.html' } as chrome.runtime.MessageSender;
    expect((await call(router, { type: 'GET_SETTINGS' }, other)).response).toMatchObject({ ok: false });
    const noTab = { id: 'ext-id', url: 'https://shop.test/' } as chrome.runtime.MessageSender;
    expect((await call(router, { type: 'GET_SETTINGS' }, noTab)).response).toMatchObject({ ok: false });
  });
});

describe('isEventMessage', () => {
  it('recognizes broadcast events only', () => {
    expect(isEventMessage({ type: 'STATE_CHANGED', payload: {} })).toBe(true);
    expect(isEventMessage({ type: 'GET_STATE' })).toBe(false);
    expect(isEventMessage(undefined)).toBe(false);
  });
});
