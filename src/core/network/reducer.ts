/**
 * CDP `Network.*` event → request state.
 *
 * Pure (no browser APIs): each event updates a plain per-tab map of requests
 * and reports what the caller must do next (broadcast, drop cached bodies of
 * evicted requests, prefetch a body). The service worker owns the maps and
 * the side effects.
 */
import type { NetworkRequest } from '@/types/network';
import { appendFrame, shouldPrefetchBody } from '../network-buffers';
import type {
  DataReceivedParams,
  LoadingFailedParams,
  LoadingFinishedParams,
  NetworkEventMap,
  NetworkEventMethod,
  RequestExtraInfoParams,
  RequestWillBeSentParams,
  ResponseExtraInfoParams,
  ResponseReceivedParams,
  WebSocketClosedParams,
  WebSocketCreatedParams,
  WebSocketFrameParams,
  WebSocketHandshakeRequestParams,
  WebSocketHandshakeResponseParams,
} from './cdp-types';
import { headersToArray, parseRequestUrl, toResourceType } from './url';

/** Responses at or below this encoded size are fetched eagerly. */
export const PREFETCH_BODY_MAX_BYTES = 512 * 1024;
/** WebSocket frame payloads above this are truncated. */
export const MAX_WS_FRAME_CHARS = 64 * 1024;

/** One tab's requests by CDP request id, in insertion (arrival) order. */
export type TabRequests = Map<string, NetworkRequest>;

export interface ReducerOptions {
  maxRequests: number;
  webSocketFrames: number;
  maxFrameChars?: number;
  prefetchMaxBytes?: number;
  /** Wall clock, for events without a timestamp. */
  now?: () => number;
}

export interface ReduceResult {
  /** The store changed: the UI should be told. */
  changed: boolean;
  /** Request ids dropped by the request limit (their cached bodies must go too). */
  evicted: string[];
  /** A finished request whose body should be fetched now. */
  prefetch?: { requestId: string; mimeType?: string };
}

interface Ctx {
  store: TabRequests;
  tabId: number;
  options: ReducerOptions;
  result: ReduceResult;
}

/** Merge `data` into a request (creating it), then evict the oldest beyond the limit. */
function upsert(ctx: Ctx, requestId: string, data: Partial<NetworkRequest>): void {
  const { store, options, result } = ctx;
  const existing = store.get(requestId) || ({} as NetworkRequest);
  store.set(requestId, { ...existing, ...data, requestId } as NetworkRequest);

  // Map iteration is insertion order: drop the oldest beyond the limit
  for (const oldest of store.keys()) {
    if (store.size <= options.maxRequests) break;
    store.delete(oldest);
    result.evicted.push(oldest);
  }
  result.changed = true;
}

function requestWillBeSent(ctx: Ctx, params: RequestWillBeSentParams): void {
  const { requestId, request, timestamp, type, initiator, frameId, redirectResponse } = params;

  if (redirectResponse) {
    upsert(ctx, requestId, {
      statusCode: redirectResponse.status,
      statusLine: redirectResponse.statusText,
      responseHeaders: headersToArray(redirectResponse.headers),
      mimeType: redirectResponse.mimeType,
      redirectedTo: request.url,
    });
  }

  upsert(ctx, requestId, {
    requestId,
    url: request.url,
    method: request.method as NetworkRequest['method'],
    type: toResourceType(type),
    resourceType: type,
    tabId: ctx.tabId,
    // CDP frame ids are strings; kept as-is (the field is informational)
    frameId: frameId as unknown as number,
    startTime: timestamp * 1000,
    status: 'pending',
    requestHeaders: headersToArray(request.headers),
    responseHeaders: [],
    ...parseRequestUrl(request.url),
    initiator: initiator?.url || initiator?.type || '',
    hasPostData: request.hasPostData || false,
    postData: request.postData || undefined,
    timing: { startTime: timestamp * 1000 },
  });
}

function requestExtraInfo(ctx: Ctx, { requestId, headers }: RequestExtraInfoParams): void {
  upsert(ctx, requestId, { requestHeaders: headersToArray(headers) });
}

