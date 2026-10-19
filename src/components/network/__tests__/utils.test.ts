import { describe, it, expect } from 'vitest';
import {
  parseCookies,
  extractSecurityInfo,
  decodeJwt,
  findJwtTokens,
  getInitiatorInfo,
  analyzePerformance,
  getLanguageFromMime,
  detectBodyType,
  parseFormData,
  parseUrlEncoded,
  parseRequestBody,
  getBodyTypeLabel,
  generateCurlCommand,
  generateFetchSnippet,
} from '../utils';
import { formatSize, formatTime } from '../../../lib/network-api';
import type { NetworkRequest } from '../../../types/network';
import { makeRequest, makeJwt } from './fixtures';

const titles = (request: NetworkRequest) =>
  analyzePerformance(request, null).map(i => i.title);

describe('formatting helpers', () => {
  it('formats sizes and durations', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatTime(0.5)).toBe('<1 ms');
    expect(formatTime(250)).toBe('250 ms');
    expect(formatTime(1500)).toBe('1.50 s');
  });

  it('maps mime types to code languages', () => {
    expect(getLanguageFromMime('application/json; charset=utf-8')).toBe('json');
    expect(getLanguageFromMime('application/xml')).toBe('xml');
    expect(getLanguageFromMime('text/html')).toBe('html');
    expect(getLanguageFromMime('text/css')).toBe('css');
    expect(getLanguageFromMime('application/javascript')).toBe('javascript');
    expect(getLanguageFromMime('image/png')).toBe('text');
  });
});

describe('parseCookies', () => {
  it('parses request cookies and Set-Cookie attributes', () => {
    const { request, response } = parseCookies(
      [{ name: 'Cookie', value: 'session=abc; theme=dark; invalid' }],
      [
        {
          name: 'set-cookie',
          value: 'token=xyz; Domain=example.test; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax',
        },
        { name: 'Set-Cookie', value: 'prefs=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT' },
      ]
    );

    expect(request).toEqual([
      { name: 'session', value: 'abc', httpOnly: false, secure: false, size: 11 },
      { name: 'theme', value: 'dark', httpOnly: false, secure: false, size: 10 },
    ]);
    expect(response[0]).toMatchObject({
      name: 'token',
      value: 'xyz',
      domain: 'example.test',
      path: '/',
      maxAge: '3600',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    });
    expect(response[1]).toMatchObject({
      name: 'prefs',
      expires: 'Wed, 21 Oct 2026 07:28:00 GMT',
      httpOnly: false,
    });
  });

  it('returns empty lists when there are no cookie headers', () => {
    expect(parseCookies(undefined, undefined)).toEqual({ request: [], response: [] });
  });
});

describe('JWT handling', () => {
  it('decodes a well-formed token and rejects malformed ones', () => {
    const decoded = decodeJwt(makeJwt({ sub: 'user-1' }, 'signature'));
    expect(decoded).toEqual({
      header: { alg: 'HS256', typ: 'JWT' },
      payload: { sub: 'user-1' },
      signature: 'signature',
    });
    expect(decodeJwt('not-a-token')).toBeNull();
    expect(decodeJwt('a.b.c')).toBeNull();
  });

  it('finds tokens in headers, cookies, URL and body without duplicates', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    const future = Math.floor(Date.now() / 1000) + 3600;
    const bearer = makeJwt({ iss: 'issuer', sub: 'alice', exp: future, iat: past }, 'one');
    const expired = makeJwt({ exp: past }, 'two');
    const inBody = makeJwt({ scope: 'read' }, 'three');

    const tokens = findJwtTokens(
      makeRequest({
        url: `https://api.example.test/cb?token=${expired}`,
        requestHeaders: [
          { name: 'Authorization', value: `Bearer ${bearer}` },
          { name: 'Cookie', value: `auth=${bearer}` },
        ],
        postData: JSON.stringify({ token: inBody }),
      })
    );

    expect(tokens.map(t => t.location)).toEqual([
      'Authorization Header',
      'URL Parameter',
      'Request Body',
    ]);
    expect(tokens[0]).toMatchObject({ issuer: 'issuer', subject: 'alice', isExpired: false });
    expect(tokens[0].expiresAt?.getTime()).toBe(future * 1000);
    expect(tokens[1].isExpired).toBe(true);
    expect(tokens[2].expiresAt).toBeUndefined();
  });
});

