/**
 * XMLHttpRequest interceptor setup.
 * Wraps XHR open/send/setRequestHeader to intercept requests.
 */

import {
  shouldIntercept,
  getStatusText,
  type LogFn
} from './interceptor-helpers';
import { applyQueryParamRules } from '../query-params';
import { pageToast } from '../notifications/page-toast';

function shortUrl(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    const path = u.pathname + (u.search ? '?…' : '');
    return path.length > 60 ? path.slice(0, 57) + '…' : path;
  } catch {
    return url.length > 60 ? url.slice(0, 57) + '…' : url;
  }
}

export interface XHRInterceptorState {
  isActive: () => boolean;
  getRoutes: () => Record<string, any>;
}

type HeaderEntry = [name: string, value: string];

/** RFC 7230 token: what XMLHttpRequest accepts as a header name. */
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

interface TrackedXHR extends XMLHttpRequest {
  _interceptUrl?: string;
  _interceptMethod?: string;
  _interceptOpenRest?: any[];
  _interceptHeaders?: HeaderEntry[];
}

/** Apply a route's header removals/overrides to the headers the page set. */
function applyHeaderRules(headers: HeaderEntry[], config: any, log: LogFn): HeaderEntry[] {
  const remove = new Set<string>(
    (config.removeRequestHeaders || []).map((name: string) => name.toLowerCase())
  );
  const overrides = Object.entries((config.requestHeaders || {}) as Record<string, string>);
  for (const [name] of overrides) remove.add(name.toLowerCase());

  const result = headers.filter(([name]) => {
    const drop = remove.has(name.toLowerCase());
    if (drop && (config.removeRequestHeaders || []).some((h: string) => h.toLowerCase() === name.toLowerCase())) {
      log(`Removed request header: ${name}`);
    }
    return !drop;
  });
  for (const [name, value] of overrides) {
    log(`Set request header: ${name} = ${value}`);
    result.push([name, String(value)]);
  }
  return result;
}

/** Case-insensitive header lookup over a plain record. */
function lowerCaseKeys(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) result[name.toLowerCase()] = value;
  return result;
}

/**
 * Set up XHR interception.
 *
 * Page headers are buffered by setRequestHeader and sent once in send(), so a
 * route can replace or remove them (calling the native setRequestHeader twice
 * appends values instead of replacing them).
 */