function responseReceived(ctx: Ctx, { requestId, response, timestamp }: ResponseReceivedParams): void {
  const updates: Partial<NetworkRequest> = {
    statusCode: response.status,
    statusLine: response.statusText,
    responseHeaders: headersToArray(response.headers),
    mimeType: response.mimeType,
    contentType: response.headers?.['content-type'] || response.mimeType,
    protocol: response.protocol,
    remoteIPAddress: response.remoteIPAddress,
    remotePort: response.remotePort,
    fromCache: response.fromDiskCache || response.fromPrefetchCache || false,
    fromServiceWorker: response.fromServiceWorker || false,
    encodedDataLength: response.encodedDataLength || 0,
    status: response.status >= 400 ? 'error' : 'loading',
    ip: response.remoteIPAddress,
  };

  const t = response.timing;
  if (t) {
    updates.timing = {
      dnsStart: t.dnsStart,
      dnsEnd: t.dnsEnd,
      connectStart: t.connectStart,
      connectEnd: t.connectEnd,
      sslStart: t.sslStart,
      sslEnd: t.sslEnd,
      sendStart: t.sendStart,
      sendEnd: t.sendEnd,
      receiveHeadersEnd: t.receiveHeadersEnd,
      responseStart: timestamp * 1000,
    };
  }

  upsert(ctx, requestId, updates);
}

function responseExtraInfo(ctx: Ctx, { requestId, headers, statusCode }: ResponseExtraInfoParams): void {
  upsert(ctx, requestId, { responseHeaders: headersToArray(headers), statusCode });
}

function dataReceived(ctx: Ctx, { requestId, dataLength, encodedDataLength }: DataReceivedParams): void {
  const existing = ctx.store.get(requestId);
  if (!existing) return;
  upsert(ctx, requestId, {
    size: (existing.size || 0) + dataLength,
    encodedSize: (existing.encodedSize || 0) + encodedDataLength,
  });
}

function loadingFinished(ctx: Ctx, { requestId, timestamp, encodedDataLength }: LoadingFinishedParams): void {
  const request = ctx.store.get(requestId);
  if (!request) return;

  upsert(ctx, requestId, {
    status: request.statusCode && request.statusCode >= 400 ? 'error' : 'complete',
    encodedSize: encodedDataLength || request.encodedSize,
    duration: timestamp * 1000 - request.startTime,
    timing: { ...request.timing, responseEnd: timestamp * 1000 },
  });

  // Eagerly fetch small API/document bodies before Chrome evicts them from the
  // debugger buffer; everything else is fetched on demand.
  const finished = { ...request, encodedSize: encodedDataLength || request.encodedSize };
  if (shouldPrefetchBody(finished, ctx.options.prefetchMaxBytes ?? PREFETCH_BODY_MAX_BYTES)) {
    ctx.result.prefetch = { requestId, mimeType: request.mimeType };
  }
}

function loadingFailed(ctx: Ctx, { requestId, timestamp, errorText, canceled }: LoadingFailedParams): void {
  const request = ctx.store.get(requestId);
  // Late failures for requests cleared by a navigation would create ghost rows
  if (!request) return;

  upsert(ctx, requestId, {
    status: 'error',
    error: canceled ? 'Request canceled' : errorText,
    duration: timestamp * 1000 - request.startTime,
    timing: { ...request.timing, responseEnd: timestamp * 1000 },
  });
}

function webSocketCreated(ctx: Ctx, { requestId, url, initiator }: WebSocketCreatedParams): void {
  const { hostname, pathname, filename } = parseRequestUrl(url);
  upsert(ctx, requestId, {
    requestId,
    url,
    method: 'WS',
    type: 'websocket',
    resourceType: 'WebSocket',
    tabId: ctx.tabId,
    hostname,
    pathname,
    filename,
    query: '',
    initiator: initiator?.url || initiator?.type || 'unknown',
    requestHeaders: [],
    responseHeaders: [],
    startTime: (ctx.options.now ?? Date.now)(),
    status: 'pending',
  });
}

function webSocketHandshakeRequest(ctx: Ctx, { requestId, timestamp, request }: WebSocketHandshakeRequestParams): void {
  upsert(ctx, requestId, {
    requestHeaders: headersToArray(request?.headers || {}),
    startTime: timestamp * 1000,
    status: 'loading',
  });
}

