/** Pure request building for "replay request" (the fetch itself happens in the worker). */
import type { NetworkRequest } from '@/types/network';

/** Headers the browser sets itself; forwarding them breaks or is refused by fetch. */
const SKIPPED_HEADERS = new Set(['host', 'content-length', 'connection', 'accept-encoding']);
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface ReplayFetch {
  url: string;
  init: RequestInit;
}

export function buildReplayRequest(
  request: Pick<NetworkRequest, 'url' | 'method' | 'requestHeaders' | 'postData'>
): ReplayFetch {
  const headers: Record<string, string> = {};
  for (const h of request.requestHeaders || []) {
    if (!SKIPPED_HEADERS.has(h.name.toLowerCase())) headers[h.name] = h.value;
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    mode: 'cors',
    credentials: 'include',
  };
  if (request.postData && BODY_METHODS.has(request.method)) {
    init.body = request.postData;
  }
  return { url: request.url, init };
}
