import { describe, it, expect } from 'vitest';
import {
  MAX_WS_FRAME_CHARS,
  listRequests,
  reduceNetworkEvent,
  type ReducerOptions,
  type TabRequests,
} from '../network/reducer';

const TAB = 7;
const opts: ReducerOptions = { maxRequests: 500, webSocketFrames: 500, now: () => 1_000 };

function apply(store: TabRequests, method: string, params: unknown, options: ReducerOptions = opts) {
  return reduceNetworkEvent(store, TAB, method, params, options);
}

function sent(store: TabRequests, requestId: string, url = 'https://api.test/v1/users?id=3', extra = {}) {
  return apply(store, 'Network.requestWillBeSent', {
    requestId,
    timestamp: 10,
    type: 'Fetch',
    initiator: { type: 'script', url: 'https://app.test/main.js' },
    request: { url, method: 'GET', headers: { Accept: 'application/json' } },
    ...extra,
  });
}

function respond(store: TabRequests, requestId: string, status = 200, mimeType = 'application/json') {
  return apply(store, 'Network.responseReceived', {
    requestId,
    timestamp: 10.2,
    response: {
      status,
      statusText: 'OK',
      mimeType,
      protocol: 'h2',
      remoteIPAddress: '10.0.0.1',
      remotePort: 443,
      headers: { 'content-type': `${mimeType}; charset=utf-8` },
      timing: { dnsStart: 1, dnsEnd: 2, sendStart: 3, sendEnd: 4, receiveHeadersEnd: 50 },
    },
  });
}

