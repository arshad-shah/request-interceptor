/**
 * Typed messaging client for extension pages and content scripts, plus the
 * background's broadcast helpers.
 */
import {
  DEFAULT_REQUEST_TIMEOUT,
  REQUEST_TIMEOUTS,
  type EventMessage,
  type Events,
  type EventType,
  type PayloadOf,
  type RequestType,
  type Response,
  type ResultOf,
} from '@/core/messaging/protocol';

export type MessageErrorCode = 'timeout' | 'unavailable' | 'failed';

export class MessageError extends Error {
  constructor(
    readonly code: MessageErrorCode,
    message: string,
    readonly requestType?: string
  ) {
    super(message);
    this.name = 'MessageError';
  }
}

type PayloadArgs<K extends RequestType> = PayloadOf<K> extends void ? [] : [PayloadOf<K>];

/** Send a request to the background and resolve its result, or throw MessageError. */
export function request<K extends RequestType>(type: K, ...args: PayloadArgs<K>): Promise<ResultOf<K>> {
  const timeoutMs = REQUEST_TIMEOUTS[type] ?? DEFAULT_REQUEST_TIMEOUT;
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
      reject(new MessageError('unavailable', 'Extension context is unavailable (was it reloaded?)', type));
      return;
    }
    const timer = setTimeout(
      () => reject(new MessageError('timeout', `${type} timed out after ${timeoutMs / 1000}s`, type)),
      timeoutMs
    );
    try {
      chrome.runtime.sendMessage({ type, payload: args[0] }, (response: Response<ResultOf<K>> | undefined) => {
        clearTimeout(timer);
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new MessageError('unavailable', lastError.message ?? 'No receiver', type));
        } else if (!response) {
          reject(new MessageError('unavailable', `No handler answered ${type}`, type));
        } else if (!response.ok) {
          reject(new MessageError('failed', response.error, type));
        } else {
          resolve(response.data);
        }
      });
    } catch (error) {
      clearTimeout(timer);
      reject(new MessageError('unavailable', error instanceof Error ? error.message : String(error), type));
    }
  });
}

/** Subscribe to a broadcast event. Returns an unsubscribe function. */
export function onEvent<K extends EventType>(type: K, callback: (payload: Events[K]) => void): () => void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return () => {};
  const listener = (message: unknown) => {
    const m = message as EventMessage | null;
    if (m?.type === type) callback(m.payload as Events[K]);
    return false;
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

/** Background: broadcast to extension pages (no-op when none are open). */
export function emit<K extends EventType>(type: K, payload: Events[K]): void {
  chrome.runtime.sendMessage({ type, payload } satisfies EventMessage<K>).catch(() => {
    /* no extension page is listening */
  });
}

/** Background: send an event to the content scripts of all http(s) tabs. */
export function emitToTabs<K extends EventType>(type: K, payload: Events[K], tabId?: number): void {
  const send = (id: number) =>
    chrome.tabs.sendMessage(id, { type, payload } satisfies EventMessage<K>).catch(() => {
      /* tab has no content script (restricted page, still loading) */
    });
  if (tabId !== undefined) {
    void send(tabId);
    return;
  }
  chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
    for (const tab of tabs) if (tab.id !== undefined) void send(tab.id);
  });
}
