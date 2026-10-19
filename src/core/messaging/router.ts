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

export interface RouterOptions {
  /** Awaited before every handler (e.g. persisted state loading). */
  ready?: Promise<unknown>;
  onError?: (type: string, error: unknown) => void;
}

export class MessageRouter {
  private handlers = new Map<string, AnyHandler>();

  constructor(private readonly options: RouterOptions = {}) {}

  on<K extends RequestType>(type: K, handler: Handler<K>): this {
    if (this.handlers.has(type)) throw new Error(`Duplicate handler for ${type}`);
    this.handlers.set(type, handler as AnyHandler);
    return this;
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
    const handler = this.handlers.get(type);
    if (!handler) return false;

    void this.dispatch(type, handler, (message as { payload?: unknown }).payload, sender).then(sendResponse);
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