describe('reduceNetworkEvent: HTTP lifecycle', () => {
  it('requestWillBeSent creates a pending request with parsed URL fields', () => {
    const store: TabRequests = new Map();
    const result = sent(store, 'r1');
    expect(result).toEqual({ changed: true, evicted: [] });
    expect(store.get('r1')).toMatchObject({
      requestId: 'r1',
      tabId: TAB,
      url: 'https://api.test/v1/users?id=3',
      method: 'GET',
      type: 'xhr',
      resourceType: 'Fetch',
      status: 'pending',
      hostname: 'api.test',
      pathname: '/v1/users',
      filename: 'users',
      query: '?id=3',
      initiator: 'https://app.test/main.js',
      startTime: 10_000,
      timing: { startTime: 10_000 },
      requestHeaders: [{ name: 'Accept', value: 'application/json' }],
      responseHeaders: [],
      hasPostData: false,
    });
  });

  it('requestWillBeSentExtraInfo replaces request headers', () => {
    const store: TabRequests = new Map();
    sent(store, 'r1');
    apply(store, 'Network.requestWillBeSentExtraInfo', { requestId: 'r1', headers: { Cookie: 'a=1' } });
    expect(store.get('r1')?.requestHeaders).toEqual([{ name: 'Cookie', value: 'a=1' }]);
  });

  it('responseReceived records status, headers, timing and loading state', () => {
    const store: TabRequests = new Map();
    sent(store, 'r1');
    respond(store, 'r1');
    expect(store.get('r1')).toMatchObject({
      statusCode: 200,
      status: 'loading',
      mimeType: 'application/json',
      contentType: 'application/json; charset=utf-8',
      protocol: 'h2',
      ip: '10.0.0.1',
      remotePort: 443,
      fromCache: false,
      timing: { dnsStart: 1, receiveHeadersEnd: 50, responseStart: 10_200 },
    });
  });

  it('marks 4xx/5xx responses as errors', () => {
    const store: TabRequests = new Map();
    sent(store, 'r1');
    respond(store, 'r1', 404);
    expect(store.get('r1')?.status).toBe('error');
  });

  it('responseReceivedExtraInfo overrides response headers and status code', () => {
    const store: TabRequests = new Map();
    sent(store, 'r1');
    respond(store, 'r1');
    apply(store, 'Network.responseReceivedExtraInfo', { requestId: 'r1', statusCode: 201, headers: { 'set-cookie': 'x' } });
    expect(store.get('r1')).toMatchObject({ statusCode: 201, responseHeaders: [{ name: 'set-cookie', value: 'x' }] });
  });

  it('dataReceived accumulates sizes, but only for known requests', () => {
    const store: TabRequests = new Map();
    sent(store, 'r1');
    apply(store, 'Network.dataReceived', { requestId: 'r1', dataLength: 100, encodedDataLength: 40 });
    apply(store, 'Network.dataReceived', { requestId: 'r1', dataLength: 50, encodedDataLength: 10 });
    expect(store.get('r1')).toMatchObject({ size: 150, encodedSize: 50 });

    const ghost = apply(store, 'Network.dataReceived', { requestId: 'nope', dataLength: 1, encodedDataLength: 1 });
    expect(ghost.changed).toBe(false);
    expect(store.has('nope')).toBe(false);
  });

  it('loadingFinished completes the request and asks to prefetch small JSON bodies', () => {
    const store: TabRequests = new Map();
    sent(store, 'r1');
    respond(store, 'r1');
    const result = apply(store, 'Network.loadingFinished', { requestId: 'r1', timestamp: 10.5, encodedDataLength: 1234 });
    expect(store.get('r1')).toMatchObject({
      status: 'complete',
      encodedSize: 1234,
      duration: 500,
      timing: { dnsStart: 1, responseEnd: 10_500 },
    });
    expect(result.prefetch).toEqual({ requestId: 'r1', mimeType: 'application/json' });
  });

  it('does not prefetch large or non-text bodies', () => {
    const store: TabRequests = new Map();
    sent(store, 'big');
    respond(store, 'big');
    const big = apply(store, 'Network.loadingFinished', { requestId: 'big', timestamp: 11, encodedDataLength: 600 * 1024 });
    expect(big.prefetch).toBeUndefined();

    sent(store, 'img');
    respond(store, 'img', 200, 'image/png');
    const img = apply(store, 'Network.loadingFinished', { requestId: 'img', timestamp: 11, encodedDataLength: 10 });
    expect(img.prefetch).toBeUndefined();
  });

  it('loadingFinished keeps 4xx requests in error state', () => {
    const store: TabRequests = new Map();
    sent(store, 'r1');
    respond(store, 'r1', 500);
    apply(store, 'Network.loadingFinished', { requestId: 'r1', timestamp: 11 });
    expect(store.get('r1')?.status).toBe('error');
  });

  it('loadingFailed records the error (and cancellation)', () => {
    const store: TabRequests = new Map();
    sent(store, 'a');
    sent(store, 'b');
    apply(store, 'Network.loadingFailed', { requestId: 'a', timestamp: 10.1, errorText: 'net::ERR_FAILED' });
    apply(store, 'Network.loadingFailed', { requestId: 'b', timestamp: 10.1, errorText: 'net::ERR_ABORTED', canceled: true });
    expect(store.get('a')).toMatchObject({ status: 'error', error: 'net::ERR_FAILED', duration: 100 });
    expect(store.get('b')?.error).toBe('Request canceled');
  });

  it('follows redirects: the redirect response is merged before the new URL', () => {
    const store: TabRequests = new Map();
    sent(store, 'r1', 'http://api.test/old');
    sent(store, 'r1', 'https://api.test/new', {
      redirectResponse: { status: 301, statusText: 'Moved Permanently', headers: { location: '/new' }, mimeType: 'text/html' },
    });
    expect(store.size).toBe(1);
    expect(store.get('r1')).toMatchObject({
      url: 'https://api.test/new',
      redirectedTo: 'https://api.test/new',
      statusCode: 301,
      // the new hop starts fresh: no response headers yet
      responseHeaders: [],
      status: 'pending',
    });
  });

  it('ignores unknown methods and missing params', () => {
    const store: TabRequests = new Map();
    expect(apply(store, 'Network.somethingElse', { requestId: 'x' }).changed).toBe(false);
    expect(apply(store, 'toString', { requestId: 'x' }).changed).toBe(false);
    expect(apply(store, 'Network.requestWillBeSent', undefined).changed).toBe(false);
    expect(store.size).toBe(0);
  });
});

describe('reduceNetworkEvent: ghost entries after a clear', () => {
  it('late completion/failure events for cleared requests create nothing', () => {
    const store: TabRequests = new Map();
    sent(store, 'r1');
    store.clear();
    expect(apply(store, 'Network.loadingFinished', { requestId: 'r1', timestamp: 11 }).changed).toBe(false);
    expect(apply(store, 'Network.loadingFailed', { requestId: 'r1', timestamp: 11, errorText: 'x' }).changed).toBe(false);
    expect(apply(store, 'Network.webSocketClosed', { requestId: 'r1', timestamp: 11 }).changed).toBe(false);
    expect(store.size).toBe(0);
  });

  it('late extra-info events leave partial entries that are never listed', () => {
    const store: TabRequests = new Map();
    apply(store, 'Network.requestWillBeSentExtraInfo', { requestId: 'r1', headers: { a: 'b' } });
    apply(store, 'Network.responseReceivedExtraInfo', { requestId: 'r2', statusCode: 200, headers: {} });
    expect(store.size).toBe(2);
    expect(listRequests(store)).toEqual([]);
  });
});

