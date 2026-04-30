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

/**
 * Set up XHR interception.
 */
export function setupXHRInterceptor(
  state: XHRInterceptorState,
  log: LogFn,
  originalXHROpen: typeof XMLHttpRequest.prototype.open,
  originalXHRSend: typeof XMLHttpRequest.prototype.send,
  originalXHRSetRequestHeader: typeof XMLHttpRequest.prototype.setRequestHeader
): void {
  // Override open to capture URL and method
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
    (this as any)._interceptUrl = String(url);
    (this as any)._interceptMethod = method;
    (this as any)._interceptHeaders = new Map();
    (this as any)._originalHeaders = new Map();
    return originalXHROpen.apply(this, [method, url, ...rest] as any);
  };

  // Override setRequestHeader to track headers
  XMLHttpRequest.prototype.setRequestHeader = function(name: string, value: string) {
    if (!(this as any)._interceptHeaders) {
      (this as any)._interceptHeaders = new Map();
    }
    if (!(this as any)._originalHeaders) {
      (this as any)._originalHeaders = new Map();
    }
    (this as any)._originalHeaders.set(name.toLowerCase(), value);
    (this as any)._interceptHeaders.set(name.toLowerCase(), value);
    return originalXHRSetRequestHeader.call(this, name, value);
  };

  // Override send to intercept
  XMLHttpRequest.prototype.send = function(data?: XMLHttpRequestBodyInit | Document | null) {
    if (!state.isActive()) {
      return originalXHRSend.call(this, data);
    }

    const method = (this as any)._interceptMethod;
    const url = (this as any)._interceptUrl;
    const interceptResult = shouldIntercept(method, url, state.getRoutes(), log, data);

    if (interceptResult) {
      const { routeKey, mode } = interceptResult;
      const interceptConfig = state.getRoutes()[routeKey];

      log(`✓ Intercepting XMLHttpRequest: ${method} ${url} with route: ${routeKey} (mode: ${mode})`);

      if (mode === 'block') {
        setTimeout(() => {
          log(`Blocked XHR request: ${method} ${url}`);
          pageToast(`Blocked XHR ${method}`, 'error', { detail: shortUrl(url) });
          Object.defineProperty(this, 'readyState', { value: 4, configurable: true });
          Object.defineProperty(this, 'status', { value: 0, configurable: true });
          Object.defineProperty(this, 'statusText', { value: '', configurable: true });
          Object.defineProperty(this, 'responseText', { value: '', configurable: true });
          Object.defineProperty(this, 'response', { value: '', configurable: true });

          if (this.onerror) this.onerror(new ProgressEvent('error'));
          if (this.onloadend) this.onloadend(new ProgressEvent('loadend'));
          if (this.dispatchEvent) {
            this.dispatchEvent(new Event('error'));
            this.dispatchEvent(new Event('loadend'));
          }
        }, interceptConfig.delay || 0);
        return;
      }

      if (mode === 'redirect') {
        const redirectUrl = interceptConfig.redirectUrl || url;
        log(`Redirecting XHR request: ${url} → ${redirectUrl}`);
        pageToast(`Redirected XHR ${method}`, 'warn', { detail: `${shortUrl(url)} → ${shortUrl(redirectUrl)}` });
        const finalUrl = applyQueryParamRules(redirectUrl, interceptConfig.queryParamRules || [], window.location.origin);
        originalXHROpen.call(this, method, finalUrl, true);

        const currentHeaders = (this as any)._interceptHeaders || new Map();
        if (interceptConfig.requestHeaders || interceptConfig.removeRequestHeaders) {
          if (interceptConfig.removeRequestHeaders) {
            interceptConfig.removeRequestHeaders.forEach((headerName: string) => {
              currentHeaders.delete(headerName.toLowerCase());
            });
          }
          if (interceptConfig.requestHeaders) {
            Object.entries(interceptConfig.requestHeaders).forEach(([key, value]) => {
              currentHeaders.set(key.toLowerCase(), value as string);
            });
          }
        }
        currentHeaders.forEach((value: string, key: string) => {
          originalXHRSetRequestHeader.call(this, key, value);
        });

        return originalXHRSend.call(this, data);
      }

      if (mode === 'mock') {
        pageToast(`Mocked XHR ${method}`, 'success', { detail: shortUrl(url) });
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
            'X-Request-Intercepted': 'true'
          };
          if (interceptConfig.responseHeaders) {
            Object.assign(responseHeaders, interceptConfig.responseHeaders);
          }
          (this as any).responseHeaders = responseHeaders;

          this.getResponseHeader = (name: string) => {
            return (this as any).responseHeaders[name.toLowerCase()] || null;
          };
          this.getAllResponseHeaders = () => {
            return Object.entries((this as any).responseHeaders)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\r\n');
          };

          if (this.onreadystatechange) this.onreadystatechange(new Event('readystatechange'));
          if (this.onload) this.onload(new ProgressEvent('load'));
          if (this.dispatchEvent) {
            this.dispatchEvent(new Event('load'));
            this.dispatchEvent(new Event('loadend'));
          }
        }, interceptConfig.delay || 0);
        return;
      }

      // Passthrough
      if (interceptConfig.queryParamRules && interceptConfig.queryParamRules.length > 0) {
        const newUrl = applyQueryParamRules(url, interceptConfig.queryParamRules, window.location.origin);
        if (newUrl !== url) {
          originalXHROpen.call(this, method, newUrl, true);
          const existingHeaders = (this as any)._originalHeaders || new Map();
          existingHeaders.forEach((value: string, key: string) => {
            originalXHRSetRequestHeader.call(this, key, value);
          });
        }
      }

      if (interceptConfig.requestHeaders || interceptConfig.removeRequestHeaders) {
        const currentHeaders = (this as any)._interceptHeaders || new Map();
        if (interceptConfig.removeRequestHeaders) {
          interceptConfig.removeRequestHeaders.forEach((headerName: string) => {
            currentHeaders.delete(headerName.toLowerCase());
            log(`Removed request header: ${headerName}`);
          });
        }
        if (interceptConfig.requestHeaders) {
          Object.entries(interceptConfig.requestHeaders).forEach(([key, value]) => {
            currentHeaders.set(key.toLowerCase(), value as string);
            log(`Set request header: ${key} = ${value}`);
          });
        }
        currentHeaders.forEach((value: string, key: string) => {
          originalXHRSetRequestHeader.call(this, key, value);
        });
      }

      if (interceptConfig.responseHeaders && Object.keys(interceptConfig.responseHeaders).length > 0) {
        const originalOnReadyStateChange = this.onreadystatechange;
        const originalOnLoad = this.onload;

        this.onreadystatechange = (event) => {
          if (this.readyState === 4) {
            log(`✓ Modifying response headers for XHR: ${method} ${url}`);
            const originalGetResponseHeader = this.getResponseHeader;
            const originalGetAllResponseHeaders = this.getAllResponseHeaders;
            const enhancedHeaders = { ...(this as any).responseHeaders };
            Object.assign(enhancedHeaders, interceptConfig.responseHeaders);
            (this as any).responseHeaders = enhancedHeaders;

            this.getResponseHeader = (name: string) => {
              return enhancedHeaders[name.toLowerCase()] || originalGetResponseHeader.call(this, name);
            };
            this.getAllResponseHeaders = () => {
              const original = originalGetAllResponseHeaders.call(this);
              const additional = Object.entries(interceptConfig.responseHeaders)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\r\n');
              return original + (original ? '\r\n' : '') + additional;
            };
          }
          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.call(this, event);
          }
        };

        if (originalOnLoad) {
          this.onload = (event) => {
            originalOnLoad.call(this, event);
          };
        }
      }

      if (interceptConfig.requestBody && interceptConfig.requestBody.trim()) {
        log(`Overriding XHR request body for: ${method} ${url}`);
        return originalXHRSend.call(this, interceptConfig.requestBody);
      }

      return originalXHRSend.call(this, data);
    }

    log(`→ Not intercepting XMLHttpRequest: ${method} ${url}`);
    return originalXHRSend.call(this, data);
  };
}