export function setupXHRInterceptor(
  state: XHRInterceptorState,
  log: LogFn,
  originalXHROpen: typeof XMLHttpRequest.prototype.open,
  originalXHRSend: typeof XMLHttpRequest.prototype.send,
  originalXHRSetRequestHeader: typeof XMLHttpRequest.prototype.setRequestHeader
): void {
  XMLHttpRequest.prototype.open = function(this: TrackedXHR, method: string, url: string | URL, ...rest: any[]) {
    this._interceptUrl = String(url);
    this._interceptMethod = method;
    this._interceptOpenRest = rest;
    this._interceptHeaders = [];
    return originalXHROpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(this: TrackedXHR, name: string, value: string) {
    // Not opened through our wrapper (or already sent): defer to native behavior/errors
    if (!this._interceptHeaders) {
      return originalXHRSetRequestHeader.call(this, name, value);
    }
    // Match native validation so invalid headers still throw here, not in send()
    if (!HEADER_NAME.test(name) || /[\r\n\0]/.test(String(value))) {
      throw new DOMException(`'${name}' is not a valid HTTP header field name or value.`, 'SyntaxError');
    }
    this._interceptHeaders.push([name, String(value)]);
  };

  XMLHttpRequest.prototype.send = function(this: TrackedXHR, data?: XMLHttpRequestBodyInit | Document | null) {
    const pageHeaders = this._interceptHeaders || [];
    this._interceptHeaders = undefined;

    const flushHeaders = (headers: HeaderEntry[]) => {
      for (const [name, value] of headers) originalXHRSetRequestHeader.call(this, name, value);
    };
    const reopen = (newUrl: string) => {
      const rest = this._interceptOpenRest?.length ? this._interceptOpenRest : [true];
      originalXHROpen.apply(this, [this._interceptMethod, newUrl, ...rest] as any);
    };

    if (!state.isActive()) {
      flushHeaders(pageHeaders);
      return originalXHRSend.call(this, data);
    }

    const method = this._interceptMethod || 'GET';
    const url = this._interceptUrl || '';
    const interceptResult = shouldIntercept(method, url, state.getRoutes(), log, data);

    if (!interceptResult) {
      log(`→ Not intercepting XMLHttpRequest: ${method} ${url}`);
      flushHeaders(pageHeaders);
      return originalXHRSend.call(this, data);
    }

    const { routeKey, mode } = interceptResult;
    const interceptConfig = state.getRoutes()[routeKey];

    log(`✓ Intercepting XMLHttpRequest: ${method} ${url} with route: ${routeKey} (mode: ${mode})`);

    if (mode === 'block') {
      setTimeout(() => {
        log(`Blocked XHR request: ${method} ${url}`);
        pageToast(`Blocked XHR ${method}`, 'error', { detail: shortUrl(url), event: 'block' });
        Object.defineProperty(this, 'readyState', { value: 4, configurable: true });
        Object.defineProperty(this, 'status', { value: 0, configurable: true });
        Object.defineProperty(this, 'statusText', { value: '', configurable: true });
        Object.defineProperty(this, 'responseText', { value: '', configurable: true });
        Object.defineProperty(this, 'response', { value: '', configurable: true });

        // dispatchEvent also invokes the matching on* handler properties
        this.dispatchEvent(new Event('readystatechange'));
        this.dispatchEvent(new ProgressEvent('error'));
        this.dispatchEvent(new ProgressEvent('loadend'));
      }, interceptConfig.delay || 0);
      return;
    }

    if (mode === 'redirect') {
      const redirectUrl = interceptConfig.redirectUrl || url;
      log(`Redirecting XHR request: ${url} → ${redirectUrl}`);
      pageToast(`Redirected XHR ${method}`, 'warn', { detail: `${shortUrl(url)} → ${shortUrl(redirectUrl)}`, event: 'redirect' });
      reopen(applyQueryParamRules(redirectUrl, interceptConfig.queryParamRules || [], window.location.origin));
      flushHeaders(applyHeaderRules(pageHeaders, interceptConfig, log));
      return originalXHRSend.call(this, data);
    }

    if (mode === 'mock') {
      pageToast(`Mocked XHR ${method}`, 'success', { detail: shortUrl(url), event: 'mock' });
      setTimeout(() => {
        const responseBody = interceptConfig.response;
        let responseText: string;
        if (typeof responseBody === 'object') {
          try { responseText = JSON.stringify(responseBody); } catch { responseText = String(responseBody); }
        } else {
          responseText = String(responseBody);
        }

        Object.defineProperty(this, 'readyState', { value: 4, configurable: true });
        Object.defineProperty(this, 'status', { value: interceptConfig.status || 200, configurable: true });
        Object.defineProperty(this, 'statusText', { value: getStatusText(interceptConfig.status || 200), configurable: true });
        Object.defineProperty(this, 'responseText', { value: responseText, configurable: true });
        Object.defineProperty(this, 'response', { value: responseText, configurable: true });

        const responseHeaders: Record<string, string> = {
          'Content-Type': interceptConfig.contentType || 'application/json',
          'X-Request-Intercepted': 'true',
          ...(interceptConfig.responseHeaders || {}),
        };
        const lookup = lowerCaseKeys(responseHeaders);

        this.getResponseHeader = (name: string) => lookup[name.toLowerCase()] ?? null;
        this.getAllResponseHeaders = () =>
          Object.entries(responseHeaders)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\r\n');

        // dispatchEvent also invokes the matching on* handler properties
        this.dispatchEvent(new Event('readystatechange'));
        this.dispatchEvent(new ProgressEvent('load'));
        this.dispatchEvent(new ProgressEvent('loadend'));
      }, interceptConfig.delay || 0);
      return;
    }

    // Passthrough
    if (interceptConfig.queryParamRules && interceptConfig.queryParamRules.length > 0) {
      const newUrl = applyQueryParamRules(url, interceptConfig.queryParamRules, window.location.origin);
      if (newUrl !== url) reopen(newUrl);
    }

    flushHeaders(
      interceptConfig.requestHeaders || interceptConfig.removeRequestHeaders
        ? applyHeaderRules(pageHeaders, interceptConfig, log)
        : pageHeaders
    );

    if (interceptConfig.responseHeaders && Object.keys(interceptConfig.responseHeaders).length > 0) {
      const overrides = interceptConfig.responseHeaders as Record<string, string>;
      const lookup = lowerCaseKeys(overrides);
      const nativeGetResponseHeader = this.getResponseHeader;
      const nativeGetAllResponseHeaders = this.getAllResponseHeaders;

      // Patched up front so they're in place whenever the page reads headers
      this.getResponseHeader = (name: string) => {
        if (this.readyState >= 2 && name.toLowerCase() in lookup) return lookup[name.toLowerCase()];
        return nativeGetResponseHeader.call(this, name);
      };
      this.getAllResponseHeaders = () => {
        const original = nativeGetAllResponseHeaders.call(this);
        if (this.readyState < 2) return original;
        const kept = original
          .split('\r\n')
          .filter((line) => line && !(line.split(':')[0].trim().toLowerCase() in lookup));
        const added = Object.entries(overrides).map(([key, value]) => `${key}: ${value}`);
        return [...kept, ...added].join('\r\n');
      };
      log(`✓ Modifying response headers for XHR: ${method} ${url}`);
    }

    if (interceptConfig.requestBody && interceptConfig.requestBody.trim()) {
      log(`Overriding XHR request body for: ${method} ${url}`);
      return originalXHRSend.call(this, interceptConfig.requestBody);
    }

    return originalXHRSend.call(this, data);
  };
}
