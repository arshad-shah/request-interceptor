/**
 * Background request router: one onMessage listener, typed handlers, and a
 * uniform { ok, data | error } response. Messages without a registered
 * handler (e.g. broadcast events) are left unanswered so other listeners
 * aren't pre-empted.
 */
import type { PayloadOf, RequestType, Response, ResultOf } from './protocol';

export type Handler<K extends RequestType> = (
  payload: PayloadOf<K>,
  sender: chrome.runtime.MessageSender
) => ResultOf<K> | Promise<ResultOf<K>>;

type AnyHandler = (payload: unknown, sender: chrome.runtime.MessageSender) => unknown;

/**
 * Who may call a request. Content scripts live in web-page renderer
 * processes, so they are less trusted than the extension's own pages.
 *   extension — popup, side panel, options or other extension pages (default)
 *   content   — a content script in a tab (handlers must use sender.tab.id)
 *   any       — either; only for harmless reads
 */
export type SenderClass = 'extension' | 'content' | 'any';

export interface SenderIdentity {
  id: string;
  /** chrome.runtime.getURL('') — the extension origin with trailing slash. */
  baseUrl: string;
}

export function senderClassOf(sender: chrome.runtime.MessageSender, self: SenderIdentity): SenderClass | null {
  if (sender.id !== self.id) return null;
  // Extension pages are identified by URL (they may still be in a tab).
  if (sender.url?.startsWith(self.baseUrl)) return 'extension';
  if (sender.tab?.id !== undefined) return 'content';
  return null;
}

export interface RouterOptions {
  /** Awaited before every handler (e.g. persisted state loading). */
  ready?: Promise<unknown>;
  /** This extension's identity; defaults to chrome.runtime. */
  self?: SenderIdentity;
  onError?: (type: string, error: unknown) => void;
}

export class MessageRouter {
  private handlers = new Map<string, { handler: AnyHandler; from: SenderClass }>();

  constructor(private readonly options: RouterOptions = {}) {}

  on<K extends RequestType>(type: K, handler: Handler<K>, { from = 'extension' }: { from?: SenderClass } = {}): this {
    if (this.handlers.has(type)) throw new Error(`Duplicate handler for ${type}`);
    this.handlers.set(type, { handler: handler as AnyHandler, from });
    return this;
  }

  private allowed(from: SenderClass, sender: chrome.runtime.MessageSender): boolean {
    const self = this.options.self ?? { id: chrome.runtime.id, baseUrl: chrome.runtime.getURL('') };
    const actual = senderClassOf(sender, self);
    return actual !== null && (from === 'any' || from === actual);
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  /** The chrome.runtime.onMessage listener. */
  readonly listener = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: Response<unknown>) => void
  ): boolean => {
    const type = (message as { type?: unknown } | null)?.type;
    if (typeof type !== 'string') return false;
    const entry = this.handlers.get(type);
    if (!entry) return false;

    if (!this.allowed(entry.from, sender)) {
      this.options.onError?.(type, new Error('Forbidden sender'));
      sendResponse({ ok: false, error: 'Forbidden sender' });
      return false;
    }

    void this.dispatch(type, entry.handler, (message as { payload?: unknown }).payload, sender).then(sendResponse);
    return true;
  };

  private async dispatch(
    type: string,
    handler: AnyHandler,
    payload: unknown,
    sender: chrome.runtime.MessageSender
  ): Promise<Response<unknown>> {
    try {
      await this.options.ready;
      const data = await handler(payload, sender);
      return { ok: true, data: data ?? null };
    } catch (error) {
      this.options.onError?.(type, error);
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  listen(runtime: Pick<typeof chrome.runtime, 'onMessage'> = chrome.runtime): void {
    runtime.onMessage.addListener(this.listener);
  }
}