describe('extractSecurityInfo', () => {
  it('flags plain HTTP as insecure', () => {
    expect(extractSecurityInfo(makeRequest({ url: 'http://plain.example.test/x' }))).toEqual({
      protocol: 'HTTP (Insecure)',
      isSecure: false,
      subjectName: 'plain.example.test',
    });
  });

  it('uses CDP security details when present and defaults otherwise', () => {
    const withDetails = {
      ...makeRequest(),
      securityDetails: { protocol: 'TLS 1.3', cipher: 'AES_128_GCM', subjectName: '*.example.test' },
    };
    expect(extractSecurityInfo(withDetails)).toMatchObject({
      protocol: 'TLS 1.3',
      cipher: 'AES_128_GCM',
      keyExchange: 'ECDHE',
      subjectName: '*.example.test',
      isSecure: true,
    });
    expect(extractSecurityInfo(makeRequest())).toMatchObject({
      protocol: 'TLS 1.2/1.3',
      subjectName: 'api.example.test',
    });
  });
});

describe('getInitiatorInfo', () => {
  it('handles a missing initiator', () => {
    expect(getInitiatorInfo(makeRequest())).toEqual({
      type: 'other',
      description: 'Unknown initiator',
    });
  });

  it('maps script initiators with a capped call stack', () => {
    const callFrames = Array.from({ length: 10 }, (_, i) => ({
      functionName: i === 0 ? '' : `fn${i}`,
      url: 'https://app.example.test/main.js',
      lineNumber: i,
      columnNumber: 2,
    }));
    const request = {
      ...makeRequest(),
      initiator: { type: 'script', stack: { callFrames } },
    } as unknown as NetworkRequest;

    const info = getInitiatorInfo(request);
    expect(info.type).toBe('script');
    expect(info.description).toBe('JavaScript execution');
    expect(info.stack).toHaveLength(8);
    expect(info.stack?.[0].functionName).toBe('(anonymous)');
  });

  it('describes parser and redirect initiators', () => {
    const parser = { ...makeRequest(), initiator: { type: 'parser', url: 'https://x.test/' } };
    const redirect = { ...makeRequest(), initiator: { type: 'redirect' } };
    expect(getInitiatorInfo(parser as unknown as NetworkRequest).description).toBe(
      'HTML parser (https://x.test/)'
    );
    expect(getInitiatorInfo(redirect as unknown as NetworkRequest).description).toBe(
      'Redirect from unknown'
    );
  });
});

describe('analyzePerformance', () => {
  it('reports response time buckets', () => {
    expect(titles(makeRequest({ duration: 4000 }))).toContain('Very Slow Response');
    expect(titles(makeRequest({ duration: 1500 }))).toContain('Slow Response');
    expect(titles(makeRequest({ duration: 50 }))).toContain('Fast Response');
  });

  it('flags insecure, permissive and incomplete responses', () => {
    const insights = analyzePerformance(
      makeRequest({
        url: 'http://api.example.test/data',
        duration: 500,
        responseHeaders: [{ name: 'Access-Control-Allow-Origin', value: '*' }],
      }),
      null
    );
    const byTitle = Object.fromEntries(insights.map(i => [i.title, i]));
    expect(byTitle['Insecure Connection']).toMatchObject({ type: 'error', category: 'security' });
    expect(byTitle['Permissive CORS']).toMatchObject({ type: 'warning' });
    expect(byTitle['Missing Content-Type']).toMatchObject({ category: 'best-practice' });
    // Ids are unique and sequential
    expect(insights.map(i => i.id)).toEqual(insights.map((_, i) => `insight-${i}`));
  });

  it('does not flag localhost as insecure', () => {
    expect(titles(makeRequest({ url: 'http://localhost:3000/api' }))).not.toContain(
      'Insecure Connection'
    );
  });

  it('reports caching and compression findings', () => {
    expect(titles(makeRequest({ fromCache: true }))).toContain('Served from Cache');
    expect(titles(makeRequest({ statusCode: 304 }))).toContain('Cache Validated (304)');
    expect(
      titles(makeRequest({ type: 'script', mimeType: 'text/javascript', responseHeaders: [] }))
    ).toEqual(expect.arrayContaining(['No Cache Headers', 'No Cache Validators']));
    expect(
      titles(
        makeRequest({
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Content-Encoding', value: 'br' },
          ],
        })
      )
    ).toContain('Brotli Compression');
    expect(titles(makeRequest({ size: 4096 }))).toContain('No Compression');
  });

  it('reports large payloads and slow connection phases', () => {
    const found = titles(
      makeRequest({
        encodedSize: 2 * 1024 * 1024,
        timing: { dnsStart: 0, dnsEnd: 150, sslStart: 200, sslEnd: 600 },
      })
    );
    expect(found).toEqual(
      expect.arrayContaining(['Large Payload', 'Slow DNS Lookup', 'SSL Handshake Overhead'])
    );
  });
});