describe('reduceNetworkEvent: request limit', () => {
  it('evicts the oldest requests beyond maxRequests and reports them', () => {
    const store: TabRequests = new Map();
    const small = { ...opts, maxRequests: 3 };
    const evicted: string[] = [];
    for (let i = 0; i < 5; i++) {
      evicted.push(...apply(store, 'Network.requestWillBeSent', {
        requestId: `r${i}`,
        timestamp: i,
        type: 'Fetch',
        request: { url: `https://api.test/${i}`, method: 'GET' },
      }, small).evicted);
    }
    expect([...store.keys()]).toEqual(['r2', 'r3', 'r4']);
    expect(evicted).toEqual(['r0', 'r1']);
  });
});

describe('listRequests', () => {
  it('returns complete requests sorted by start time', () => {
    const store: TabRequests = new Map();
    apply(store, 'Network.requestWillBeSent', { requestId: 'late', timestamp: 20, request: { url: 'https://a.test/2', method: 'GET' } });
    apply(store, 'Network.requestWillBeSent', { requestId: 'early', timestamp: 5, request: { url: 'https://a.test/1', method: 'GET' } });
    expect(listRequests(store).map((r) => r.requestId)).toEqual(['early', 'late']);
    expect(listRequests(undefined)).toEqual([]);
  });
});

describe('reduceNetworkEvent: WebSockets', () => {
  function open(store: TabRequests, options = opts) {
    apply(store, 'Network.webSocketCreated', { requestId: 'ws', url: 'wss://rt.test/socket', initiator: { type: 'script' } }, options);
    apply(store, 'Network.webSocketWillSendHandshakeRequest', { requestId: 'ws', timestamp: 2, request: { headers: { Upgrade: 'websocket' } } }, options);
    apply(store, 'Network.webSocketHandshakeResponseReceived', { requestId: 'ws', timestamp: 2.1, response: { status: 101 } }, options);
  }

  it('tracks creation and handshake', () => {
    const store: TabRequests = new Map();
    apply(store, 'Network.webSocketCreated', { requestId: 'ws', url: 'wss://rt.test/socket' });
    expect(store.get('ws')).toMatchObject({ method: 'WS', type: 'websocket', status: 'pending', startTime: 1_000, filename: 'socket', initiator: 'unknown' });
    open(store);
    expect(store.get('ws')).toMatchObject({
      status: 'complete',
      statusCode: 101,
      statusLine: 'Switching Protocols',
      startTime: 2_000,
      requestHeaders: [{ name: 'Upgrade', value: 'websocket' }],
      timing: { responseStart: 2_100 },
    });
  });

  it('counts frames in each direction', () => {
    const store: TabRequests = new Map();
    open(store);
    apply(store, 'Network.webSocketFrameSent', { requestId: 'ws', timestamp: 3, response: { opcode: 1, payloadData: 'ping' } });
    apply(store, 'Network.webSocketFrameReceived', { requestId: 'ws', timestamp: 3.5, response: { opcode: 1, payloadData: 'pong!' } });
    expect(store.get('ws')).toMatchObject({
      wsFramesSent: 1,
      wsSentSize: 4,
      wsFramesReceived: 1,
      wsReceivedSize: 5,
      size: 5,
      duration: 1_500,
    });
    expect(store.get('ws')?.wsFrames?.map((f) => f.type)).toEqual(['sent', 'received']);
  });

  it('caps frame count and payload size', () => {
    const store: TabRequests = new Map();
    const capped = { ...opts, webSocketFrames: 3 };
    open(store, capped);
    for (let i = 0; i < 5; i++) {
      apply(store, 'Network.webSocketFrameReceived', { requestId: 'ws', timestamp: 3 + i, response: { payloadData: `m${i}` } }, capped);
    }
    const huge = 'x'.repeat(MAX_WS_FRAME_CHARS + 10);
    apply(store, 'Network.webSocketFrameReceived', { requestId: 'ws', timestamp: 9, response: { payloadData: huge } }, capped);

    const ws = store.get('ws')!;
    expect(ws.wsFrames?.map((f) => f.data.slice(0, 2))).toEqual(['m3', 'm4', 'xx']);
    expect(ws.wsFramesReceived).toBe(6);
    const last = ws.wsFrames![2];
    expect(last).toMatchObject({ truncated: true, length: MAX_WS_FRAME_CHARS + 10 });
    expect(last.data.length).toBe(MAX_WS_FRAME_CHARS);
  });

  it('ignores frames for unknown sockets and completes on close', () => {
    const store: TabRequests = new Map();
    expect(apply(store, 'Network.webSocketFrameSent', { requestId: 'ws', timestamp: 1, response: { payloadData: 'x' } }).changed).toBe(false);
    open(store);
    apply(store, 'Network.webSocketClosed', { requestId: 'ws', timestamp: 4 });
    expect(store.get('ws')).toMatchObject({ status: 'complete', duration: 2_000, timing: { responseEnd: 4_000 } });
  });
});
