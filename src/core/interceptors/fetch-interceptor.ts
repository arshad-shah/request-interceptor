/**
 * Fetch API interceptor setup.
 * Wraps window.fetch to intercept requests based on configured routes.
 */

import {
  shouldIntercept,
  createMockResponse,
  buildForwardInit,
  modifyResponseHeaders,
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

export interface FetchInterceptorState {
  isActive: () => boolean;
  getRoutes: () => Record<string, any>;
}

/**
 * Set up fetch API interception. Returns a cleanup function.
 */
export function setupFetchInterceptor(
  state: FetchInterceptorState,
  log: LogFn,
  originalFetch: typeof window.fetch
): void {
  (window as any).fetch = function(resource: RequestInfo | URL, options: RequestInit = {}) {
    if (!state.isActive()) {
      return originalFetch.call(this, resource, options);
    }

    const url = resource instanceof Request ? resource.url : String(resource);
    const method = options.method || (resource instanceof Request ? resource.method : 'GET');
    const body = options.body || (resource instanceof Request ? resource.body : undefined);

    const interceptResult = shouldIntercept(method, url, state.getRoutes(), log, body);

    if (interceptResult) {
      const { routeKey, mode } = interceptResult;
      const interceptConfig = state.getRoutes()[routeKey];

      log(`✓ Intercepting fetch request: ${method} ${url} with route: ${routeKey} (mode: ${mode})`);

      if (mode === 'block') {
        return new Promise((_resolve, reject) => {
          setTimeout(() => {
            log(`Blocked fetch request: ${method} ${url}`);
            pageToast(`Blocked ${method}`, 'error', { detail: shortUrl(url) });
            reject(new TypeError('Request blocked by Request Interceptor'));
          }, interceptConfig.delay || 0);
        });
      }

      if (mode === 'redirect') {
        const redirectUrl = interceptConfig.redirectUrl || url;
        log(`Redirecting fetch request: ${url} → ${redirectUrl}`);
        pageToast(`Redirected ${method}`, 'warn', { detail: `${shortUrl(url)} → ${shortUrl(redirectUrl)}` });
        const finalUrl = applyQueryParamRules(redirectUrl, interceptConfig.queryParamRules || [], window.location.origin);
        const initPromise = buildForwardInit(resource, options, interceptConfig, log, { overrideBody: false });

        return new Promise<void>(resolve => {
          setTimeout(resolve, interceptConfig.delay || 0);
        }).then(async () => originalFetch.call(this, finalUrl, await initPromise));
      }

      if (mode === 'mock') {
        return new Promise(resolve => {
          setTimeout(() => {
            const response = createMockResponse(interceptConfig.response, interceptConfig, log);
            pageToast(`Mocked ${method}`, 'success', { detail: shortUrl(url) });
            resolve(response);
          }, interceptConfig.delay || 0);
        });
      }

      // mode === 'passthrough'
      let modifiedUrl = url;
      if (interceptConfig.queryParamRules && interceptConfig.queryParamRules.length > 0) {
        modifiedUrl = applyQueryParamRules(url, interceptConfig.queryParamRules, window.location.origin);
      }

      if (interceptConfig.requestBody && interceptConfig.requestBody.trim()) {
        log(`Overriding request body for: ${method} ${url}`);
      }

      const realRequestPromise = buildForwardInit(resource, options, interceptConfig, log, {
        overrideBody: true,
      }).then((init) => originalFetch.call(this, modifiedUrl, init));

      if (interceptConfig.responseHeaders && Object.keys(interceptConfig.responseHeaders).length > 0) {
        return realRequestPromise.then((response: Response) => {
          log(`✓ Modifying response headers for: ${method} ${url}`);
          pageToast(`Modified headers ${method}`, 'info', { detail: shortUrl(url) });
          return modifyResponseHeaders(response, interceptConfig, log);
        });
      }

      return realRequestPromise;
    }

    return originalFetch.call(this, resource, options);
  };
}
