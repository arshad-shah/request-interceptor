/**
 * XMLHttpRequest interceptor setup.
 * Wraps XHR open/send/setRequestHeader to intercept requests.
 */

import {
  shouldIntercept,
  getStatusText,
  modifyRequestHeaders,
  type LogFn
} from './interceptor-helpers';
import { applyQueryParamRules } from '../query-params';

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
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
    (this as any)._interceptUrl = String(url);
    (this as any)._interceptMethod = method;
    (this as any)._interceptHeaders = new Map();
    (this as any)._originalHeaders = new Map();
    return originalXHROpen.apply(this, arguments as any);
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
    return originalXHRSetRequestHeader.apply(this, arguments as any);
  };

  // Override send to intercept
  XMLHttpRequest.prototype.send = function(data?: Document | BodyInit | null) {
    if (!state.isActive()) {
      return originalXHRSend.apply(this, arguments as any);
    }

    const method = (this as any)._interceptMethod;
    const url = (this as any)._interceptUrl;
    const interceptResult = shouldIntercept(method, url, state.getRoutes(), log, data);

    if (interceptResult) {
      const { routeKey, mode } = interceptResult;
      const interceptConfig = state.getRoutes()[routeKey];

      log(`✓ Intercepting XMLHttpRequest: ${method} ${url} with route: ${routeKey} (mode: ${mode})`);

      if (mode === 'block') {
        const xhr = this;
        setTimeout(() => {
          log(`Blocked XHR request: ${method} ${url}`);
          Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true });
          Object.defineProperty(xhr, 'status', { value: 0, configurable: true });
          Object.defineProperty(xhr, 'statusText', { value: '', configurable: true });
          Object.defineProperty(xhr, 'responseText', { value: '', configurable: true });
          Object.defineProperty(xhr, 'response', { value: '', configurable: true });

          if (xhr.onerror) xhr.onerror(new ProgressEvent('error'));
          if (xhr.onloadend) xhr.onloadend(new ProgressEvent('loadend'));
          if (xhr.dispatchEvent) {
            xhr.dispatchEvent(new Event('error'));
            xhr.dispatchEvent(new Event('loadend'));
          }
        }, interceptConfig.delay || 0);
        return;
      }

      if (mode === 'redirect') {
        const redirectUrl = interceptConfig.redirectUrl || url;
        log(`Redirecting XHR request: ${url} → ${redirectUrl}`);
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

        return originalXHRSend.apply(this, arguments as any);
      }

      if (mode === 'mock') {
        const xhr = this;
        setTimeout(() => {
          const responseBody = interceptConfig.response;
          let responseText: string;
          if (typeof responseBody === 'object') {
            try { responseText = JSON.stringify(responseBody); } catch { responseText = String(responseBody); }
          } else {
            responseText = String(responseBody);
          }

          Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true });
          Object.defineProperty(xhr, 'status', { value: interceptConfig.status || 200, configurable: true });
          Object.defineProperty(xhr, 'statusText', { value: getStatusText(interceptConfig.status || 200), configurable: true });
          Object.defineProperty(xhr, 'responseText', { value: responseText, configurable: true });
          Object.defineProperty(xhr, 'response', { value: responseText, configurable: true });

          const responseHeaders: Record<string, string> = {
            'Content-Type': interceptConfig.contentType || 'application/json',
            'X-Request-Intercepted': 'true'
          };
          if (interceptConfig.responseHeaders) {
            Object.assign(responseHeaders, interceptConfig.responseHeaders);
          }
          (xhr as any).responseHeaders = responseHeaders;

          xhr.getResponseHeader = function(name: string) {
            return (xhr as any).responseHeaders[name.toLowerCase()] || null;
          };
          xhr.getAllResponseHeaders = function() {
            return Object.entries((xhr as any).responseHeaders)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\r\n');
          };

          if (xhr.onreadystatechange) xhr.onreadystatechange(new Event('readystatechange'));
          if (xhr.onload) xhr.onload(new ProgressEvent('load'));
          if (xhr.dispatchEvent) {
            xhr.dispatchEvent(new Event('load'));
            xhr.dispatchEvent(new Event('loadend'));
          }
        }, interceptConfig.delay || 0);
        return;
      }

      // Passthrough
      const xhr = this;

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
        const originalOnReadyStateChange = xhr.onreadystatechange;
        const originalOnLoad = xhr.onload;

        xhr.onreadystatechange = function(event) {
          if (xhr.readyState === 4) {
            log(`✓ Modifying response headers for XHR: ${method} ${url}`);
            const originalGetResponseHeader = xhr.getResponseHeader;
            const originalGetAllResponseHeaders = xhr.getAllResponseHeaders;
            const enhancedHeaders = { ...(xhr as any).responseHeaders };
            Object.assign(enhancedHeaders, interceptConfig.responseHeaders);
            (xhr as any).responseHeaders = enhancedHeaders;

            xhr.getResponseHeader = function(name: string) {
              return enhancedHeaders[name.toLowerCase()] || originalGetResponseHeader.call(xhr, name);
            };
            xhr.getAllResponseHeaders = function() {
              const original = originalGetAllResponseHeaders.call(xhr);
              const additional = Object.entries(interceptConfig.responseHeaders)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\r\n');
              return original + (original ? '\r\n' : '') + additional;
            };
          }
          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.call(xhr, event);
          }
        };

        if (originalOnLoad) {
          xhr.onload = function(event) {
            originalOnLoad.call(xhr, event);
          };
        }
      }

      if (interceptConfig.requestBody && interceptConfig.requestBody.trim()) {
        log(`Overriding XHR request body for: ${method} ${url}`);
        return originalXHRSend.call(this, interceptConfig.requestBody);
      }

      return originalXHRSend.apply(this, arguments as any);
    }

    log(`→ Not intercepting XMLHttpRequest: ${method} ${url}`);
    return originalXHRSend.apply(this, arguments as any);
  };
}
