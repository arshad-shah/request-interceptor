import { describe, it, expect } from 'vitest';
import {
  BodyCache,
  appendFrame,
  bodyKey,
  hasFetchableBody,
  type BoundedFrame,
  shouldPrefetchBody,
  toRequestSummary,
} from '../network-buffers';

describe('bodyKey', () => {
  it('scopes request ids by tab so equal CDP ids in different tabs do not collide', () => {
    expect(bodyKey(1, '1000.1')).not.toBe(bodyKey(2, '1000.1'));
  });
});

describe('BodyCache', () => {
  it('stores and returns bodies', () => {
    const cache = new BodyCache({ maxTotalChars: 100, maxEntryChars: 50 });
    cache.set('a', { body: 'hello', base64Encoded: false });
    expect(cache.get('a')?.body).toBe('hello');
    expect(cache.totalChars).toBe(5);
  });

  it('truncates oversized bodies and marks them truncated', () => {
    const cache = new BodyCache({ maxTotalChars: 100, maxEntryChars: 4 });
    cache.set('a', { body: 'abcdefgh', base64Encoded: false });
    expect(cache.get('a')).toEqual({ body: 'abcd', base64Encoded: false, truncated: true });
  });

  it('drops oversized base64 bodies instead of truncating them into invalid data', () => {
    const cache = new BodyCache({ maxTotalChars: 100, maxEntryChars: 4 });
    cache.set('a', { body: 'QUJDREVGRw==', base64Encoded: true });
    expect(cache.get('a')).toEqual({ body: '', base64Encoded: true, truncated: true });
  });

  it('evicts least recently used entries to stay within the total budget', () => {
    const cache = new BodyCache({ maxTotalChars: 10, maxEntryChars: 10 });
    cache.set('a', { body: '1234', base64Encoded: false });
    cache.set('b', { body: '1234', base64Encoded: false });
    cache.get('a'); // a is now most recent
    cache.set('c', { body: '1234', base64Encoded: false });
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('c')).toBe(true);
    expect(cache.totalChars).toBe(8);
  });

  it('replacing an entry adjusts the running total', () => {
    const cache = new BodyCache({ maxTotalChars: 100, maxEntryChars: 100 });
    cache.set('a', { body: '1234567890', base64Encoded: false });
    cache.set('a', { body: '12', base64Encoded: false });
    expect(cache.totalChars).toBe(2);
  });

  it('deletes all entries for a tab', () => {
    const cache = new BodyCache({ maxTotalChars: 100, maxEntryChars: 100 });
    cache.set(bodyKey(1, 'x'), { body: 'a', base64Encoded: false });
    cache.set(bodyKey(1, 'y'), { body: 'b', base64Encoded: false });
    cache.set(bodyKey(12, 'x'), { body: 'c', base64Encoded: false });
    cache.deleteTab(1);
    expect(cache.has(bodyKey(1, 'x'))).toBe(false);
    expect(cache.has(bodyKey(1, 'y'))).toBe(false);
    expect(cache.has(bodyKey(12, 'x'))).toBe(true);
    expect(cache.totalChars).toBe(1);
  });
});

describe('appendFrame', () => {
  const frame = (data: string) => ({
    type: 'sent' as const,
    timestamp: 0,
    opcode: 1,
    data,
    length: data.length,
  });

  it('keeps only the newest frames', () => {
    const frames: BoundedFrame[] = [];
    for (let i = 0; i < 7; i++) appendFrame(frames, frame(String(i)), { maxFrames: 3, maxPayloadChars: 10 });
    expect(frames.map((f) => f.data)).toEqual(['4', '5', '6']);
  });

  it('truncates large payloads but keeps the original length', () => {
    const frames: BoundedFrame[] = [];
    appendFrame(frames, frame('abcdefgh'), { maxFrames: 3, maxPayloadChars: 3 });
    expect(frames[0]).toMatchObject({ data: 'abc', length: 8, truncated: true });
  });
});

describe('toRequestSummary', () => {
  it('omits response bodies and websocket frames from broadcast payloads', () => {
    const summary = toRequestSummary({
      requestId: '1',
      url: 'https://example.test',
      responseBody: { body: 'x'.repeat(1000), base64Encoded: false },
      wsFrames: [{ type: 'sent', timestamp: 0, opcode: 1, data: 'x', length: 1 }],
      wsFramesSent: 1,
    });
    expect(summary).toEqual({ requestId: '1', url: 'https://example.test', wsFramesSent: 1 });
  });
});

describe('shouldPrefetchBody', () => {
  it('prefetches small API and document text responses', () => {
    expect(shouldPrefetchBody({ type: 'xhr', mimeType: 'application/json', encodedSize: 100 }, 1000)).toBe(true);
    expect(shouldPrefetchBody({ type: 'document', mimeType: 'text/html', encodedSize: 100 }, 1000)).toBe(true);
  });

  it('skips static assets, binaries and large responses', () => {
    expect(shouldPrefetchBody({ type: 'image', mimeType: 'image/png', encodedSize: 10 }, 1000)).toBe(false);
    expect(shouldPrefetchBody({ type: 'script', mimeType: 'text/javascript', encodedSize: 10 }, 1000)).toBe(false);
    expect(shouldPrefetchBody({ type: 'xhr', mimeType: 'application/octet-stream', encodedSize: 10 }, 1000)).toBe(false);
    expect(shouldPrefetchBody({ type: 'xhr', mimeType: 'application/json', encodedSize: 5000 }, 1000)).toBe(false);
  });
});

describe('hasFetchableBody', () => {
  it('excludes images, fonts, media and sockets', () => {
    expect(hasFetchableBody({ type: 'xhr' })).toBe(true);
    expect(hasFetchableBody({ type: 'script' })).toBe(true);
    expect(hasFetchableBody({ type: 'image' })).toBe(false);
    expect(hasFetchableBody({ type: 'font' })).toBe(false);
    expect(hasFetchableBody({ type: 'websocket' })).toBe(false);
  });
});