describe('request body parsing', () => {
  it('detects body types from content type and content', () => {
    expect(detectBodyType('x', 'application/json')).toBe('json');
    expect(detectBodyType('x', 'multipart/form-data; boundary=abc')).toBe('form-data');
    expect(detectBodyType('x', 'application/x-www-form-urlencoded')).toBe('url-encoded');
    expect(detectBodyType('{"a":1}')).toBe('json');
    expect(detectBodyType('{not json')).toBe('text');
    expect(detectBodyType('--boundary\r\n')).toBe('form-data');
    expect(detectBodyType('a=1&b=2')).toBe('url-encoded');
    expect(detectBodyType('plain text')).toBe('text');
  });

  it('parses multipart form data fields and files', () => {
    const body = [
      '------WebKitFormBoundaryX',
      'Content-Disposition: form-data; name="title"',
      '',
      'Hello',
      '------WebKitFormBoundaryX',
      'Content-Disposition: form-data; name="upload"; filename="notes.txt"',
      'Content-Type: text/plain',
      '',
      'file contents',
      '------WebKitFormBoundaryX--',
    ].join('\r\n');

    expect(parseFormData(body)).toEqual([
      { name: 'title', value: 'Hello', filename: undefined, contentType: undefined, isFile: false },
      {
        name: 'upload',
        value: '[File: notes.txt]',
        filename: 'notes.txt',
        contentType: 'text/plain',
        isFile: true,
      },
    ]);
    expect(parseFormData('no boundary')).toEqual([]);
  });

  it('parses URL-encoded bodies', () => {
    expect(parseUrlEncoded('name=Jane+Doe&city=New%20York')).toEqual([
      { name: 'name', value: 'Jane Doe' },
      { name: 'city', value: 'New York' },
    ]);
  });

  it('builds a structured body with labels', () => {
    expect(parseRequestBody('')).toEqual({ type: 'text', parsed: null, raw: '' });
    expect(parseRequestBody('{"a":1}')).toEqual({ type: 'json', parsed: { a: 1 }, raw: '{"a":1}' });
    expect(parseRequestBody('{bad', 'application/json')).toMatchObject({
      type: 'json',
      parsed: null,
      error: 'Invalid JSON',
    });
    expect(parseRequestBody('a=1&b=2').parsed).toHaveLength(2);
    expect(parseRequestBody('hello')).toEqual({ type: 'text', parsed: 'hello', raw: 'hello' });

    expect(getBodyTypeLabel('json')).toBe('JSON');
    expect(getBodyTypeLabel('form-data')).toBe('Form Data');
    expect(getBodyTypeLabel('url-encoded')).toBe('URL Encoded');
    expect(getBodyTypeLabel('binary')).toBe('Binary');
    expect(getBodyTypeLabel('text')).toBe('Text');
  });
});

describe('copy-as snippets', () => {
  it('generates a cURL command, skipping automatic headers and escaping quotes', () => {
    const curl = generateCurlCommand(
      makeRequest({
        method: 'POST',
        url: 'https://api.example.test/items',
        requestHeaders: [
          { name: 'Host', value: 'api.example.test' },
          { name: 'Content-Type', value: 'application/json' },
        ],
        postData: `{"note":"it's"}`,
      })
    );

    expect(curl).toBe(
      [
        "curl 'https://api.example.test/items'",
        '  -X POST',
        "  -H 'Content-Type: application/json'",
        `  --data-raw '{"note":"it'\\''s"}'`,
      ].join(' \\\n')
    );
  });

  it('omits -X for GET requests', () => {
    expect(generateCurlCommand(makeRequest({ requestHeaders: [] }))).toBe(
      "curl 'https://api.example.test/v1/users?page=2&sort=name'"
    );
  });

  it('generates a fetch() snippet with headers and body', () => {
    const snippet = generateFetchSnippet(
      makeRequest({
        method: 'PUT',
        url: 'https://api.example.test/items/1',
        requestHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        postData: '{"done":true}',
      })
    );

    expect(snippet.startsWith('fetch("https://api.example.test/items/1", ')).toBe(true);
    const options = JSON.parse(snippet.slice(snippet.indexOf(', ') + 2, -1));
    expect(options).toEqual({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{"done":true}',
    });
  });

  it('leaves the body out of fetch() when there is none', () => {
    const snippet = generateFetchSnippet(makeRequest({ requestHeaders: [] }));
    expect(snippet).not.toContain('"body"');
  });
});
