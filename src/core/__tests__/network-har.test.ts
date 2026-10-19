import { describe, it, expect } from 'vitest';
import { TRUNCATED_BODY_COMMENT, buildHar, harTimings, statusText, toHarEntry } from '../network/har';
import { buildReplayRequest } from '../network/replay';
import { headersToArray, parseQueryString, parseRequestUrl, toResourceType } from '../network/url';
import type { NetworkRequest } from '@/types/network';

function req(overrides: Partial<NetworkRequest> = {}): NetworkRequest {
  return {
    requestId: 'r1',
    tabId: 1,
    url: 'https://api.test/search?q=a%20b&page=2',
    hostname: 'api.test',
    pathname: '/search',
    filename: 'search',
    query: '?q=a%20b&page=2',
    method: 'GET',
    type: 'xhr',
    requestHeaders: [{ name: 'Accept', value: '*/*' }],
    responseHeaders: [{ name: 'content-type', value: 'application/json' }],
    startTime: Date.UTC(2026, 0, 1),
    status: 'complete',
    ...overrides,
  };
}

describe('HAR generation', () => {
  it('builds a HAR 1.2 log with one entry per request', () => {
    const har = buildHar([req(), req({ requestId: 'r2' })], new Map());
    expect(har.log.version).toBe('1.2');
    expect(har.log.creator.name).toBe('Request Interceptor');
    expect(har.log.entries).toHaveLength(2);
  });

  it('maps request fields and parses the query string', () => {
    const entry = toHarEntry(req({ statusCode: 200, duration: 42, ip: '1.2.3.4' }), undefined);
    expect(entry.startedDateTime).toBe('2026-01-01T00:00:00.000Z');
    expect(entry.time).toBe(42);
    expect(entry.request.queryString).toEqual([
      { name: 'q', value: 'a b' },
      { name: 'page', value: '2' },
    ]);
    expect(entry.request.httpVersion).toBe('HTTP/1.1');
    expect(entry.response.statusText).toBe('OK');
    expect(entry.serverIPAddress).toBe('1.2.3.4');
    expect(entry.request.postData).toBeUndefined();
  });

  it('includes post data with its content type', () => {
    const entry = toHarEntry(
      req({ method: 'POST', postData: '{"a":1}', requestHeaders: [{ name: 'Content-Type', value: 'application/json' }] }),
      undefined
    );
    expect(entry.request.postData).toEqual({ mimeType: 'application/json', text: '{"a":1}' });
    expect(entry.request.bodySize).toBe(7);
  });

  it('embeds bodies with base64 and truncation markers', () => {
    const plain = toHarEntry(req({ size: 10, encodedSize: 4 }), { body: '{"ok":1}', base64Encoded: false });
    expect(plain.response.content).toEqual({
      size: 10,
      mimeType: 'application/octet-stream',
      compression: 6,
      text: '{"ok":1}',
    });

    const b64 = toHarEntry(req(), { body: 'AAEC', base64Encoded: true });
    expect(b64.response.content.encoding).toBe('base64');
    expect(b64.response.content.comment).toBeUndefined();

    const cut = toHarEntry(req(), { body: 'abc', base64Encoded: false, truncated: true });
    expect(cut.response.content.comment).toBe(TRUNCATED_BODY_COMMENT);
    expect(cut.response.content.encoding).toBeUndefined();
  });

  it('looks bodies up by request id', () => {
    const har = buildHar([req()], new Map([['r1', { body: 'hi', base64Encoded: false }]]));
    expect(har.log.entries[0].response.content.text).toBe('hi');
  });

  it('computes timings from CDP timing, -1 when unknown', () => {
    expect(
      harTimings(
        req({
          duration: 120,
          timing: { dnsStart: 2, dnsEnd: 5, connectStart: 5, connectEnd: 9, sslStart: 6, sslEnd: 8, sendStart: 10, sendEnd: 11, receiveHeadersEnd: 60 },
        })
      )
    ).toEqual({ blocked: 2, dns: 3, connect: 4, ssl: 2, send: 1, wait: 49, receive: 60 });

    expect(harTimings(req({ timing: undefined, duration: undefined }))).toEqual({
      blocked: -1, dns: -1, connect: -1, ssl: -1, send: -1, wait: -1, receive: -1,
    });
  });

  it('falls back to known status texts and redirect URLs', () => {
    expect(statusText(404)).toBe('Not Found');
    expect(statusText(299)).toBe('');
    expect(statusText(undefined)).toBe('');
    const entry = toHarEntry(req({ statusCode: 302, redirectedTo: 'https://api.test/next' }), undefined);
    expect(entry.response).toMatchObject({ statusText: 'Found', redirectURL: 'https://api.test/next' });
  });
});

describe('URL helpers', () => {
  it('parses request URLs into display fields', () => {
    expect(parseRequestUrl('https://a.test/x/y.js?v=1')).toEqual({ hostname: 'a.test', pathname: '/x/y.js', filename: 'y.js', query: '?v=1' });
    expect(parseRequestUrl('https://a.test/').filename).toBe('a.test');
    expect(parseRequestUrl('data:text/plain,hello').hostname).toBe('');
    const bad = parseRequestUrl('not a url');
    expect(bad).toEqual({ hostname: 'not a url', pathname: '', filename: 'not a url', query: '' });
  });

  it('parses query strings', () => {
    expect(parseQueryString('?')).toEqual([]);
    expect(parseQueryString(undefined)).toEqual([]);
    expect(parseQueryString('?a=1&a=2')).toEqual([{ name: 'a', value: '1' }, { name: 'a', value: '2' }]);
  });

  it('normalises headers and resource types', () => {
    expect(headersToArray({ a: 1 })).toEqual([{ name: 'a', value: '1' }]);
    expect(headersToArray(undefined)).toEqual([]);
    const arr = [{ name: 'x', value: 'y' }];
    expect(headersToArray(arr)).toBe(arr);
    expect(toResourceType('Fetch')).toBe('xhr');
    expect(toResourceType('Script')).toBe('script');
    expect(toResourceType('Preflight')).toBe('preflight');
    expect(toResourceType(undefined)).toBe('other');
  });
});

describe('buildReplayRequest', () => {
  it('drops browser-controlled headers and keeps the rest', () => {
    const { url, init } = buildReplayRequest(
      req({
        requestHeaders: [
          { name: 'Host', value: 'api.test' },
          { name: 'Content-Length', value: '7' },
          { name: 'Connection', value: 'keep-alive' },
          { name: 'Accept-Encoding', value: 'gzip' },
          { name: 'Authorization', value: 'Bearer t' },
        ],
      })
    );
    expect(url).toBe('https://api.test/search?q=a%20b&page=2');
    expect(init).toEqual({ method: 'GET', headers: { Authorization: 'Bearer t' }, mode: 'cors', credentials: 'include' });
  });

  it('sends a body only for body-carrying methods', () => {
    expect(buildReplayRequest(req({ method: 'POST', postData: 'x=1' })).init.body).toBe('x=1');
    expect(buildReplayRequest(req({ method: 'DELETE', postData: 'x=1' })).init.body).toBe('x=1');
    expect(buildReplayRequest(req({ method: 'GET', postData: 'x=1' })).init.body).toBeUndefined();
    expect(buildReplayRequest(req({ method: 'PUT' })).init.body).toBeUndefined();
  });
});
