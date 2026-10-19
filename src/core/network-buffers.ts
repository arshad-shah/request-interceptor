/**
 * Bounded buffers for network capture.
 *
 * Pure helpers (no browser APIs) that keep the network monitor's memory use
 * flat regardless of how much traffic a page produces.
 */

export interface CachedBody {
  body: string;
  base64Encoded: boolean;
  mimeType?: string;
  truncated?: boolean;
}

export interface BoundedFrame {
  type: 'sent' | 'received';
  timestamp: number;
  opcode: number;
  data: string;
  length: number;
  mask?: boolean;
  truncated?: boolean;
}

export function bodyKey(tabId: number, requestId: string): string {
  return `${tabId}:${requestId}`;
}

/**
 * Response body cache with a total character budget. Least recently used
 * entries are evicted first; single bodies above `maxEntryChars` are truncated
 * (text) or dropped (base64, which would be invalid if cut).
 */
export class BodyCache {
  private entries = new Map<string, CachedBody>();
  private total = 0;

  constructor(private limits: { maxTotalChars: number; maxEntryChars: number }) {}

  /** Change the total budget, evicting least recently used entries if now over it. */
  setMaxTotalChars(maxTotalChars: number): void {
    this.limits = { ...this.limits, maxTotalChars };
    for (const [key] of this.entries) {
      if (this.total <= maxTotalChars) break;
      this.delete(key);
    }
  }

  get totalChars(): number {
    return this.total;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  get(key: string): CachedBody | undefined {
    const entry = this.entries.get(key);
    if (entry) {
      // Re-insert to mark as most recently used
      this.entries.delete(key);
      this.entries.set(key, entry);
    }
    return entry;
  }

  set(key: string, body: CachedBody): CachedBody {
    this.delete(key);

    let stored = body;
    if (body.body.length > this.limits.maxEntryChars) {
      stored = {
        ...body,
        body: body.base64Encoded ? '' : body.body.slice(0, this.limits.maxEntryChars),
        truncated: true,
      };
    }

    this.entries.set(key, stored);
    this.total += stored.body.length;

    for (const [oldestKey] of this.entries) {
      if (this.total <= this.limits.maxTotalChars || oldestKey === key) break;
      this.delete(oldestKey);
    }
    return stored;
  }

  delete(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.total -= entry.body.length;
    this.entries.delete(key);
  }

  deleteTab(tabId: number): void {
    const prefix = `${tabId}:`;
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) this.delete(key);
    }
  }
}

/**
 * Append a WebSocket frame in place, truncating its payload and dropping the
 * oldest frames beyond `maxFrames`.
 */
export function appendFrame(
  frames: BoundedFrame[],
  frame: BoundedFrame,
  limits: { maxFrames: number; maxPayloadChars: number }
): void {
  if (frame.data.length > limits.maxPayloadChars) {
    frame = { ...frame, data: frame.data.slice(0, limits.maxPayloadChars), truncated: true };
  }
  frames.push(frame);
  if (frames.length > limits.maxFrames) {
    frames.splice(0, frames.length - limits.maxFrames);
  }
}

/** Strip heavy fields before sending a request to the UI in list updates. */
export function toRequestSummary<T extends { responseBody?: unknown; wsFrames?: unknown }>(
  request: T
): Omit<T, 'responseBody' | 'wsFrames'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { responseBody, wsFrames, ...summary } = request;
  return summary;
}

const NON_TEXT_TYPES = new Set(['image', 'media', 'font', 'websocket']);

/** Requests whose body is worth keeping/exporting (not images, fonts, media or sockets). */
export function hasFetchableBody(request: { type?: string }): boolean {
  return !NON_TEXT_TYPES.has(request.type ?? '');
}

const TEXT_MIME = /^(text\/|application\/(json|[\w.+-]*\+json|xml|[\w.+-]*\+xml|x-www-form-urlencoded|graphql|javascript))/i;

/**
 * Bodies worth fetching eagerly (before Chrome evicts them from the debugger
 * buffer): small textual API and document responses.
 */
export function shouldPrefetchBody(
  request: { type?: string; mimeType?: string; encodedSize?: number },
  maxChars: number
): boolean {
  if (request.type !== 'xhr' && request.type !== 'document') return false;
  if (!request.mimeType || !TEXT_MIME.test(request.mimeType)) return false;
  return (request.encodedSize ?? 0) <= maxChars;
}
