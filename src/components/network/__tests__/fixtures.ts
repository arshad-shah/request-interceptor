import type { NetworkRequest, WebSocketFrame } from '../../../types/network';

/** Build a captured request with sensible defaults; synthetic data only. */
export function makeRequest(overrides: Partial<NetworkRequest> = {}): NetworkRequest {
  return {
    requestId: 'req-1',
    tabId: 1,
    url: 'https://api.example.test/v1/users?page=2&sort=name',
    hostname: 'api.example.test',
    pathname: '/v1/users',
    filename: 'users',
    query: '?page=2&sort=name',
    method: 'GET',
    type: 'fetch',
    requestHeaders: [
      { name: 'Accept', value: 'application/json' },
      { name: 'X-Trace-Id', value: 'trace-123' },
    ],
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Cache-Control', value: 'no-store' },
    ],
    statusCode: 200,
    mimeType: 'application/json',
    startTime: 1_700_000_000_000,
    duration: 250,
    encodedSize: 512,
    status: 'complete',
    ...overrides,
  };
}

export function makeFrame(overrides: Partial<WebSocketFrame> = {}): WebSocketFrame {
  return {
    type: 'sent',
    timestamp: 1_700_000_000_000,
    opcode: 1,
    data: 'ping',
    length: 4,
    ...overrides,
  };
}

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Unsigned JWT-shaped token for parser tests. */
export function makeJwt(payload: Record<string, unknown>, signature = 'sig'): string {
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.${signature}`;
}