function webSocketHandshakeResponse(ctx: Ctx, { requestId, timestamp, response }: WebSocketHandshakeResponseParams): void {
  upsert(ctx, requestId, {
    statusCode: response?.status || 101,
    statusLine: response?.statusText || 'Switching Protocols',
    responseHeaders: headersToArray(response?.headers || {}),
    status: 'complete',
    timing: { responseStart: timestamp * 1000 },
  });
}

function webSocketFrame(ctx: Ctx, direction: 'sent' | 'received', params: WebSocketFrameParams): void {
  const { requestId, timestamp, response } = params;
  const request = ctx.store.get(requestId);
  if (!request) return;

  const payloadData = response?.payloadData || '';
  const payloadLength = payloadData.length;

  // Frames are appended in place and bounded, so a busy socket neither grows
  // without limit nor copies its whole history on every frame.
  const wsFrames = request.wsFrames || [];
  appendFrame(
    wsFrames,
    {
      type: direction,
      timestamp: timestamp * 1000,
      opcode: response?.opcode || 1,
      data: payloadData,
      length: payloadLength,
      mask: response?.mask,
    },
    {
      maxFrames: ctx.options.webSocketFrames,
      maxPayloadChars: ctx.options.maxFrameChars ?? MAX_WS_FRAME_CHARS,
    }
  );

  const updates: Partial<NetworkRequest> = { wsFrames, duration: timestamp * 1000 - request.startTime };
  if (direction === 'sent') {
    updates.wsFramesSent = (request.wsFramesSent || 0) + 1;
    updates.wsSentSize = (request.wsSentSize || 0) + payloadLength;
  } else {
    updates.wsFramesReceived = (request.wsFramesReceived || 0) + 1;
    updates.wsReceivedSize = (request.wsReceivedSize || 0) + payloadLength;
    updates.size = updates.wsReceivedSize;
  }
  upsert(ctx, requestId, updates);
}

function webSocketClosed(ctx: Ctx, { requestId, timestamp }: WebSocketClosedParams): void {
  const request = ctx.store.get(requestId);
  if (!request) return;
  upsert(ctx, requestId, {
    status: 'complete',
    duration: timestamp * 1000 - request.startTime,
    timing: { ...request.timing, responseEnd: timestamp * 1000 },
  });
}

const handlers: { [M in NetworkEventMethod]: (ctx: Ctx, params: NetworkEventMap[M]) => void } = {
  'Network.requestWillBeSent': requestWillBeSent,
  'Network.requestWillBeSentExtraInfo': requestExtraInfo,
  'Network.responseReceived': responseReceived,
  'Network.responseReceivedExtraInfo': responseExtraInfo,
  'Network.dataReceived': dataReceived,
  'Network.loadingFinished': loadingFinished,
  'Network.loadingFailed': loadingFailed,
  'Network.webSocketCreated': webSocketCreated,
  'Network.webSocketWillSendHandshakeRequest': webSocketHandshakeRequest,
  'Network.webSocketHandshakeResponseReceived': webSocketHandshakeResponse,
  'Network.webSocketFrameSent': (ctx, params) => webSocketFrame(ctx, 'sent', params),
  'Network.webSocketFrameReceived': (ctx, params) => webSocketFrame(ctx, 'received', params),
  'Network.webSocketClosed': webSocketClosed,
};

export function isNetworkEvent(method: string): method is NetworkEventMethod {
  return Object.prototype.hasOwnProperty.call(handlers, method);
}

/**
 * Apply one CDP event to a tab's request map (mutated in place). Unknown
 * methods are ignored.
 */
export function reduceNetworkEvent(
  store: TabRequests,
  tabId: number,
  method: string,
  params: unknown,
  options: ReducerOptions
): ReduceResult {
  const result: ReduceResult = { changed: false, evicted: [] };
  if (!isNetworkEvent(method) || !params) return result;
  const handler = handlers[method] as (ctx: Ctx, params: unknown) => void;
  handler({ store, tabId, options, result }, params);
  return result;
}

/**
 * Listable requests, oldest first. Extra-info events can arrive for requests
 * whose main event never does (e.g. after a navigation cleared the map);
 * those partial entries are skipped.
 */
export function listRequests(store: TabRequests | undefined): NetworkRequest[] {
  if (!store) return [];
  return Array.from(store.values())
    .filter((request) => request.url && request.startTime)
    .sort((a, b) => a.startTime - b.startTime);
}
