/**
 * Code snippet generation for "copy as" actions.
 * cURL generation lives in `lib/network-api` (`generateCurl`).
 */

import type { NetworkRequest } from '../../../types/network';

/** Build a `fetch()` call that reproduces the request. */
export function generateFetchSnippet(request: NetworkRequest): string {
  return `fetch('${request.url}', ${JSON.stringify({
    method: request.method,
    headers: request.requestHeaders?.reduce((acc, h) => ({ ...acc, [h.name]: h.value }), {}),
    body: request.postData || undefined,
  }, null, 2)})`;
}
