/**
 * Fetch API interceptor setup.
 * Wraps window.fetch to intercept requests based on configured routes.
 */

import {
  shouldIntercept,
  createMockResponse,
  modifyRequestHeaders,
  modifyResponseHeaders,
  type LogFn
} from './interceptor-helpers';
import { applyQueryParamRules } from '../query-params';

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
            reject(new TypeError('Request blocked by Request Interceptor'));
          }, interceptConfig.delay || 0);
        });
      }

      if (mode === 'redirect') {
        const redirectUrl = interceptConfig.redirectUrl || url;
        log(`Redirecting fetch request: ${url} → ${redirectUrl}`);
        const modifiedOptions = { ...options };

        const finalUrl = applyQueryParamRules(redirectUrl, interceptConfig.queryParamRules || [], window.location.origin);

        if (interceptConfig.requestHeaders || interceptConfig.removeRequestHeaders) {
          const originalHeaders = new Headers(options.headers);
          modifiedOptions.headers = modifyRequestHeaders(originalHeaders, interceptConfig, log);
        }

        return new Promise(resolve => {
          setTimeout(() => {
            resolve(originalFetch.call(this, finalUrl, modifiedOptions));
          }, interceptConfig.delay || 0);
        }).then((r: any) => r);
      }

      if (mode === 'mock') {
        return new Promise(resolve => {
          setTimeout(() => {
            const response = createMockResponse(interceptConfig.response, interceptConfig, log);
            resolve(response);
          }, interceptConfig.delay || 0);
        });
      }

      // mode === 'passthrough'
      const modifiedOptions = { ...options };

      let modifiedUrl: string | RequestInfo | URL = resource;
      if (interceptConfig.queryParamRules && interceptConfig.queryParamRules.length > 0) {
        modifiedUrl = applyQueryParamRules(url, interceptConfig.queryParamRules, window.location.origin);
      }

      if (interceptConfig.requestHeaders || interceptConfig.removeRequestHeaders) {
        const originalHeaders = new Headers(options.headers);
        modifiedOptions.headers = modifyRequestHeaders(originalHeaders, interceptConfig, log);
      }

      if (interceptConfig.requestBody && interceptConfig.requestBody.trim()) {
        modifiedOptions.body = interceptConfig.requestBody;
        log(`Overriding request body for: ${method} ${url}`);
      }

      const realRequestPromise = originalFetch.call(this, modifiedUrl, modifiedOptions);

      if (interceptConfig.responseHeaders && Object.keys(interceptConfig.responseHeaders).length > 0) {
        return realRequestPromise.then((response: Response) => {
          log(`✓ Modifying response headers for: ${method} ${url}`);
          return modifyResponseHeaders(response, interceptConfig, log);
        });
      }

      return realRequestPromise;
    }

    return originalFetch.call(this, resource, options);
  };
}
