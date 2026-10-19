/** Pure HAR 1.2 generation from captured requests and their cached bodies. */
import type { HAR, HAREntry, NetworkRequest, ResponseBody } from '@/types/network';
import { parseQueryString } from './url';

/** HAR content with the optional `encoding` / `comment` fields the spec allows. */
export type HarContent = HAREntry['response']['content'] & { encoding?: 'base64'; comment?: string };

export type HarEntryOut = Omit<HAREntry, 'response'> & {
  response: Omit<HAREntry['response'], 'content'> & { content: HarContent };
};

export type HarOut = { log: Omit<HAR['log'], 'entries'> & { entries: HarEntryOut[] } };

export const TRUNCATED_BODY_COMMENT = 'Body truncated by Request Interceptor';

const STATUS_TEXTS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

export function statusText(code: number | undefined): string {
  if (!code) return '';
  return STATUS_TEXTS[code] || '';
}

/** `end - start` when both are set (non-zero), else HAR's "not applicable" -1. */
function span(start: number | undefined, end: number | undefined): number {
  return end && start ? end - start : -1;
}

export function harTimings(req: NetworkRequest): HAREntry['timings'] {
  const timing = req.timing || {};
  return {
    blocked: timing.dnsStart && timing.dnsStart > 0 ? timing.dnsStart : -1,
    dns: span(timing.dnsStart, timing.dnsEnd),
    connect: span(timing.connectStart, timing.connectEnd),
    ssl: span(timing.sslStart, timing.sslEnd),
    send: span(timing.sendStart, timing.sendEnd),
    wait: span(timing.sendEnd, timing.receiveHeadersEnd),
    receive: span(timing.receiveHeadersEnd, req.duration),
  };
}

export function toHarEntry(req: NetworkRequest, body: ResponseBody | undefined): HarEntryOut {
  const contentType = req.requestHeaders?.find((h) => h.name.toLowerCase() === 'content-type')?.value;
  return {
    startedDateTime: new Date(req.startTime).toISOString(),
    time: req.duration || 0,
    request: {
      method: req.method,
      url: req.url,
      httpVersion: req.protocol || 'HTTP/1.1',
      cookies: [],
      headers: req.requestHeaders || [],
      queryString: parseQueryString(req.query),
      headersSize: -1,
      bodySize: req.postData ? req.postData.length : 0,
      postData: req.postData ? { mimeType: contentType || '', text: req.postData } : undefined,
    },
    response: {
      status: req.statusCode || 0,
      statusText: req.statusLine || statusText(req.statusCode),
      httpVersion: req.protocol || 'HTTP/1.1',
      cookies: [],
      headers: req.responseHeaders || [],
      content: {
        size: req.size || 0,
        mimeType: req.mimeType || 'application/octet-stream',
        compression: (req.size || 0) - (req.encodedSize || 0),
        text: body?.body || '',
        ...(body?.base64Encoded ? { encoding: 'base64' as const } : {}),
        ...(body?.truncated ? { comment: TRUNCATED_BODY_COMMENT } : {}),
      },
      redirectURL: req.redirectedTo || '',
      headersSize: -1,
      bodySize: req.encodedSize || 0,
    },
    cache: {},
    timings: harTimings(req),
    serverIPAddress: req.ip || '',
    connection: '',
  };
}

/** Build a HAR log; `bodies` maps request id → its (possibly cached) response body. */
export function buildHar(
  requests: NetworkRequest[],
  bodies: ReadonlyMap<string, ResponseBody | undefined>
): HarOut {
  return {
    log: {
      version: '1.2',
      creator: { name: 'Request Interceptor', version: '1.0.0' },
      browser: { name: 'Chrome', version: '' },
      pages: [],
      entries: requests.map((req) => toHarEntry(req, bodies.get(req.requestId))),
    },
  };
}
