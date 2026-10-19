/**
 * Code snippet generation for "copy as" actions.
 * Every value comes from a captured (untrusted) request, so each one is quoted
 * for its target language: POSIX single quotes for the shell, JSON string
 * literals for JavaScript.
 */

import type { NetworkRequest } from '../../../types/network';

/** Headers curl computes itself. */
const CURL_SKIPPED_HEADERS = ['host', 'content-length', 'connection', 'accept-encoding'];

/** Quote a value as a single POSIX shell word. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/** Build a cURL command that reproduces the request. */
export function generateCurlCommand(request: NetworkRequest): string {
  let curl = `curl ${shellQuote(request.url)}`;

  if (request.method !== 'GET') {
    // Plain method tokens stay unquoted; anything unusual is quoted.
    const method = /^[A-Za-z]+$/.test(request.method) ? request.method : shellQuote(request.method);
    curl += ` \\\n  -X ${method}`;
  }

  (request.requestHeaders || []).forEach((h) => {
    if (!CURL_SKIPPED_HEADERS.includes(h.name.toLowerCase())) {
      curl += ` \\\n  -H ${shellQuote(`${h.name}: ${h.value}`)}`;
    }
  });

  if (request.postData) {
    curl += ` \\\n  --data-raw ${shellQuote(request.postData)}`;
  }

  return curl;
}

/** Build a `fetch()` call that reproduces the request. */
export function generateFetchSnippet(request: NetworkRequest): string {
  return `fetch(${JSON.stringify(request.url)}, ${JSON.stringify({
    method: request.method,
    headers: request.requestHeaders?.reduce((acc, h) => ({ ...acc, [h.name]: h.value }), {}),
    body: request.postData || undefined,
  }, null, 2)})`;
}
