/**
 * URL matching logic used by interceptors, background, and content scripts.
 */

/**
 * Match a request URL against a pattern URL.
 * Supports: exact match, regex (/pattern/flags), wildcard (*), and normalized URL comparison.
 *
 * @param requestUrl - The actual request URL
 * @param patternUrl - The pattern to match against
 * @param baseOrigin - Base origin for resolving relative URLs (defaults to 'http://localhost')
 */
export function urlMatches(requestUrl: string, patternUrl: string, baseOrigin = 'http://localhost'): boolean {
  // Direct string match (fastest path)
  if (requestUrl === patternUrl) {
    return true;
  }

  // Regex pattern: /pattern/flags
  if (patternUrl.startsWith('/') && patternUrl.lastIndexOf('/') > 0) {
    try {
      const lastSlashIndex = patternUrl.lastIndexOf('/');
      const pattern = patternUrl.substring(1, lastSlashIndex);
      const flags = patternUrl.substring(lastSlashIndex + 1);
      const regex = new RegExp(pattern, flags);
      return regex.test(requestUrl);
    } catch {
      // Invalid regex, fall through to other matching
    }
  }

  // Normalize WebSocket protocols for comparison
  let normalizedRequest = requestUrl;
  let normalizedPattern = patternUrl;

  if (requestUrl.startsWith('ws://') || requestUrl.startsWith('wss://')) {
    normalizedRequest = requestUrl.replace(/^wss?:\/\//, 'http://');
  }
  if (patternUrl.startsWith('ws://') || patternUrl.startsWith('wss://')) {
    normalizedPattern = patternUrl.replace(/^wss?:\/\//, 'http://');
  }

  // Parse URLs
  let requestUrlObj: URL;
  let patternUrlObj: URL;

  try {
    requestUrlObj = new URL(normalizedRequest, baseOrigin);
    patternUrlObj = new URL(normalizedPattern, baseOrigin);
  } catch {
    return requestUrl === patternUrl;
  }

  // Normalize paths (remove trailing slashes)
  const normalizedRequestPath = requestUrlObj.pathname.replace(/\/+$/, '');
  const normalizedPatternPath = patternUrlObj.pathname.replace(/\/+$/, '');

  // Check host match (for full URLs)
  if (patternUrlObj.hostname !== 'localhost' && requestUrlObj.hostname !== patternUrlObj.hostname) {
    if (!patternUrlObj.hostname.includes('localhost')) {
      return false;
    }
  }

  // Direct path match
  if (normalizedRequestPath === normalizedPatternPath) {
    // If pattern has query params, they must all match
    if (patternUrlObj.search) {
      const patternParams = new URLSearchParams(patternUrlObj.search);
      const requestParams = new URLSearchParams(requestUrlObj.search);

      for (const [key, value] of patternParams) {
        if (requestParams.get(key) !== value) {
          return false;
        }
      }
    }
    return true;
  }

  // Wildcard matching
  if (patternUrl.includes('*')) {
    const regexPattern = patternUrl
      .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
      .replace(/\*/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(requestUrl) || regex.test(requestUrlObj.pathname);
  }

  return false;
}

/**
 * Match a page URL against a pattern for injection routes.
 * Supports: exact, regex, wildcard, and contains matching.
 */
export function pageUrlMatches(pageUrl: string, pattern: string): boolean {
  if (pageUrl === pattern) return true;

  // Regex pattern
  if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
    try {
      const lastSlash = pattern.lastIndexOf('/');
      const regex = new RegExp(pattern.substring(1, lastSlash), pattern.substring(lastSlash + 1));
      return regex.test(pageUrl);
    } catch {
      return false;
    }
  }

  // Wildcard matching
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`).test(pageUrl);
  }

  // Contains match
  return pageUrl.includes(pattern);
}
